'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
  Typography,
  Alert,
  Upload,
  Image,
  Divider,
  Spin,
  Empty,
  Tabs,
  DatePicker,
  Badge,
  Tooltip,
  Progress,
  Checkbox,
  Steps,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  UploadOutlined,
  HistoryOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExperimentOutlined,
  InboxOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  CloseOutlined,
  FormOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  CopyOutlined,
  FileAddOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { ingredientsApi, suppliesApi, equipmentApi, uploadApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Ingredient, Supply, Equipment, EquipmentCondition } from '@/types';
import {
  useIngredientsQuery,
  useLowStockQuery,
  useIngredientHistoryQuery,
  useSuppliesQuery,
  useLowStockSuppliesQuery,
  useEquipmentQuery,
} from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

// ========== Constants ==========
const ingredientUnitOptions = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Mililiter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'piece', label: 'Cái/Quả' },
  { value: 'tbsp', label: 'Muỗng canh (tbsp)' },
  { value: 'tsp', label: 'Muỗng cà phê (tsp)' },
];

const supplyUnitOptions = [
  { value: 'piece', label: 'Cái' },
  { value: 'pack', label: 'Gói/Bịch' },
  { value: 'roll', label: 'Cuộn' },
  { value: 'sheet', label: 'Tờ' },
  { value: 'box', label: 'Hộp' },
  { value: 'bag', label: 'Túi' },
];

const supplyUnitLabels: Record<string, string> = {
  piece: 'Cái', pack: 'Gói', roll: 'Cuộn', sheet: 'Tờ', box: 'Hộp', bag: 'Túi',
};

const conditionOptions = [
  { value: 'good', label: 'Tốt' },
  { value: 'worn', label: 'Cũ / Mòn' },
  { value: 'broken', label: 'Hỏng' },
  { value: 'replaced', label: 'Đã thay' },
];

const conditionMap: Record<string, { label: string; color: string }> = {
  good: { label: 'Tốt', color: 'green' },
  worn: { label: 'Cũ / Mòn', color: 'orange' },
  broken: { label: 'Hỏng', color: 'red' },
  replaced: { label: 'Đã thay', color: 'default' },
};

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

// ========== Bulk Import Types ==========
type ImportCategory = 'ingredient' | 'supply' | 'equipment';

interface ImportRow {
  key: string;
  selected: boolean;
  name: string;
  quantity: number;
  unitPrice: number;
  category: ImportCategory;
  unit: string;
  autoNote?: string; // e.g. "Tự tính: 21,000 ÷ 50 cái = 420đ/cái"
  error?: string; // Error message after save attempt
  saved?: boolean; // true if saved successfully
}

// Auto-classify based on name keywords
const classifyByName = (name: string): { category: ImportCategory; unit: string } => {
  const n = name.toLowerCase();

  // Equipment keywords
  const equipmentKw = ['khuôn', 'khuon', 'nhiệt kế', 'nhiet ke', 'rây', 'ray', 'dĩa', 'dia', 'muỗng nhỏ inox', 'muỗng inox', 'muỗng lớn', 'dao', 'thớt', 'nồi', 'chảo', 'máy'];
  for (const kw of equipmentKw) {
    if (n.includes(kw)) return { category: 'equipment', unit: 'piece' };
  }

  // Supply keywords
  const supplyKw = ['hộp', 'hop', 'túi', 'tui', 'muỗng gỗ', 'muong go', 'giấy nướng', 'giay nuong', 'giấy bạc', 'cốc giấy', 'ống hút', 'bao bì', 'hũ đựng', 'hu dung', 'hũ'];
  for (const kw of supplyKw) {
    if (n.includes(kw)) return { category: 'supply', unit: 'piece' };
  }

  // Ingredient - detect unit from name
  if (n.match(/\d+\s*kg/) || n.includes('1kg')) return { category: 'ingredient', unit: 'kg' };
  if (n.match(/\d+\s*g/) && !n.includes('kg')) return { category: 'ingredient', unit: 'g' };
  if (n.match(/\d+\s*ml/)) return { category: 'ingredient', unit: 'ml' };
  if (n.match(/\d+\s*l/) && !n.includes('ml')) return { category: 'ingredient', unit: 'l' };

  // Default ingredient keywords
  const ingredientKw = ['bột', 'bot', 'đường', 'duong', 'socola', 'chocolate', 'gelatin', 'baking', 'soda', 'nở', 'vani', 'bơ', 'sữa', 'sua', 'kem', 'trứng', 'trung', 'cacao', 'dầu', 'muối', 'mật ong'];
  for (const kw of ingredientKw) {
    if (n.includes(kw)) return { category: 'ingredient', unit: 'g' };
  }

  return { category: 'ingredient', unit: 'g' };
};

const parseNumber = (val: string): number => {
  if (!val) return 0;
  const s = val.trim();
  // Vietnamese format: 25,000 or 1,500,000 (comma = thousand separator)
  // Detect: if comma is followed by exactly 3 digits → VN thousand separator
  if (/,\d{3}/.test(s)) {
    const cleaned = s.replace(/,/g, '').replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  // Dot as thousand separator: 25.000 or 1.500.000
  if (/\.\d{3}/.test(s)) {
    const cleaned = s.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  // Plain number
  const cleaned = s.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Extract quantity & unit embedded in product name
// e.g. "Muỗng gỗ 11cm - 50 cái" → { qty: 50, unit: 'piece' }
// e.g. "Baking soda - 100g" → { qty: 100, unit: 'g' }
// e.g. "BM baker's choice 8 - 1kg" → { qty: 1000, unit: 'g' (converted) }
const extractQtyFromName = (name: string): { qty: number; unit: string; label: string } | null => {
  const n = name.toLowerCase();

  // Match "X cái" pattern (e.g. "50 cái")
  const caiMatch = n.match(/(\d+)\s*cái/);
  if (caiMatch) return { qty: parseInt(caiMatch[1]), unit: 'piece', label: `${caiMatch[1]} cái` };

  // Match weight/volume at end or after dash: "- 100g", "500g", "- 200g"
  // kg → convert to g
  const kgMatch = n.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1].replace(',', '.'));
    return { qty: val * 1000, unit: 'g', label: `${kgMatch[1]}kg` };
  }

  // g (but not kg)
  const gMatch = n.match(/(\d+)\s*g(?!ỗ|i|ó|ạ|ấ|ướ|elatin)/);
  if (gMatch) return { qty: parseInt(gMatch[1]), unit: 'g', label: `${gMatch[1]}g` };

  // liter → convert to ml
  const lMatch = n.match(/(\d+(?:[.,]\d+)?)\s*l(?!a|á|ớ|ượ|ọ|ắ|ư|ụ|ần|ời|ịch)/i);
  if (lMatch && !n.match(/(\d+)\s*ml/)) {
    const val = parseFloat(lMatch[1].replace(',', '.'));
    return { qty: val * 1000, unit: 'ml', label: `${lMatch[1]}L` };
  }

  // ml
  const mlMatch = n.match(/(\d+)\s*ml/);
  if (mlMatch) return { qty: parseInt(mlMatch[1]), unit: 'ml', label: `${mlMatch[1]}ml` };

  return null;
};

const parsePastedData = (text: string): ImportRow[] => {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  const rows: ImportRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab (Excel paste) or multiple spaces
    const cells = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
    const cleaned = cells.map((c) => c.trim()).filter(Boolean);

    if (cleaned.length < 2) continue;

    // Try to detect: skip if first cell is header-like
    const firstLower = cleaned[0].toLowerCase();
    if (i === 0 && (firstLower.includes('tên') || firstLower.includes('stt') || firstLower === '#' || firstLower.includes('name'))) {
      continue; // Skip header row
    }

    // Detect format: [STT, Name, Qty, Price, Total] or [Name, Qty, Price, Total] or [Name, Qty, Price]
    let name = '';
    let quantity = 0;
    let unitPrice = 0;

    // Check if first cell is a number (STT)
    const firstIsNumber = /^\d+$/.test(cleaned[0]);

    if (firstIsNumber && cleaned.length >= 4) {
      // Format: STT | Name | Qty | Price | [Total]
      name = cleaned[1];
      quantity = parseNumber(cleaned[2]);
      unitPrice = parseNumber(cleaned[3]);
    } else if (firstIsNumber && cleaned.length === 3) {
      // Format: STT | Name | Price
      name = cleaned[1];
      quantity = 1;
      unitPrice = parseNumber(cleaned[2]);
    } else if (!firstIsNumber && cleaned.length >= 3) {
      // Format: Name | Qty | Price | [Total]
      name = cleaned[0];
      quantity = parseNumber(cleaned[1]);
      unitPrice = parseNumber(cleaned[2]);
    } else if (!firstIsNumber && cleaned.length === 2) {
      // Format: Name | Price
      name = cleaned[0];
      quantity = 1;
      unitPrice = parseNumber(cleaned[1]);
    } else {
      continue;
    }

    if (!name) continue;

    const { category, unit: classifiedUnit } = classifyByName(name);

    // Smart: extract qty from name to calculate per-unit price
    let finalQty = quantity;
    let finalUnitPrice = unitPrice;
    let finalUnit = classifiedUnit;
    let autoNote: string | undefined;

    // Only auto-calculate for non-equipment items (equipment keeps purchase price as-is)
    if (category !== 'equipment') {
      const extracted = extractQtyFromName(name);
      if (extracted && extracted.qty > 1) {
        // e.g. "Muỗng gỗ - 50 cái": qty=1, price=21000 → costPerUnit = 21000/50 = 420, stock = 1*50 = 50
        const originalPrice = unitPrice;
        finalUnitPrice = Math.round(unitPrice / extracted.qty);
        finalQty = quantity * extracted.qty;
        finalUnit = extracted.unit;
        autoNote = `Tự tính: ${originalPrice.toLocaleString()}đ ÷ ${extracted.label} = ${finalUnitPrice.toLocaleString()}đ/${extracted.unit}`;
      } else if (extracted && extracted.qty === 1) {
        // "1kg" → qty stays same but unit is set
        finalUnit = extracted.unit;
      }
    }

    rows.push({
      key: `import-${i}`,
      selected: true,
      name,
      quantity: finalQty,
      unitPrice: finalUnitPrice,
      category,
      unit: finalUnit,
      autoNote,
    });
  }

  return rows;
};

const categoryLabels: Record<ImportCategory, string> = {
  ingredient: 'Nguyên liệu',
  supply: 'Vật tư tiêu hao',
  equipment: 'Dụng cụ',
};

const categoryColors: Record<ImportCategory, string> = {
  ingredient: 'blue',
  supply: 'orange',
  equipment: 'green',
};

// ========== Tab Keys ==========
type TabKey = 'ingredients' | 'supplies' | 'equipment';

export default function IngredientsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('ingredients');
  const [showGuide, setShowGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ===== Search State =====
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setIngredientPagination((prev) => ({ ...prev, current: 1 }));
      setSupplyPagination((prev) => ({ ...prev, current: 1 }));
      setEquipmentPagination((prev) => ({ ...prev, current: 1 }));
    }, 400);
  }, []);

  // ===== Ingredients State =====
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [detailIngredient, setDetailIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm] = Form.useForm();
  const [ingredientPagination, setIngredientPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // ===== Supplies State =====
  const [supplyModalOpen, setSupplyModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [supplyForm] = Form.useForm();
  const [supplyPagination, setSupplyPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // ===== Equipment State =====
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentForm] = Form.useForm();
  const [equipmentPagination, setEquipmentPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // ===== Shared Image State =====
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageList, setImageList] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ===== Bulk Edit State =====
  // Stores edited values: { [id]: { currentStock?, minStock?, costPerUnit? } }
  const [bulkEditMode, setBulkEditMode] = useState<'off' | 'ingredients' | 'supplies'>('off');
  const [bulkEdits, setBulkEdits] = useState<Record<string, Record<string, number>>>({});
  const [bulkOriginals, setBulkOriginals] = useState<Record<string, Record<string, number>>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaveProgress, setBulkSaveProgress] = useState({ done: 0, total: 0 });

  const bulkChangedCount = Object.keys(bulkEdits).filter((id) => {
    const edits = bulkEdits[id];
    const originals = bulkOriginals[id];
    if (!edits || !originals) return false;
    return Object.keys(edits).some((key) => edits[key] !== originals[key]);
  }).length;

  const enterBulkEdit = (mode: 'ingredients' | 'supplies') => {
    const items = mode === 'ingredients' ? ingredients : supplies;
    const originals: Record<string, Record<string, number>> = {};
    const edits: Record<string, Record<string, number>> = {};
    items.forEach((item: any) => {
      const vals = {
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        costPerUnit: Number(item.costPerUnit),
      };
      originals[item.id] = { ...vals };
      edits[item.id] = { ...vals };
    });
    setBulkOriginals(originals);
    setBulkEdits(edits);
    setBulkEditMode(mode);
  };

  const cancelBulkEdit = () => {
    setBulkEditMode('off');
    setBulkEdits({});
    setBulkOriginals({});
    setBulkSaveProgress({ done: 0, total: 0 });
  };

  const updateBulkCell = (id: string, field: string, value: number | null) => {
    setBulkEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value ?? 0 },
    }));
  };

  const isRowChanged = (id: string) => {
    const edits = bulkEdits[id];
    const originals = bulkOriginals[id];
    if (!edits || !originals) return false;
    return Object.keys(edits).some((key) => edits[key] !== originals[key]);
  };

  const saveBulkEdits = async () => {
    const changedIds = Object.keys(bulkEdits).filter((id) => isRowChanged(id));
    if (changedIds.length === 0) {
      message.info('Không có thay đổi nào');
      return;
    }

    setBulkSaving(true);
    setBulkSaveProgress({ done: 0, total: changedIds.length });

    const apiUpdate = bulkEditMode === 'ingredients' ? ingredientsApi.update : suppliesApi.update;
    const errors: string[] = [];
    let done = 0;

    // Batch in groups of 5 for parallel execution
    for (let i = 0; i < changedIds.length; i += 5) {
      const batch = changedIds.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((id) => apiUpdate(id, bulkEdits[id]))
      );
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          const itemName = bulkEditMode === 'ingredients'
            ? ingredients.find((x) => x.id === batch[idx])?.name
            : supplies.find((x) => x.id === batch[idx])?.name;
          errors.push(itemName || batch[idx]);
        }
      });
      done += batch.length;
      setBulkSaveProgress({ done, total: changedIds.length });
    }

    setBulkSaving(false);

    if (errors.length > 0) {
      message.error(`Lỗi khi cập nhật: ${errors.join(', ')}. Vui lòng thử lại.`);
    } else {
      const label = bulkEditMode === 'ingredients' ? 'nguyên liệu' : 'vật tư';
      message.success(`Đã cập nhật ${changedIds.length} ${label} thành công!`);
      cancelBulkEdit();
    }

    // Refresh data
    if (bulkEditMode === 'ingredients') {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockSupplies'] });
    }
  };

  // ===== Bulk Import State =====
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<0 | 1>(0); // 0=paste, 1=preview
  const [importPasteText, setImportPasteText] = useState('');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [importSaveProgress, setImportSaveProgress] = useState({ done: 0, total: 0 });

  const importSelectedCount = importRows.filter((r) => r.selected).length;
  const importErrorCount = importRows.filter((r) => r.error).length;
  const importSavedCount = importRows.filter((r) => r.saved).length;
  const importPendingCount = importRows.filter((r) => r.selected && !r.saved && !r.error).length;
  const importByCategory = {
    ingredient: importRows.filter((r) => r.selected && r.category === 'ingredient').length,
    supply: importRows.filter((r) => r.selected && r.category === 'supply').length,
    equipment: importRows.filter((r) => r.selected && r.category === 'equipment').length,
  };
  const importTotalCost = importRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  const importTotalByCategory = {
    ingredient: importRows.filter((r) => r.selected && r.category === 'ingredient').reduce((s, r) => s + r.quantity * r.unitPrice, 0),
    supply: importRows.filter((r) => r.selected && r.category === 'supply').reduce((s, r) => s + r.quantity * r.unitPrice, 0),
    equipment: importRows.filter((r) => r.selected && r.category === 'equipment').reduce((s, r) => s + r.quantity * r.unitPrice, 0),
  };

  const handleImportParse = () => {
    if (!importPasteText.trim()) {
      message.warning('Vui lòng dán dữ liệu từ Excel vào');
      return;
    }
    const rows = parsePastedData(importPasteText);
    if (rows.length === 0) {
      message.error('Không nhận diện được dữ liệu. Vui lòng kiểm tra format.');
      return;
    }
    setImportRows(rows);
    setImportStep(1);
  };

  const handleImportBack = () => {
    setImportStep(0);
  };

  const handleImportToggleRow = (key: string) => {
    setImportRows((prev) => prev.map((r) => r.key === key ? { ...r, selected: !r.selected } : r));
  };

  const handleImportToggleAll = (checked: boolean) => {
    setImportRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleImportUpdateRow = (key: string, field: keyof ImportRow, value: any) => {
    setImportRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  };

  const handleImportSetCategoryBulk = (category: ImportCategory) => {
    setImportRows((prev) => prev.map((r) => r.selected ? { ...r, category } : r));
    message.success(`Đã đặt ${categoryLabels[category]} cho ${importSelectedCount} mục`);
  };

  // Parse error message from API response
  const getErrorMessage = (err: any): string => {
    if (err?.reason?.response?.data?.message) {
      const msg = err.reason.response.data.message;
      if (Array.isArray(msg)) return msg.join(', ');
      return String(msg);
    }
    if (err?.reason?.message) return String(err.reason.message);
    return 'Không xác định';
  };

  const handleImportSave = async () => {
    const selected = importRows.filter((r) => r.selected && !r.saved);
    if (selected.length === 0) {
      message.warning('Không có mục nào cần thêm');
      return;
    }

    // Clear previous errors before retry
    setImportRows((prev) => prev.map((r) => ({ ...r, error: undefined })));

    setImportSaving(true);
    setImportSaveProgress({ done: 0, total: selected.length });

    let errorCount = 0;
    let successCount = 0;
    let done = 0;

    for (let i = 0; i < selected.length; i += 5) {
      const batch = selected.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((row) => {
          if (row.category === 'ingredient') {
            return ingredientsApi.create({
              name: row.name,
              unit: row.unit,
              currentStock: row.quantity,
              minStock: 0,
              costPerUnit: row.unitPrice,
            });
          } else if (row.category === 'supply') {
            return suppliesApi.create({
              name: row.name,
              unit: row.unit,
              currentStock: row.quantity,
              minStock: 0,
              costPerUnit: row.unitPrice,
            });
          } else {
            return equipmentApi.create({
              name: row.name,
              quantity: row.quantity,
              condition: 'good',
              purchasePrice: row.unitPrice,
            });
          }
        })
      );

      // Update each row with success/error status
      const updates: Record<string, { error?: string; saved?: boolean }> = {};
      results.forEach((result, idx) => {
        const row = batch[idx];
        if (result.status === 'rejected') {
          errorCount++;
          updates[row.key] = { error: getErrorMessage(result) };
        } else {
          successCount++;
          updates[row.key] = { saved: true, error: undefined };
        }
      });

      setImportRows((prev) => prev.map((r) => updates[r.key] ? { ...r, ...updates[r.key] } : r));
      done += batch.length;
      setImportSaveProgress({ done, total: selected.length });
    }

    setImportSaving(false);

    if (errorCount > 0 && successCount > 0) {
      message.warning(`Thêm ${successCount} mục thành công, ${errorCount} mục bị lỗi. Vui lòng kiểm tra và thử lại.`);
    } else if (errorCount > 0) {
      message.error(`${errorCount} mục bị lỗi. Vui lòng kiểm tra chi tiết bên dưới và thử lại.`);
    } else {
      message.success(`Thêm thành công ${successCount} mục!`);
      setImportModalOpen(false);
      setImportStep(0);
      setImportPasteText('');
      setImportRows([]);
    }

    // Refresh all data
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
    queryClient.invalidateQueries({ queryKey: ['lowStockSupplies'] });
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportStep(0);
    setImportPasteText('');
    setImportRows([]);
    setImportSaveProgress({ done: 0, total: 0 });
  };

  // Unit options for import preview
  const allUnitOptions = [
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' },
    { value: 'l', label: 'l' },
    { value: 'piece', label: 'Cái' },
    { value: 'tbsp', label: 'tbsp' },
    { value: 'tsp', label: 'tsp' },
    { value: 'pack', label: 'Gói' },
    { value: 'roll', label: 'Cuộn' },
    { value: 'sheet', label: 'Tờ' },
    { value: 'box', label: 'Hộp' },
    { value: 'bag', label: 'Túi' },
  ];

  // ===== Ingredient History =====
  const [historyPagination, setHistoryPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // ===== Queries =====
  const ingredientsQuery = useIngredientsQuery({ page: ingredientPagination.current, limit: ingredientPagination.pageSize, search: debouncedSearch || undefined });
  const ingredients: Ingredient[] = ingredientsQuery.data?.list || [];
  const ingredientLoading = ingredientsQuery.isLoading;
  const { data: lowStockIngredients = [] } = useLowStockQuery();

  const suppliesQuery = useSuppliesQuery({ page: supplyPagination.current, limit: supplyPagination.pageSize, search: debouncedSearch || undefined });
  const supplies: Supply[] = suppliesQuery.data?.list || [];
  const supplyLoading = suppliesQuery.isLoading;
  const { data: lowStockSupplies = [] } = useLowStockSuppliesQuery();

  const equipmentQuery = useEquipmentQuery({ page: equipmentPagination.current, limit: equipmentPagination.pageSize, search: debouncedSearch || undefined });
  const equipmentList: Equipment[] = equipmentQuery.data?.list || [];
  const equipmentLoading = equipmentQuery.isLoading;

  const historyQuery = useIngredientHistoryQuery(detailIngredient?.id, historyPagination.current, historyPagination.pageSize);
  const historyData = historyQuery.data?.list || [];
  const historyLoading = historyQuery.isLoading;

  // ===== Effects =====
  useEffect(() => {
    if (ingredientsQuery.data?.pagination?.total != null) {
      setIngredientPagination((prev) => ({ ...prev, total: ingredientsQuery.data?.pagination?.total || 0 }));
    }
  }, [ingredientsQuery.data?.pagination?.total]);

  useEffect(() => {
    if (suppliesQuery.data?.pagination?.total != null) {
      setSupplyPagination((prev) => ({ ...prev, total: suppliesQuery.data?.pagination?.total || 0 }));
    }
  }, [suppliesQuery.data?.pagination?.total]);

  useEffect(() => {
    if (equipmentQuery.data?.pagination?.total != null) {
      setEquipmentPagination((prev) => ({ ...prev, total: equipmentQuery.data?.pagination?.total || 0 }));
    }
  }, [equipmentQuery.data?.pagination?.total]);

  useEffect(() => {
    if (historyQuery.data?.pagination?.total != null) {
      setHistoryPagination((prev) => ({ ...prev, total: historyQuery.data?.pagination?.total || 0 }));
    }
  }, [historyQuery.data?.pagination?.total]);

  useEffect(() => {
    if (detailIngredient?.id) {
      setHistoryPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [detailIngredient?.id]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ===== Shared Image Handlers =====
  const handleUpload = async (file: File, form: any) => {
    if (imageList.length >= 3) {
      message.warning('Tối đa 3 ảnh');
      return false;
    }
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data.url;
      const newList = [...imageList, url];
      setImageList(newList);
      if (!imageUrl) {
        setImageUrl(url);
        form.setFieldsValue({ imageUrl: url });
      }
      form.setFieldsValue({ images: newList });
      message.success('Upload ảnh thành công');
    } catch {
      message.error('Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const removeImage = (url: string, form: any) => {
    const newList = imageList.filter((u) => u !== url);
    setImageList(newList);
    form.setFieldsValue({ images: newList });
    if (imageUrl === url) {
      const next = newList[0] || '';
      setImageUrl(next);
      form.setFieldsValue({ imageUrl: next });
    }
  };

  const setAsCover = (url: string, form: any) => {
    setImageUrl(url);
    form.setFieldsValue({ imageUrl: url });
    message.success('Đã đặt làm ảnh đại diện');
  };

  const resetImageState = () => {
    setImageUrl('');
    setImageList([]);
  };

  // ===== Image Upload UI Component =====
  const renderImageUpload = (form: any) => (
    <Form.Item label={`Hình ảnh (tối đa 3 ảnh — đã chọn ${imageList.length}/3)`}>
      <Upload
        accept="image/*"
        multiple
        showUploadList={false}
        beforeUpload={(file) => { handleUpload(file, form); return false; }}
        disabled={imageList.length >= 3}
      >
        <Button icon={<UploadOutlined />} loading={uploading} disabled={imageList.length >= 3}>
          {uploading ? 'Đang tải...' : imageList.length >= 3 ? 'Đã đủ 3 ảnh' : 'Chọn ảnh'}
        </Button>
      </Upload>
      {imageList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {imageList.map((url) => (
            <div key={url} style={{ position: 'relative', border: imageUrl === url ? '2px solid #8B6914' : '1px solid #eee', borderRadius: 8, padding: 2 }}>
              <Image src={getFullImageUrl(url)} alt="img" width={80} height={80} style={{ borderRadius: 6, objectFit: 'cover' }} />
              <div style={{ textAlign: 'center', marginTop: 2 }}>
                {imageUrl === url ? (
                  <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>Đại diện</Tag>
                ) : (
                  <Button type="link" size="small" style={{ fontSize: 10, padding: 0 }} onClick={() => setAsCover(url, form)}>Đặt đại diện</Button>
                )}
                <Button type="link" danger size="small" style={{ fontSize: 10, padding: 0, marginLeft: 4 }} onClick={() => removeImage(url, form)}>Xoá</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Form.Item name="imageUrl" hidden><Input /></Form.Item>
      <Form.Item name="images" hidden><Input /></Form.Item>
    </Form.Item>
  );

  // ===================================================================
  // ======================== TAB 1: NGUYÊN LIỆU =======================
  // ===================================================================

  const handleIngredientSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingIngredient) {
        await ingredientsApi.update(editingIngredient.id, values);
        message.success('Cập nhật nguyên liệu thành công');
      } else {
        await ingredientsApi.create(values);
        message.success('Thêm nguyên liệu thành công');
      }
      setIngredientModalOpen(false);
      ingredientForm.resetFields();
      setEditingIngredient(null);
      resetImageState();
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIngredientDelete = async (id: string) => {
    try {
      await ingredientsApi.delete(id);
      message.success('Xoá nguyên liệu thành công');
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const openEditIngredient = (record: Ingredient) => {
    setEditingIngredient(record);
    ingredientForm.setFieldsValue({
      ...record,
      currentStock: Number(record.currentStock),
      minStock: Number(record.minStock),
      costPerUnit: Number(record.costPerUnit),
    });
    setImageUrl(record.imageUrl || '');
    setImageList(record.images || []);
    setIngredientModalOpen(true);
  };

  const ingredientColumns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 60,
      render: (url: string, record: Ingredient) => (
        <div style={{ cursor: 'pointer' }} onClick={() => setDetailIngredient(record)}>
          {url ? (
            <img src={getFullImageUrl(url)} alt={record.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>N/A</div>
          )}
        </div>
      ),
    },
    {
      title: 'Tên nguyên liệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Ingredient) => (
        <span style={{ cursor: 'pointer', color: '#8B6914', fontWeight: 500 }} onClick={() => setDetailIngredient(record)}>{name}</span>
      ),
      sorter: (a: Ingredient, b: Ingredient) => a.name.localeCompare(b.name),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => <Tag>{unit}</Tag>,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock: number, record: Ingredient) => {
        const isLow = Number(stock) <= Number(record.minStock) && Number(record.minStock) > 0;
        return (
          <span style={{ color: isLow ? '#ff4d4f' : undefined, fontWeight: isLow ? 'bold' : undefined }}>
            {Number(stock).toLocaleString()} {record.unit}
            {isLow && <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
          </span>
        );
      },
      sorter: (a: Ingredient, b: Ingredient) => Number(a.currentStock) - Number(b.currentStock),
    },
    {
      title: 'Tồn tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (val: number, record: Ingredient) => `${Number(val).toLocaleString()} ${record.unit}`,
    },
    {
      title: 'Giá/đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: Ingredient) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditIngredient(record)} />
          <Popconfirm title="Xác nhận xoá nguyên liệu này?" onConfirm={() => handleIngredientDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===== Bulk Edit Columns: Ingredients =====
  const ingredientBulkColumns = [
    {
      title: 'Tên nguyên liệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Ingredient) => (
        <div>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag style={{ marginLeft: 6 }}>{record.unit}</Tag>
        </div>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 140,
      render: (_: any, record: Ingredient) => {
        const val = bulkEdits[record.id]?.currentStock ?? Number(record.currentStock);
        const orig = bulkOriginals[record.id]?.currentStock ?? Number(record.currentStock);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              style={{ width: 120, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'currentStock', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{orig.toLocaleString()} {record.unit}</div>}
          </div>
        );
      },
    },
    {
      title: 'Tồn tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 140,
      render: (_: any, record: Ingredient) => {
        const val = bulkEdits[record.id]?.minStock ?? Number(record.minStock);
        const orig = bulkOriginals[record.id]?.minStock ?? Number(record.minStock);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              style={{ width: 120, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'minStock', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{orig.toLocaleString()}</div>}
          </div>
        );
      },
    },
    {
      title: 'Giá/đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      width: 150,
      render: (_: any, record: Ingredient) => {
        const val = bulkEdits[record.id]?.costPerUnit ?? Number(record.costPerUnit);
        const orig = bulkOriginals[record.id]?.costPerUnit ?? Number(record.costPerUnit);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              step={100}
              style={{ width: 130, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'costPerUnit', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{formatCurrency(orig)}</div>}
          </div>
        );
      },
    },
  ];

  // ===== Bulk Edit Columns: Supplies =====
  const supplyBulkColumns = [
    {
      title: 'Tên vật tư',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Supply) => (
        <div>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag style={{ marginLeft: 6 }}>{supplyUnitLabels[record.unit] || record.unit}</Tag>
        </div>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 140,
      render: (_: any, record: Supply) => {
        const val = bulkEdits[record.id]?.currentStock ?? Number(record.currentStock);
        const orig = bulkOriginals[record.id]?.currentStock ?? Number(record.currentStock);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              style={{ width: 120, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'currentStock', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{orig.toLocaleString()} {supplyUnitLabels[record.unit] || record.unit}</div>}
          </div>
        );
      },
    },
    {
      title: 'Tồn tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 140,
      render: (_: any, record: Supply) => {
        const val = bulkEdits[record.id]?.minStock ?? Number(record.minStock);
        const orig = bulkOriginals[record.id]?.minStock ?? Number(record.minStock);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              style={{ width: 120, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'minStock', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{orig.toLocaleString()}</div>}
          </div>
        );
      },
    },
    {
      title: 'Giá/đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      width: 150,
      render: (_: any, record: Supply) => {
        const val = bulkEdits[record.id]?.costPerUnit ?? Number(record.costPerUnit);
        const orig = bulkOriginals[record.id]?.costPerUnit ?? Number(record.costPerUnit);
        const changed = val !== orig;
        return (
          <div>
            <InputNumber
              size="small"
              value={val}
              min={0}
              step={100}
              style={{ width: 130, borderColor: changed ? '#8B6914' : undefined }}
              onChange={(v) => updateBulkCell(record.id, 'costPerUnit', v)}
            />
            {changed && <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{formatCurrency(orig)}</div>}
          </div>
        );
      },
    },
  ];

  // ===== Bulk Edit Toolbar =====
  const renderBulkToolbar = () => {
    if (bulkEditMode === 'off') return null;
    const label = bulkEditMode === 'ingredients' ? 'nguyên liệu' : 'vật tư';
    const totalItems = bulkEditMode === 'ingredients' ? ingredients.length : supplies.length;
    return (
      <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FormOutlined style={{ color: '#8B6914', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: '#8B6914' }}>Chế độ cập nhật hàng loạt</span>
          <Tag color={bulkChangedCount > 0 ? 'orange' : 'default'} style={{ fontSize: 13 }}>
            Đã sửa: {bulkChangedCount}/{totalItems} {label}
          </Tag>
          {bulkSaving && (
            <span style={{ fontSize: 13, color: '#666' }}>
              <Spin size="small" style={{ marginRight: 6 }} />
              Đang lưu {bulkSaveProgress.done}/{bulkSaveProgress.total}...
            </span>
          )}
        </div>
        <Space>
          {bulkChangedCount > 0 ? (
            <Popconfirm title="Bạn có thay đổi chưa lưu. Chắc chắn huỷ?" onConfirm={cancelBulkEdit}>
              <Button icon={<CloseOutlined />} disabled={bulkSaving}>Huỷ</Button>
            </Popconfirm>
          ) : (
            <Button icon={<CloseOutlined />} onClick={cancelBulkEdit} disabled={bulkSaving}>Huỷ</Button>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={saveBulkEdits}
            loading={bulkSaving}
            disabled={bulkChangedCount === 0}
            style={{ backgroundColor: '#8B6914' }}
          >
            Lưu tất cả ({bulkChangedCount})
          </Button>
        </Space>
      </div>
    );
  };

  // ===== Bulk Edit Mobile Card: Ingredients =====
  const renderIngredientBulkMobileCard = (item: Ingredient) => {
    const changed = isRowChanged(item.id);
    const vals = bulkEdits[item.id] || {};
    const origs = bulkOriginals[item.id] || {};
    return (
      <div key={item.id} style={{ background: changed ? '#fffbe6' : '#fff', border: `1px solid ${changed ? '#ffe58f' : '#f0f0f0'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <strong style={{ color: '#8B6914', fontSize: 14 }}>{item.name}</strong>
          <Tag>{item.unit}</Tag>
          {changed && <Tag color="orange" style={{ fontSize: 10 }}>Đã sửa</Tag>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Tồn kho</div>
            <InputNumber size="small" value={vals.currentStock} min={0} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'currentStock', v)} />
            {vals.currentStock !== origs.currentStock && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{origs.currentStock?.toLocaleString()}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Tồn min</div>
            <InputNumber size="small" value={vals.minStock} min={0} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'minStock', v)} />
            {vals.minStock !== origs.minStock && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{origs.minStock?.toLocaleString()}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Giá/ĐV</div>
            <InputNumber size="small" value={vals.costPerUnit} min={0} step={100} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'costPerUnit', v)} />
            {vals.costPerUnit !== origs.costPerUnit && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{formatCurrency(origs.costPerUnit)}</div>}
          </div>
        </div>
      </div>
    );
  };

  // ===== Bulk Edit Mobile Card: Supplies =====
  const renderSupplyBulkMobileCard = (item: Supply) => {
    const changed = isRowChanged(item.id);
    const vals = bulkEdits[item.id] || {};
    const origs = bulkOriginals[item.id] || {};
    const unitLabel = supplyUnitLabels[item.unit] || item.unit;
    return (
      <div key={item.id} style={{ background: changed ? '#fffbe6' : '#fff', border: `1px solid ${changed ? '#ffe58f' : '#f0f0f0'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <strong style={{ color: '#8B6914', fontSize: 14 }}>{item.name}</strong>
          <Tag>{unitLabel}</Tag>
          {changed && <Tag color="orange" style={{ fontSize: 10 }}>Đã sửa</Tag>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Tồn kho</div>
            <InputNumber size="small" value={vals.currentStock} min={0} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'currentStock', v)} />
            {vals.currentStock !== origs.currentStock && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{origs.currentStock?.toLocaleString()}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Tồn min</div>
            <InputNumber size="small" value={vals.minStock} min={0} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'minStock', v)} />
            {vals.minStock !== origs.minStock && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{origs.minStock?.toLocaleString()}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Giá/ĐV</div>
            <InputNumber size="small" value={vals.costPerUnit} min={0} step={100} style={{ width: '100%' }} onChange={(v) => updateBulkCell(item.id, 'costPerUnit', v)} />
            {vals.costPerUnit !== origs.costPerUnit && <div style={{ fontSize: 10, color: '#999', textDecoration: 'line-through' }}>{formatCurrency(origs.costPerUnit)}</div>}
          </div>
        </div>
      </div>
    );
  };

  // ===================================================================
  // =================== TAB 2: VẬT TƯ TIÊU HAO =======================
  // ===================================================================

  const handleSupplySubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingSupply) {
        await suppliesApi.update(editingSupply.id, values);
        message.success('Cập nhật vật tư thành công');
      } else {
        await suppliesApi.create(values);
        message.success('Thêm vật tư thành công');
      }
      setSupplyModalOpen(false);
      supplyForm.resetFields();
      setEditingSupply(null);
      resetImageState();
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockSupplies'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupplyDelete = async (id: string) => {
    try {
      await suppliesApi.delete(id);
      message.success('Xoá vật tư thành công');
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockSupplies'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const openEditSupply = (record: Supply) => {
    setEditingSupply(record);
    supplyForm.setFieldsValue({
      ...record,
      currentStock: Number(record.currentStock),
      minStock: Number(record.minStock),
      costPerUnit: Number(record.costPerUnit),
    });
    setImageUrl(record.imageUrl || '');
    setImageList(record.images || []);
    setSupplyModalOpen(true);
  };

  const supplyColumns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 60,
      render: (url: string, record: Supply) => (
        url ? (
          <img src={getFullImageUrl(url)} alt={record.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>N/A</div>
        )
      ),
    },
    {
      title: 'Tên vật tư',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500, color: '#8B6914' }}>{name}</span>,
      sorter: (a: Supply, b: Supply) => a.name.localeCompare(b.name),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => <Tag>{supplyUnitLabels[unit] || unit}</Tag>,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock: number, record: Supply) => {
        const isLow = Number(stock) <= Number(record.minStock) && Number(record.minStock) > 0;
        return (
          <span style={{ color: isLow ? '#ff4d4f' : undefined, fontWeight: isLow ? 'bold' : undefined }}>
            {Number(stock).toLocaleString()} {supplyUnitLabels[record.unit] || record.unit}
            {isLow && <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
          </span>
        );
      },
      sorter: (a: Supply, b: Supply) => Number(a.currentStock) - Number(b.currentStock),
    },
    {
      title: 'Tồn tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (val: number, record: Supply) => `${Number(val).toLocaleString()} ${supplyUnitLabels[record.unit] || record.unit}`,
    },
    {
      title: 'Giá/đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: Supply) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSupply(record)} />
          <Popconfirm title="Xác nhận xoá vật tư này?" onConfirm={() => handleSupplyDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===================================================================
  // ======================= TAB 3: DỤNG CỤ ===========================
  // ===================================================================

  const handleEquipmentSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const data = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined,
      };
      if (editingEquipment) {
        await equipmentApi.update(editingEquipment.id, data);
        message.success('Cập nhật dụng cụ thành công');
      } else {
        await equipmentApi.create(data);
        message.success('Thêm dụng cụ thành công');
      }
      setEquipmentModalOpen(false);
      equipmentForm.resetFields();
      setEditingEquipment(null);
      resetImageState();
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEquipmentDelete = async (id: string) => {
    try {
      await equipmentApi.delete(id);
      message.success('Xoá dụng cụ thành công');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const openEditEquipment = (record: Equipment) => {
    setEditingEquipment(record);
    equipmentForm.setFieldsValue({
      ...record,
      purchasePrice: Number(record.purchasePrice),
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : undefined,
    });
    setImageUrl(record.imageUrl || '');
    setImageList(record.images || []);
    setEquipmentModalOpen(true);
  };

  const equipmentColumns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 60,
      render: (url: string, record: Equipment) => (
        url ? (
          <img src={getFullImageUrl(url)} alt={record.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>N/A</div>
        )
      ),
    },
    {
      title: 'Tên dụng cụ',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500, color: '#8B6914' }}>{name}</span>,
      sorter: (a: Equipment, b: Equipment) => a.name.localeCompare(b.name),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (qty: number) => <strong>{qty}</strong>,
      sorter: (a: Equipment, b: Equipment) => a.quantity - b.quantity,
    },
    {
      title: 'Tình trạng',
      dataIndex: 'condition',
      key: 'condition',
      width: 120,
      render: (cond: EquipmentCondition) => {
        const c = conditionMap[cond] || { label: cond, color: 'default' };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
      filters: conditionOptions.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value: any, record: Equipment) => record.condition === value,
    },
    {
      title: 'Giá mua',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (val: number) => val ? formatCurrency(val) : '—',
    },
    {
      title: 'Ngày mua',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: Equipment) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditEquipment(record)} />
          <Popconfirm title="Xác nhận xoá dụng cụ này?" onConfirm={() => handleEquipmentDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===================================================================
  // ========================= MOBILE CARDS ============================
  // ===================================================================

  const renderIngredientMobileCard = (item: Ingredient) => {
    const isLow = Number(item.currentStock) <= Number(item.minStock) && Number(item.minStock) > 0;
    return (
      <div key={item.id} onClick={() => setDetailIngredient(item)} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          {item.imageUrl ? (
            <img src={getFullImageUrl(item.imageUrl)} alt={item.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 10 }}>N/A</div>
          )}
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#8B6914', fontSize: 14 }}>{item.name}</strong>
            <Tag style={{ marginLeft: 6 }}>{item.unit}</Tag>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: isLow ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
              {Number(item.currentStock).toLocaleString()} {item.unit}
              {isLow && ' \u26a0'}
            </span>
            <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>/ {Number(item.minStock).toLocaleString()}</span>
          </div>
          <span style={{ fontSize: 13, color: '#666' }}>{formatCurrency(Number(item.costPerUnit))}/{item.unit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6, borderTop: '1px solid #f5f5f5', paddingTop: 6 }} onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditIngredient(item)} />
          <Popconfirm title="Xác nhận xoá?" onConfirm={() => handleIngredientDelete(item.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    );
  };

  const renderSupplyMobileCard = (item: Supply) => {
    const isLow = Number(item.currentStock) <= Number(item.minStock) && Number(item.minStock) > 0;
    const unitLabel = supplyUnitLabels[item.unit] || item.unit;
    return (
      <div key={item.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          {item.imageUrl ? (
            <img src={getFullImageUrl(item.imageUrl)} alt={item.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 10 }}>N/A</div>
          )}
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#8B6914', fontSize: 14 }}>{item.name}</strong>
            <Tag style={{ marginLeft: 6 }}>{unitLabel}</Tag>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: isLow ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
              {Number(item.currentStock).toLocaleString()} {unitLabel}
              {isLow && ' \u26a0'}
            </span>
            <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>/ {Number(item.minStock).toLocaleString()}</span>
          </div>
          <span style={{ fontSize: 13, color: '#666' }}>{formatCurrency(Number(item.costPerUnit))}/{unitLabel}</span>
        </div>
        {item.notes && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{item.notes}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6, borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSupply(item)} />
          <Popconfirm title="Xác nhận xoá?" onConfirm={() => handleSupplyDelete(item.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    );
  };

  const renderEquipmentMobileCard = (item: Equipment) => {
    const c = conditionMap[item.condition] || { label: item.condition, color: 'default' };
    return (
      <div key={item.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          {item.imageUrl ? (
            <img src={getFullImageUrl(item.imageUrl)} alt={item.name} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 10 }}>N/A</div>
          )}
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#8B6914', fontSize: 14 }}>{item.name}</strong>
            <Tag color={c.color} style={{ marginLeft: 6 }}>{c.label}</Tag>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span>Số lượng: <strong>{item.quantity}</strong></span>
          <span style={{ color: '#666' }}>{item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : '—'}</span>
        </div>
        {item.purchaseDate && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Ngày mua: {dayjs(item.purchaseDate).format('DD/MM/YYYY')}</div>}
        {item.notes && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{item.notes}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 6, borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditEquipment(item)} />
          <Popconfirm title="Xác nhận xoá?" onConfirm={() => handleEquipmentDelete(item.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    );
  };

  // ===================================================================
  // ===================== MOBILE PAGINATION ===========================
  // ===================================================================
  const renderMobilePagination = (pag: typeof ingredientPagination, setPag: typeof setIngredientPagination) => {
    if (pag.total <= pag.pageSize) return null;
    return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <Space>
          <Button size="small" disabled={pag.current <= 1} onClick={() => setPag((prev) => ({ ...prev, current: prev.current - 1 }))}>Trước</Button>
          <span style={{ fontSize: 13, color: '#666' }}>Trang {pag.current} / {Math.ceil(pag.total / pag.pageSize)}</span>
          <Button size="small" disabled={pag.current >= Math.ceil(pag.total / pag.pageSize)} onClick={() => setPag((prev) => ({ ...prev, current: prev.current + 1 }))}>Sau</Button>
        </Space>
      </div>
    );
  };

  // ===================================================================
  // ====================== ADD BUTTON PER TAB =========================
  // ===================================================================

  const getAddButton = () => {
    // If bulk edit mode is active, don't show add/bulk buttons
    if (bulkEditMode !== 'off') return null;

    const importBtn = (
      <Tooltip title="Nhập nhiều mục cùng lúc từ Excel">
        <Button size={isMobile ? 'small' : 'middle'} icon={<FileAddOutlined />} onClick={() => setImportModalOpen(true)}>
          {isMobile ? 'Nhập' : 'Nhập hàng loạt'}
        </Button>
      </Tooltip>
    );

    if (activeTab === 'ingredients') {
      return (
        <Space size={isMobile ? 4 : 8} wrap>
          {importBtn}
          {ingredients.length > 0 && (
            <Tooltip title="Sửa tồn kho, giá... nhiều nguyên liệu cùng lúc">
              <Button size={isMobile ? 'small' : 'middle'} icon={<FormOutlined />} onClick={() => enterBulkEdit('ingredients')}>
                {isMobile ? 'Sửa loạt' : 'Cập nhật hàng loạt'}
              </Button>
            </Tooltip>
          )}
          <Button size={isMobile ? 'small' : 'middle'} type="primary" icon={<PlusOutlined />} onClick={() => { setEditingIngredient(null); ingredientForm.resetFields(); resetImageState(); setIngredientModalOpen(true); }} style={{ backgroundColor: '#8B6914' }}>
            {isMobile ? 'Thêm' : 'Thêm nguyên liệu'}
          </Button>
        </Space>
      );
    }
    if (activeTab === 'supplies') {
      return (
        <Space size={isMobile ? 4 : 8} wrap>
          {importBtn}
          {supplies.length > 0 && (
            <Tooltip title="Sửa tồn kho, giá... nhiều vật tư cùng lúc">
              <Button size={isMobile ? 'small' : 'middle'} icon={<FormOutlined />} onClick={() => enterBulkEdit('supplies')}>
                {isMobile ? 'Sửa loạt' : 'Cập nhật hàng loạt'}
              </Button>
            </Tooltip>
          )}
          <Button size={isMobile ? 'small' : 'middle'} type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSupply(null); supplyForm.resetFields(); resetImageState(); setSupplyModalOpen(true); }} style={{ backgroundColor: '#8B6914' }}>
            {isMobile ? 'Thêm' : 'Thêm vật tư'}
          </Button>
        </Space>
      );
    }
    return (
      <Space size={isMobile ? 4 : 8} wrap>
        {importBtn}
        <Button size={isMobile ? 'small' : 'middle'} type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEquipment(null); equipmentForm.resetFields(); resetImageState(); setEquipmentModalOpen(true); }} style={{ backgroundColor: '#8B6914' }}>
          {isMobile ? 'Thêm' : 'Thêm dụng cụ'}
        </Button>
      </Space>
    );
  };

  // ===================================================================
  // ========================== LOW STOCK ALERTS =======================
  // ===================================================================

  const renderAlerts = () => {
    const alerts: React.ReactNode[] = [];
    if (lowStockIngredients.length > 0) {
      alerts.push(
        <Alert
          key="low-ingredients"
          message={`Cảnh báo: ${lowStockIngredients.length} nguyên liệu sắp hết`}
          description={lowStockIngredients.map((i) => `${i.name} (${Number(i.currentStock)} ${i.unit})`).join(', ')}
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
      );
    }
    if (lowStockSupplies.length > 0) {
      alerts.push(
        <Alert
          key="low-supplies"
          message={`Cảnh báo: ${lowStockSupplies.length} vật tư tiêu hao sắp hết`}
          description={lowStockSupplies.map((s) => `${s.name} (${Number(s.currentStock)} ${supplyUnitLabels[s.unit] || s.unit})`).join(', ')}
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
      );
    }
    return alerts;
  };

  // ===================================================================
  // ======================== TAB ITEMS ================================
  // ===================================================================

  const totalLowStock = lowStockIngredients.length + lowStockSupplies.length;

  const tabItems = [
    {
      key: 'ingredients',
      label: (
        <span>
          <ExperimentOutlined style={{ marginRight: 6 }} />
          Nguyên liệu
          {ingredientPagination.total > 0 && <Badge count={ingredientPagination.total} style={{ marginLeft: 8, backgroundColor: '#8B6914' }} overflowCount={999} />}
        </span>
      ),
      children: (
        <>
          {bulkEditMode === 'ingredients' && renderBulkToolbar()}
          {bulkEditMode === 'ingredients' ? (
            /* Bulk edit mode */
            isMobile ? (
              <Spin spinning={ingredientLoading}>
                {ingredients.length === 0 ? <Empty description="Chưa có nguyên liệu nào" /> : (
                  <>
                    {ingredients.map(renderIngredientBulkMobileCard)}
                    {renderMobilePagination(ingredientPagination, setIngredientPagination)}
                  </>
                )}
              </Spin>
            ) : (
              <Table
                columns={ingredientBulkColumns}
                dataSource={ingredients}
                rowKey="id"
                loading={ingredientLoading}
                scroll={{ x: 600 }}
                pagination={{
                  current: ingredientPagination.current,
                  pageSize: ingredientPagination.pageSize,
                  total: ingredientPagination.total,
                  onChange: (page) => setIngredientPagination((prev) => ({ ...prev, current: page })),
                }}
                rowClassName={(record) => isRowChanged(record.id) ? 'bulk-row-changed' : ''}
              />
            )
          ) : (
            /* Normal mode */
            isMobile ? (
              <Spin spinning={ingredientLoading}>
                {ingredients.length === 0 && !ingredientLoading ? (
                  <Empty description="Chưa có nguyên liệu nào" />
                ) : (
                  <>
                    {ingredients.map(renderIngredientMobileCard)}
                    {renderMobilePagination(ingredientPagination, setIngredientPagination)}
                  </>
                )}
              </Spin>
            ) : (
              <Table
                columns={ingredientColumns}
                dataSource={ingredients}
                rowKey="id"
                loading={ingredientLoading}
                scroll={{ x: 700 }}
                pagination={{
                  current: ingredientPagination.current,
                  pageSize: ingredientPagination.pageSize,
                  total: ingredientPagination.total,
                  onChange: (page) => setIngredientPagination((prev) => ({ ...prev, current: page })),
                }}
              />
            )
          )}
        </>
      ),
    },
    {
      key: 'supplies',
      label: (
        <span>
          <InboxOutlined style={{ marginRight: 6 }} />
          Vật tư tiêu hao
          {supplyPagination.total > 0 && <Badge count={supplyPagination.total} style={{ marginLeft: 8, backgroundColor: '#8B6914' }} overflowCount={999} />}
        </span>
      ),
      children: (
        <>
          {bulkEditMode === 'supplies' && renderBulkToolbar()}
          {bulkEditMode === 'supplies' ? (
            /* Bulk edit mode */
            isMobile ? (
              <Spin spinning={supplyLoading}>
                {supplies.length === 0 ? <Empty description="Chưa có vật tư nào" /> : (
                  <>
                    {supplies.map(renderSupplyBulkMobileCard)}
                    {renderMobilePagination(supplyPagination, setSupplyPagination)}
                  </>
                )}
              </Spin>
            ) : (
              <Table
                columns={supplyBulkColumns}
                dataSource={supplies}
                rowKey="id"
                loading={supplyLoading}
                scroll={{ x: 600 }}
                pagination={{
                  current: supplyPagination.current,
                  pageSize: supplyPagination.pageSize,
                  total: supplyPagination.total,
                  onChange: (page) => setSupplyPagination((prev) => ({ ...prev, current: page })),
                }}
                rowClassName={(record) => isRowChanged(record.id) ? 'bulk-row-changed' : ''}
              />
            )
          ) : (
            /* Normal mode */
            isMobile ? (
              <Spin spinning={supplyLoading}>
                {supplies.length === 0 && !supplyLoading ? (
                  <Empty description="Chưa có vật tư tiêu hao nào" />
                ) : (
                  <>
                    {supplies.map(renderSupplyMobileCard)}
                    {renderMobilePagination(supplyPagination, setSupplyPagination)}
                  </>
                )}
              </Spin>
            ) : (
              <Table
                columns={supplyColumns}
                dataSource={supplies}
                rowKey="id"
                loading={supplyLoading}
                scroll={{ x: 800 }}
                pagination={{
                  current: supplyPagination.current,
                  pageSize: supplyPagination.pageSize,
                  total: supplyPagination.total,
                  onChange: (page) => setSupplyPagination((prev) => ({ ...prev, current: page })),
                }}
              />
            )
          )}
        </>
      ),
    },
    {
      key: 'equipment',
      label: (
        <span>
          <ToolOutlined style={{ marginRight: 6 }} />
          Dụng cụ
          {equipmentPagination.total > 0 && <Badge count={equipmentPagination.total} style={{ marginLeft: 8, backgroundColor: '#8B6914' }} overflowCount={999} />}
        </span>
      ),
      children: (
        <>
          {isMobile ? (
            <Spin spinning={equipmentLoading}>
              {equipmentList.length === 0 && !equipmentLoading ? (
                <Empty description="Chưa có dụng cụ nào" />
              ) : (
                <>
                  {equipmentList.map(renderEquipmentMobileCard)}
                  {renderMobilePagination(equipmentPagination, setEquipmentPagination)}
                </>
              )}
            </Spin>
          ) : (
            <Table
              columns={equipmentColumns}
              dataSource={equipmentList}
              rowKey="id"
              loading={equipmentLoading}
              scroll={{ x: 900 }}
              pagination={{
                current: equipmentPagination.current,
                pageSize: equipmentPagination.pageSize,
                total: equipmentPagination.total,
                onChange: (page) => setEquipmentPagination((prev) => ({ ...prev, current: page })),
              }}
            />
          )}
        </>
      ),
    },
  ];

  // ===================================================================
  // ========================= DETAIL MODAL ============================
  // ===================================================================

  const reasonMap: Record<string, { label: string; color: string }> = {
    PURCHASE: { label: 'Mua hàng', color: 'blue' },
    ORDER: { label: 'Đơn hàng', color: 'orange' },
    ADJUSTMENT: { label: 'Điều chỉnh', color: 'purple' },
    WASTE: { label: 'Hao hụt', color: 'red' },
  };

  // ===================================================================
  // ========================== RENDER =================================
  // ===================================================================

  return (
    <div>
      {/* Bulk edit row highlight style */}
      <style>{`.bulk-row-changed td { background-color: #fffbe6 !important; }`}</style>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? 8 : 16, flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Nguyên liệu & Vật tư</Title>
          <Tooltip title="Hướng dẫn sử dụng">
            <Button type="text" size="small" icon={<QuestionCircleOutlined />} onClick={() => setShowGuide(true)} style={{ color: '#8B6914' }} />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {totalLowStock > 0 && (
            <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: isMobile ? 11 : 13, padding: '2px 8px', margin: 0 }}>
              {totalLowStock} sắp hết
            </Tag>
          )}
          {getAddButton()}
        </div>
      </div>

      {/* Alerts */}
      {renderAlerts()}

      {/* Search */}
      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Input
          placeholder="Tìm kiếm theo tên..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          allowClear
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ maxWidth: isMobile ? '100%' : 360 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            if (bulkEditMode !== 'off') {
              if (bulkChangedCount > 0) {
                message.warning('Vui lòng lưu hoặc huỷ chế độ cập nhật hàng loạt trước khi chuyển tab');
                return;
              }
              cancelBulkEdit();
            }
            setActiveTab(key as TabKey);
          }}
          items={tabItems}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>

      {/* ========== Modal: Thêm/Sửa Nguyên liệu ========== */}
      <Modal
        title={editingIngredient ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
        open={ingredientModalOpen}
        onCancel={() => { setIngredientModalOpen(false); setEditingIngredient(null); ingredientForm.resetFields(); resetImageState(); }}
        onOk={() => ingredientForm.submit()}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={550}
      >
        <Form form={ingredientForm} layout="vertical" onFinish={handleIngredientSubmit}>
          <Form.Item name="name" label="Tên nguyên liệu" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Bột mì số 8" />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}>
            <Select options={ingredientUnitOptions} placeholder="Chọn đơn vị" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="currentStock" label="Tồn kho hiện tại" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="minStock" label="Tồn kho tối thiểu" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
          <Form.Item name="costPerUnit" label="Giá mỗi đơn vị (VNĐ)" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} step={100} />
          </Form.Item>
          {renderImageUpload(ingredientForm)}
        </Form>
      </Modal>

      {/* ========== Modal: Thêm/Sửa Vật tư tiêu hao ========== */}
      <Modal
        title={editingSupply ? 'Sửa vật tư tiêu hao' : 'Thêm vật tư tiêu hao mới'}
        open={supplyModalOpen}
        onCancel={() => { setSupplyModalOpen(false); setEditingSupply(null); supplyForm.resetFields(); resetImageState(); }}
        onOk={() => supplyForm.submit()}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={550}
      >
        <Form form={supplyForm} layout="vertical" onFinish={handleSupplySubmit}>
          <Form.Item name="name" label="Tên vật tư" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Hộp bánh 18cm, Muỗng gỗ" />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}>
            <Select options={supplyUnitOptions} placeholder="Chọn đơn vị" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="currentStock" label="Tồn kho hiện tại" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="minStock" label="Tồn kho tối thiểu" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
          <Form.Item name="costPerUnit" label="Giá mỗi đơn vị (VNĐ)" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} step={100} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} placeholder="VD: Dùng kèm mỗi đơn hàng bánh" />
          </Form.Item>
          {renderImageUpload(supplyForm)}
        </Form>
      </Modal>

      {/* ========== Modal: Thêm/Sửa Dụng cụ ========== */}
      <Modal
        title={editingEquipment ? 'Sửa dụng cụ' : 'Thêm dụng cụ mới'}
        open={equipmentModalOpen}
        onCancel={() => { setEquipmentModalOpen(false); setEditingEquipment(null); equipmentForm.resetFields(); resetImageState(); }}
        onOk={() => equipmentForm.submit()}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={550}
      >
        <Form form={equipmentForm} layout="vertical" onFinish={handleEquipmentSubmit}>
          <Form.Item name="name" label="Tên dụng cụ" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Khuôn tròn đúc đế rời 18cm" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="quantity" label="Số lượng" initialValue={1}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="condition" label="Tình trạng" initialValue="good">
              <Select options={conditionOptions} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="purchasePrice" label="Giá mua (VNĐ)" initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} step={1000} />
            </Form.Item>
            <Form.Item name="purchaseDate" label="Ngày mua">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} placeholder="VD: Chống dính, mua tại shop ABC" />
          </Form.Item>
          {renderImageUpload(equipmentForm)}
        </Form>
      </Modal>

      {/* ========== Modal: Chi tiết nguyên liệu ========== */}
      <Modal
        title={detailIngredient?.name || 'Chi tiết nguyên liệu'}
        open={!!detailIngredient}
        onCancel={() => setDetailIngredient(null)}
        footer={null}
        width={700}
      >
        {detailIngredient && (() => {
          const allImages: string[] = [];
          if (detailIngredient.images && detailIngredient.images.length > 0) {
            allImages.push(...detailIngredient.images);
          } else if (detailIngredient.imageUrl) {
            allImages.push(detailIngredient.imageUrl);
          }
          const isLow = Number(detailIngredient.currentStock) <= Number(detailIngredient.minStock) && Number(detailIngredient.minStock) > 0;

          return (
            <div>
              {allImages.length > 0 ? (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Image.PreviewGroup>
                    {allImages.map((url, idx) => (
                      <Image key={idx} src={getFullImageUrl(url)} alt={`${detailIngredient.name} ${idx + 1}`} width={allImages.length === 1 ? 200 : 120} height={allImages.length === 1 ? 200 : 120} style={{ borderRadius: 8, objectFit: 'cover', margin: 4 }} />
                    ))}
                  </Image.PreviewGroup>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Bấm vào ảnh để xem phóng to</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, background: '#fafafa', borderRadius: 8, marginBottom: 16, color: '#ccc' }}>Chưa có ảnh nguyên liệu</div>
              )}

              <Divider style={{ margin: '8px 0 12px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px', fontSize: 14 }}>
                <div><span style={{ color: '#888' }}>Đơn vị:</span> <Tag>{detailIngredient.unit}</Tag></div>
                <div><span style={{ color: '#888' }}>Giá/đơn vị:</span> <strong>{formatCurrency(Number(detailIngredient.costPerUnit))}</strong></div>
                <div><span style={{ color: '#888' }}>Tồn kho:</span> <strong style={{ color: isLow ? '#ff4d4f' : '#52c41a' }}>{Number(detailIngredient.currentStock).toLocaleString()} {detailIngredient.unit}{isLow && <WarningOutlined style={{ marginLeft: 4 }} />}</strong></div>
                <div><span style={{ color: '#888' }}>Tối thiểu:</span> {Number(detailIngredient.minStock).toLocaleString()} {detailIngredient.unit}</div>
              </div>

              {isLow && (
                <Alert message="Nguyên liệu sắp hết, cần nhập thêm!" type="error" showIcon style={{ marginTop: 12 }} />
              )}

              <Divider style={{ margin: '16px 0 12px' }}>
                <Space size={6}><HistoryOutlined /><span style={{ fontSize: 14, fontWeight: 600 }}>Lịch sử nhập/xuất kho</span></Space>
              </Divider>

              <Spin spinning={historyLoading}>
                {historyData.length > 0 ? (
                  isMobile ? (
                    <>
                      {historyData.map((tx: any) => {
                        const isIn = tx.type === 'IN';
                        const r = reasonMap[tx.reason] || { label: tx.reason, color: 'default' };
                        return (
                          <div key={tx.id} style={{ background: isIn ? '#f6ffed' : '#fff2f0', border: `1px solid ${isIn ? '#b7eb8f' : '#ffccc7'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isIn ? <Tag color="green" style={{ margin: 0, fontSize: 11 }}><ArrowDownOutlined /> Nhập</Tag> : <Tag color="red" style={{ margin: 0, fontSize: 11 }}><ArrowUpOutlined /> Xuất</Tag>}
                                <strong style={{ color: isIn ? '#52c41a' : '#ff4d4f', fontSize: 14 }}>{isIn ? '+' : '-'}{Number(tx.quantity).toLocaleString()} {detailIngredient.unit}</strong>
                              </div>
                              <Tag color={r.color} style={{ margin: 0, fontSize: 11 }}>{r.label}</Tag>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
                              <span>{tx.notes || '—'}</span>
                              <span>{formatDateTime(tx.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {historyPagination.total > historyPagination.pageSize && (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                          <Space>
                            <Button size="small" disabled={historyPagination.current <= 1} onClick={() => setHistoryPagination((prev) => ({ ...prev, current: prev.current - 1 }))}>Trước</Button>
                            <span style={{ fontSize: 12, color: '#999' }}>{historyPagination.total} giao dịch</span>
                            <Button size="small" disabled={historyPagination.current >= Math.ceil(historyPagination.total / historyPagination.pageSize)} onClick={() => setHistoryPagination((prev) => ({ ...prev, current: prev.current + 1 }))}>Sau</Button>
                          </Space>
                        </div>
                      )}
                    </>
                  ) : (
                    <Table
                      dataSource={historyData}
                      rowKey="id"
                      size="small"
                      scroll={{ x: 500 }}
                      pagination={{
                        current: historyPagination.current,
                        pageSize: historyPagination.pageSize,
                        total: historyPagination.total,
                        size: 'small',
                        showTotal: (total) => `${total} giao dịch`,
                        onChange: (page) => setHistoryPagination((prev) => ({ ...prev, current: page })),
                      }}
                      columns={[
                        { title: 'Loại', dataIndex: 'type', key: 'type', width: 70, render: (type: string) => type === 'IN' ? <Tag color="green"><ArrowDownOutlined /> Nhập</Tag> : <Tag color="red"><ArrowUpOutlined /> Xuất</Tag> },
                        { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100, render: (qty: number, record: any) => <span style={{ fontWeight: 500, color: record.type === 'IN' ? '#52c41a' : '#ff4d4f' }}>{record.type === 'IN' ? '+' : '-'}{Number(qty).toLocaleString()} {detailIngredient.unit}</span> },
                        { title: 'Lý do', dataIndex: 'reason', key: 'reason', width: 100, render: (reason: string) => { const r = reasonMap[reason] || { label: reason, color: 'default' }; return <Tag color={r.color}>{r.label}</Tag>; } },
                        { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (notes: string) => notes || '—' },
                        { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (d: string) => formatDateTime(d) },
                      ]}
                    />
                  )
                ) : (
                  !historyLoading && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử giao dịch" style={{ padding: '16px 0' }} />
                )}
              </Spin>
            </div>
          );
        })()}
      </Modal>

      {/* ========== Modal: Hướng dẫn sử dụng ========== */}
      <Modal
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#8B6914' }} />
            Hướng dẫn sử dụng - Quản lý Nguyên liệu & Vật tư
          </span>
        }
        open={showGuide}
        onCancel={() => setShowGuide(false)}
        footer={<Button type="primary" onClick={() => setShowGuide(false)} style={{ backgroundColor: '#8B6914' }}>Đã hiểu</Button>}
        width={700}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <Title level={5} style={{ color: '#8B6914', marginTop: 0 }}>
            <ExperimentOutlined /> Tab Nguyên liệu
          </Title>
          <Paragraph>
            Quản lý các nguyên liệu dùng để làm bánh như bột mì, đường, bơ, trứng...
            Nguyên liệu <strong>có thể xuất định lượng theo đơn hàng</strong> khi gắn với công thức sản phẩm.
          </Paragraph>
          <ul>
            <li><strong>Thêm mới:</strong> Bấm nút <Tag color="gold">Thêm nguyên liệu</Tag> ở góc phải trên cùng.</li>
            <li><strong>Tồn kho tối thiểu:</strong> Khi tồn kho xuống dưới mức này, hệ thống sẽ hiện cảnh báo màu đỏ.</li>
            <li><strong>Giá/đơn vị:</strong> Nhập giá mua gần nhất để tính giá vốn sản phẩm.</li>
            <li><strong>Xem chi tiết:</strong> Bấm vào tên nguyên liệu để xem lịch sử nhập/xuất kho.</li>
            <li><strong>Đơn vị tính:</strong> Chọn đúng đơn vị (g, kg, ml, l, cái...) để hệ thống tính định lượng chính xác.</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />

          <Title level={5} style={{ color: '#8B6914' }}>
            <InboxOutlined /> Tab Vật tư tiêu hao
          </Title>
          <Paragraph>
            Quản lý các vật tư dùng 1 lần, mua theo lô: hộp bánh, muỗng gỗ, giấy nướng, túi đựng, cốc giấy...
            Vật tư tiêu hao <strong>có thể xuất kèm theo đơn hàng</strong> (VD: mỗi bánh kèm 1 hộp, 2 muỗng).
          </Paragraph>
          <ul>
            <li><strong>Khác nguyên liệu:</strong> Đơn vị tính đơn giản hơn (cái, gói, cuộn, tờ, hộp, túi).</li>
            <li><strong>Ghi chú:</strong> Sử dụng trường ghi chú để mô tả cách sử dụng.</li>
            <li><strong>Cảnh báo:</strong> Tương tự nguyên liệu, hệ thống cảnh báo khi tồn kho thấp.</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />

          <Title level={5} style={{ color: '#8B6914' }}>
            <ToolOutlined /> Tab Dụng cụ
          </Title>
          <Paragraph>
            Quản lý tài sản cố định: khuôn bánh, nhiệt kế, rây bột, dĩa, muỗng inox...
            Dụng cụ <strong>KHÔNG xuất theo đơn hàng</strong>, chỉ theo dõi số lượng và tình trạng.
          </Paragraph>
          <ul>
            <li><strong>Tình trạng:</strong> Cập nhật tình trạng dụng cụ: <Tag color="green">Tốt</Tag> <Tag color="orange">Cũ/Mòn</Tag> <Tag color="red">Hỏng</Tag> <Tag>Đã thay</Tag></li>
            <li><strong>Giá mua & Ngày mua:</strong> Ghi nhận để theo dõi chi phí đầu tư dụng cụ.</li>
            <li><strong>Không có tồn kho tối thiểu:</strong> Dụng cụ không có cảnh báo hết hàng.</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />

          <Title level={5} style={{ color: '#52c41a' }}>
            <FileAddOutlined /> Nhập hàng loạt (từ Excel)
          </Title>
          <Paragraph>
            Khi có danh sách nguyên liệu / vật tư trên Excel, bạn có thể <strong>copy-paste</strong> vào hệ thống
            để thêm nhiều mục cùng lúc thay vì tạo từng cái.
          </Paragraph>
          <ul>
            <li><strong>Bấm</strong> nút <Tag>Nhập hàng loạt</Tag> ở góc phải (xuất hiện trên cả 3 tab).</li>
            <li>Mở file Excel, <strong>bôi đen</strong> các dòng cần nhập, bấm <strong>Ctrl+C</strong> để copy.</li>
            <li><strong>Dán (Ctrl+V)</strong> vào ô nhập liệu, bấm <strong>Xem trước & phân loại</strong>.</li>
            <li>Hệ thống <strong>tự nhận diện</strong> tên, số lượng, đơn giá từ dữ liệu Excel.</li>
            <li>Hệ thống <strong>tự phân loại</strong>: khuôn/nhiệt kế = Dụng cụ, hộp/muỗng gỗ = Vật tư, bột/đường = Nguyên liệu.</li>
            <li><strong>Kiểm tra</strong> bảng preview: sửa tên, đổi loại, đổi đơn vị, bỏ tick dòng không cần.</li>
            <li>Dùng nút <strong>NL / VT / DC</strong> để đặt loại hàng loạt cho các mục đang chọn.</li>
            <li>Bấm <strong>Thêm X mục</strong> để lưu tất cả.</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />

          <Title level={5} style={{ color: '#1890ff' }}>
            <FormOutlined /> Cập nhật hàng loạt
          </Title>
          <Paragraph>
            Khi mua hàng về hoặc kiểm kê, bạn có thể cập nhật <strong>tồn kho, giá, tồn tối thiểu</strong> cho
            nhiều nguyên liệu / vật tư <strong>cùng lúc</strong> thay vì sửa từng cái.
          </Paragraph>
          <ul>
            <li><strong>Bấm</strong> nút <Tag>Cập nhật hàng loạt</Tag> ở góc phải trên cùng (tab Nguyên liệu hoặc Vật tư).</li>
            <li><strong>Sửa trực tiếp</strong> trên bảng: gõ số mới vào các ô Tồn kho, Tồn tối thiểu, Giá/đơn vị.</li>
            <li>Dòng nào bị sửa sẽ <strong>highlight vàng</strong>, giá trị cũ hiện gạch ngang bên dưới.</li>
            <li>Bấm <strong>Lưu tất cả</strong> để lưu mọi thay đổi cùng lúc.</li>
            <li>Bấm <strong>Huỷ</strong> để quay về chế độ xem bình thường (nếu có thay đổi chưa lưu sẽ hỏi xác nhận).</li>
            <li>Tab Dụng cụ <strong>không có</strong> chế độ này vì ít khi cần cập nhật hàng loạt.</li>
          </ul>

          <Divider style={{ margin: '12px 0' }} />

          <Title level={5} style={{ color: '#ff4d4f' }}>
            <WarningOutlined /> Lưu ý quan trọng
          </Title>
          <ul>
            <li>Khi <strong>mua hàng về</strong>: dùng chế độ Cập nhật hàng loạt để nhập nhanh tồn kho mới.</li>
            <li>Khi <strong>nhận đơn hàng</strong>: hệ thống tự trừ nguyên liệu theo công thức (nếu đã thiết lập).</li>
            <li><strong>Kiểm kê định kỳ:</strong> Xem qua từng tab, chú ý các mục màu đỏ/vàng cần mua thêm.</li>
            <li><strong>Phân loại đúng:</strong> Bột mì, đường = Nguyên liệu | Hộp, muỗng gỗ = Vật tư tiêu hao | Khuôn, nhiệt kế = Dụng cụ.</li>
          </ul>
        </div>
      </Modal>

      {/* ========== Modal: Nhập hàng loạt ========== */}
      <Modal
        title={
          <span>
            <FileAddOutlined style={{ marginRight: 8, color: '#8B6914' }} />
            Nhập hàng loạt từ Excel
          </span>
        }
        open={importModalOpen}
        onCancel={importSaving ? undefined : closeImportModal}
        footer={null}
        width={isMobile ? '100%' : 900}
        style={isMobile ? { top: 16, maxWidth: '100vw', paddingBottom: 0 } : undefined}
        maskClosable={!importSaving}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Steps
          current={importStep}
          size="small"
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ marginBottom: isMobile ? 12 : 20 }}
          items={[
            { title: 'Dán dữ liệu' },
            { title: 'Xem trước & phân loại' },
          ]}
        />

        {importStep === 0 && (
          <div>
            {/* Hướng dẫn nhanh */}
            <div style={{ marginBottom: 14, padding: '12px 14px', background: '#f0f7ff', borderRadius: 10, border: '1px solid #bad6ff' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                Hướng dẫn nhanh
              </div>

              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8, marginBottom: 12 }}>
                <div><strong>1.</strong> Mở file Excel chứa danh sách nguyên liệu / vật tư</div>
                <div><strong>2.</strong> Bôi đen các dòng cần nhập, bấm <Tag style={{ fontSize: 11, padding: '0 6px', margin: '0 2px' }}>Ctrl+C</Tag></div>
                <div><strong>3.</strong> Bấm vào ô bên dưới, bấm <Tag style={{ fontSize: 11, padding: '0 6px', margin: '0 2px' }}>Ctrl+V</Tag></div>
              </div>

              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
                <strong>Format hỗ trợ:</strong> STT | Tên | Số lượng | Đơn giá | Thành tiền
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>Ví dụ:</div>
              <div style={{ overflowX: 'auto', background: '#1e1e1e', borderRadius: 6, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#d4d4d4', lineHeight: 1.7, whiteSpace: 'pre' }}>
{`1   Bột mì số 8       1    28,000    28,000
2   Socola compound   1    65,000    65,000
3   Hộp bánh 18cm     10   12,000   120,000`}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Cột STT & Thành tiền tự bỏ qua. Dòng tiêu đề cũng tự bỏ qua.
                  <br />Hệ thống tự phân loại Nguyên liệu / Vật tư / Dụng cụ theo tên.
                </div>
                <Button
                  size="small"
                  type="link"
                  style={{ fontSize: 11, padding: 0 }}
                  onClick={() => setImportPasteText(`1\tBột mì số 8\t1\t28,000\t28,000\n2\tSocola compound\t1\t65,000\t65,000\n3\tHộp bánh 18cm\t10\t12,000\t120,000\n4\tCuộn mica bao bánh\t2\t61,000\t122,000\n5\tKhuôn bánh tròn 20cm\t1\t85,000\t85,000`)}
                >
                  Dán dữ liệu mẫu
                </Button>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#666' }}>
              Dán dữ liệu vào đây:
            </div>
            <TextArea
              rows={isMobile ? 6 : 10}
              value={importPasteText}
              onChange={(e) => setImportPasteText(e.target.value)}
              placeholder="Dán dữ liệu từ Excel vào đây..."
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button onClick={closeImportModal}>Huỷ</Button>
                <Button
                  type="primary"
                  onClick={handleImportParse}
                  disabled={!importPasteText.trim()}
                  style={{ backgroundColor: '#8B6914' }}
                >
                  Xem trước & phân loại
                </Button>
              </Space>
            </div>
          </div>
        )}

        {importStep === 1 && (
          <div>
            {/* Error alert if any */}
            {importErrorCount > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message={`${importErrorCount} mục bị lỗi — các dòng đỏ bên dưới`}
                description="Kiểm tra cột Trạng thái để xem chi tiết lỗi. Sửa thông tin rồi bấm thử lại. Các mục đã thêm thành công (xanh lá) sẽ được bỏ qua."
              />
            )}

            {/* Success info after partial save */}
            {importSavedCount > 0 && importErrorCount > 0 && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 12 }}
                message={`${importSavedCount} mục đã thêm thành công`}
              />
            )}

            {/* Summary bar */}
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: isMobile ? '8px 10px' : '10px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, display: 'flex', gap: isMobile ? 8 : 16, flexWrap: 'wrap' }}>
                  {importTotalByCategory.ingredient > 0 && (
                    <span>NL: <strong style={{ color: '#1890ff' }}>{importTotalByCategory.ingredient.toLocaleString('vi-VN')}đ</strong></span>
                  )}
                  {importTotalByCategory.supply > 0 && (
                    <span>VT: <strong style={{ color: '#fa8c16' }}>{importTotalByCategory.supply.toLocaleString('vi-VN')}đ</strong></span>
                  )}
                  {importTotalByCategory.equipment > 0 && (
                    <span>DC: <strong style={{ color: '#52c41a' }}>{importTotalByCategory.equipment.toLocaleString('vi-VN')}đ</strong></span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#8B6914' }}>
                  Tổng: {importTotalCost.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Tags + bulk category */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag color="blue" style={{ fontSize: 11 }}>{importByCategory.ingredient} NL</Tag>
                <Tag color="orange" style={{ fontSize: 11 }}>{importByCategory.supply} VT</Tag>
                <Tag color="green" style={{ fontSize: 11 }}>{importByCategory.equipment} DC</Tag>
                <span style={{ color: '#666', fontSize: 12 }}>Chọn: {importSelectedCount}/{importRows.length}</span>
                {importErrorCount > 0 && <Tag color="error" style={{ fontSize: 11 }}>{importErrorCount} lỗi</Tag>}
                {importSavedCount > 0 && <Tag color="success" style={{ fontSize: 11 }}>{importSavedCount} xong</Tag>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#999' }}>Đặt loại:</span>
                <Button size="small" onClick={() => handleImportSetCategoryBulk('ingredient')}>NL</Button>
                <Button size="small" onClick={() => handleImportSetCategoryBulk('supply')}>VT</Button>
                <Button size="small" onClick={() => handleImportSetCategoryBulk('equipment')}>DC</Button>
              </div>
            </div>

            {/* Select all */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Checkbox
                checked={importRows.length > 0 && importRows.every((r) => r.selected)}
                indeterminate={importRows.some((r) => r.selected) && !importRows.every((r) => r.selected)}
                onChange={(e) => handleImportToggleAll(e.target.checked)}
              >
                <span style={{ fontSize: 12, color: '#666' }}>Chọn tất cả</span>
              </Checkbox>
            </div>

            {/* Card List */}
            <div style={{ maxHeight: isMobile ? '50vh' : 450, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {importRows.map((record, idx) => {
                const subtotal = record.quantity * record.unitPrice;
                const catInfo = { ingredient: { color: '#1890ff', bg: '#e6f7ff', label: 'NL' }, supply: { color: '#fa8c16', bg: '#fff7e6', label: 'VT' }, equipment: { color: '#52c41a', bg: '#f6ffed', label: 'DC' } }[record.category];
                const borderLeft = record.saved ? '3px solid #52c41a' : record.error ? '3px solid #ff4d4f' : `3px solid ${catInfo.color}`;
                const bg = record.saved ? '#f6ffed' : record.error ? '#fff1f0' : '#fff';
                const opacity = record.saved || !record.selected ? 0.5 : 1;

                return (
                  <div
                    key={record.key}
                    style={{
                      border: '1px solid #f0f0f0',
                      borderLeft,
                      borderRadius: 8,
                      padding: isMobile ? '8px 10px' : '10px 14px',
                      background: bg,
                      opacity,
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Row 1: Checkbox + Name + Subtotal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Checkbox checked={record.selected} onChange={() => handleImportToggleRow(record.key)} />
                      <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, minWidth: 18 }}>#{idx + 1}</span>
                      <Input
                        size="small"
                        value={record.name}
                        onChange={(e) => handleImportUpdateRow(record.key, 'name', e.target.value)}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <div style={{ minWidth: isMobile ? 70 : 90, textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, color: '#8B6914', fontSize: isMobile ? 12 : 14 }}>
                          {subtotal.toLocaleString('vi-VN')}
                        </span>
                        <span style={{ fontSize: 10, color: '#999' }}>đ</span>
                      </div>
                    </div>

                    {/* Row 2: Category + Qty × Price + Unit + Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: isMobile ? 28 : 48, flexWrap: 'wrap' }}>
                      <Tag color={catInfo.color} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>{catInfo.label}</Tag>
                      <Select
                        size="small"
                        value={record.category}
                        style={{ width: isMobile ? 65 : 105 }}
                        onChange={(v) => handleImportUpdateRow(record.key, 'category', v)}
                        options={isMobile ? [
                          { value: 'ingredient', label: 'NL' },
                          { value: 'supply', label: 'VT' },
                          { value: 'equipment', label: 'DC' },
                        ] : [
                          { value: 'ingredient', label: 'Nguyên liệu' },
                          { value: 'supply', label: 'Vật tư' },
                          { value: 'equipment', label: 'Dụng cụ' },
                        ]}
                        variant="borderless"
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f5f5f5', borderRadius: 6, padding: '0 4px' }}>
                        <InputNumber size="small" value={record.quantity} min={0} style={{ width: isMobile ? 50 : 60 }} variant="borderless" onChange={(v) => handleImportUpdateRow(record.key, 'quantity', v ?? 0)} />
                        <span style={{ color: '#999', fontSize: 11 }}>&times;</span>
                        <InputNumber size="small" value={record.unitPrice} min={0} step={100} style={{ width: isMobile ? 65 : 75 }} variant="borderless" onChange={(v) => handleImportUpdateRow(record.key, 'unitPrice', v ?? 0)} />
                        <Select
                          size="small"
                          value={record.unit}
                          style={{ width: isMobile ? 50 : 58 }}
                          onChange={(v) => handleImportUpdateRow(record.key, 'unit', v)}
                          options={allUnitOptions}
                          variant="borderless"
                        />
                      </div>

                      {record.saved && <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>Xong</Tag>}
                      {record.error && (
                        <Tooltip title={record.error}>
                          <Tag color="error" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 10, cursor: 'help' }}>Lỗi</Tag>
                        </Tooltip>
                      )}
                    </div>

                    {/* Row 3: Auto note */}
                    {record.autoNote && (
                      <div style={{ fontSize: 11, color: '#8B6914', marginTop: 4, marginLeft: isMobile ? 28 : 48, fontStyle: 'italic' }}>
                        {record.autoNote}
                      </div>
                    )}

                    {/* Error detail */}
                    {record.error && (
                      <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4, marginLeft: isMobile ? 28 : 48 }}>
                        {record.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save progress */}
            {importSaving && (
              <div style={{ marginTop: 12 }}>
                <Progress
                  percent={Math.round((importSaveProgress.done / importSaveProgress.total) * 100)}
                  size="small"
                  format={() => `${importSaveProgress.done}/${importSaveProgress.total}`}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Button onClick={handleImportBack} disabled={importSaving} icon={<UndoOutlined />} size={isMobile ? 'middle' : 'middle'}>
                Quay lại
              </Button>
              <div style={{ display: 'flex', gap: 8 }}>
                {!isMobile && <Button onClick={closeImportModal} disabled={importSaving}>Huỷ</Button>}
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleImportSave}
                  loading={importSaving}
                  disabled={importPendingCount === 0 && importErrorCount === 0}
                  style={{ backgroundColor: importErrorCount > 0 ? '#ff4d4f' : '#8B6914' }}
                >
                  {importErrorCount > 0
                    ? `Thử lại ${importErrorCount} lỗi`
                    : importSavedCount > 0
                    ? `Thêm ${importPendingCount} còn lại`
                    : `Thêm ${importSelectedCount} mục`
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Typography,
  Divider,
  Descriptions,
  Popconfirm,
  Tooltip,
  Alert,
  Drawer,
  Upload,
  Badge,
  Image,
  DatePicker,
  Row,
  Col,
  Spin,
  Segmented,
  Checkbox,
  Steps,
} from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  MinusOutlined,
  EditOutlined,
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  ClearOutlined,
  CalendarOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, ingredientsApi, suppliesApi, equipmentApi, uploadApi } from '@/lib/api';
import { usePurchaseOrdersQuery, useAllIngredientsQuery, useAllSuppliesQuery, useAllEquipmentQuery, useActiveSuppliersQuery } from '@/lib/hooks';
import { formatCurrency, formatDateTime, formatDate, poStatusMap } from '@/lib/format';
import type { PurchaseOrder, Ingredient, Supply, Equipment, Supplier } from '@/types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Chi tiết trạng thái phiếu nhập với mô tả đầy đủ
const STATUS_DETAILS: Record<string, {
  label: string;
  color: string;
  icon: string;
  description: string;
  actions: string;
}> = {
  draft: {
    label: 'Nháp',
    color: 'default',
    icon: '📝',
    description: 'Phiếu vừa tạo, chưa xác nhận. Tồn kho chưa thay đổi.',
    actions: 'Nhấn "Xác nhận" để duyệt đơn hàng, hoặc "Huỷ" nếu không cần nữa.',
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: 'blue',
    icon: '✅',
    description: 'Đơn hàng đã được duyệt, đang chờ nhận hàng từ nhà cung cấp. Tồn kho CHƯA thay đổi.',
    actions: 'Khi nhận đủ hàng, nhấn "Nhận hàng & Nhập kho" để cộng tồn kho. Hoặc "Huỷ" nếu NCC không giao.',
  },
  received: {
    label: 'Đã nhận hàng',
    color: 'green',
    icon: '📦',
    description: 'Hàng đã nhận đủ từ NCC. Tồn kho ĐÃ được cộng thêm theo số lượng trong phiếu. Giá mua đã cập nhật.',
    actions: 'Phiếu hoàn tất — không thể chỉnh sửa hay huỷ.',
  },
  cancelled: {
    label: 'Đã huỷ',
    color: 'red',
    icon: '❌',
    description: 'Phiếu đã bị huỷ. Nếu phiếu chưa nhận hàng thì tồn kho không bị ảnh hưởng.',
    actions: 'Phiếu không còn hiệu lực — không thể khôi phục.',
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI0IiBmaWxsPSIjZjVmNWY1Ii8+PHBhdGggZD0iTTE2IDI0bDQtNCA0IDQiIHN0cm9rZT0iI2JmYmZiZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIxNiIgcj0iMiIgZmlsbD0iI2JmYmZiZiIvPjwvc3ZnPg==';

const DRAFT_STORAGE_KEY = 'po_draft';

const unitOptions = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Mililiter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'piece', label: 'Cái/Quả (piece)' },
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

const conditionOptions = [
  { value: 'good', label: 'Tốt' },
  { value: 'worn', label: 'Cũ / Mòn' },
  { value: 'broken', label: 'Hỏng' },
  { value: 'replaced', label: 'Đã thay' },
];

type DrawerCategory = 'ingredient' | 'supply' | 'equipment';

const drawerCategoryLabels: Record<DrawerCategory, string> = {
  ingredient: 'nguyên liệu',
  supply: 'vật tư',
  equipment: 'dụng cụ',
};

const drawerCategorySegments = [
  { value: 'ingredient', label: '🧪 Nguyên liệu' },
  { value: 'supply', label: '📦 Vật tư' },
  { value: 'equipment', label: '🔧 Dụng cụ' },
];

// ============================================================
// Bulk Paste helpers
// ============================================================
type BulkItemCategory = 'ingredient' | 'supply' | 'equipment';

interface BulkPasteRow {
  key: string;
  selected: boolean;
  name: string;         // Tên dán từ Excel
  quantity: number;
  unitPrice: number;
  category: BulkItemCategory;
  matchedId?: string;   // ID match được trong DB
  matchedName?: string; // Tên match
  matchScore: 'exact' | 'partial' | 'none';
}

const classifyByName = (name: string): { category: BulkItemCategory; unit: string } => {
  const n = name.toLowerCase();
  const equipmentKw = ['khuôn', 'khuon', 'nhiệt kế', 'nhiet ke', 'rây', 'ray', 'dĩa', 'dia', 'muỗng nhỏ inox', 'muỗng inox', 'muỗng lớn', 'dao', 'thớt', 'nồi', 'chảo', 'máy'];
  for (const kw of equipmentKw) { if (n.includes(kw)) return { category: 'equipment', unit: 'piece' }; }
  const supplyKw = ['hộp', 'hop', 'túi', 'tui', 'muỗng gỗ', 'muong go', 'giấy nướng', 'giay nuong', 'giấy bạc', 'cốc giấy', 'ống hút', 'bao bì', 'hũ đựng', 'hu dung', 'hũ'];
  for (const kw of supplyKw) { if (n.includes(kw)) return { category: 'supply', unit: 'piece' }; }
  if (n.match(/\d+\s*kg/) || n.includes('1kg')) return { category: 'ingredient', unit: 'kg' };
  if (n.match(/\d+\s*g/) && !n.includes('kg')) return { category: 'ingredient', unit: 'g' };
  if (n.match(/\d+\s*ml/)) return { category: 'ingredient', unit: 'ml' };
  if (n.match(/\d+\s*l/) && !n.includes('ml')) return { category: 'ingredient', unit: 'l' };
  const ingredientKw = ['bột', 'bot', 'đường', 'duong', 'socola', 'chocolate', 'gelatin', 'baking', 'soda', 'nở', 'vani', 'bơ', 'sữa', 'sua', 'kem', 'trứng', 'trung', 'cacao', 'dầu', 'muối', 'mật ong'];
  for (const kw of ingredientKw) { if (n.includes(kw)) return { category: 'ingredient', unit: 'g' }; }
  return { category: 'ingredient', unit: 'g' };
};

const parseNumber = (val: string): number => {
  if (!val) return 0;
  const s = val.trim();
  if (/,\d{3}/.test(s)) { return parseFloat(s.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0; }
  if (/\.\d{3}/.test(s)) { return parseFloat(s.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '')) || 0; }
  return parseFloat(s.replace(/[^\d.]/g, '')) || 0;
};

/** Parse cột Loại: NL / VT / DC (case-insensitive) */
const parseCategoryCode = (code: string): BulkItemCategory | null => {
  const c = code.trim().toUpperCase();
  if (c === 'NL') return 'ingredient';
  if (c === 'VT') return 'supply';
  if (c === 'DC') return 'equipment';
  return null;
};

const parseBulkPasteData = (text: string): Omit<BulkPasteRow, 'matchedId' | 'matchedName' | 'matchScore'>[] => {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  const rows: Omit<BulkPasteRow, 'matchedId' | 'matchedName' | 'matchScore'>[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
    const cleaned = cells.map((c) => c.trim()).filter(Boolean);
    if (cleaned.length < 2) continue;
    const firstLower = cleaned[0].toLowerCase();
    if (i === 0 && (firstLower.includes('tên') || firstLower.includes('stt') || firstLower === '#' || firstLower.includes('name') || firstLower.includes('loại'))) continue;

    let name = '', quantity = 0, unitPrice = 0;
    let explicitCategory: BulkItemCategory | null = null;
    const firstIsNumber = /^\d+$/.test(cleaned[0]);

    // Detect cột Loại ở cuối (NL / VT / DC)
    const lastCell = cleaned[cleaned.length - 1];
    const lastIsCategory = parseCategoryCode(lastCell);
    const dataCells = lastIsCategory ? cleaned.slice(0, -1) : cleaned;
    if (lastIsCategory) explicitCategory = lastIsCategory;

    if (firstIsNumber && dataCells.length >= 4) { name = dataCells[1]; quantity = parseNumber(dataCells[2]); unitPrice = parseNumber(dataCells[3]); }
    else if (firstIsNumber && dataCells.length === 3) { name = dataCells[1]; quantity = parseNumber(dataCells[2]); unitPrice = 0; }
    else if (firstIsNumber && dataCells.length === 2) { name = dataCells[1]; quantity = 1; unitPrice = 0; }
    else if (!firstIsNumber && dataCells.length >= 3) { name = dataCells[0]; quantity = parseNumber(dataCells[1]); unitPrice = parseNumber(dataCells[2]); }
    else if (!firstIsNumber && dataCells.length === 2) { name = dataCells[0]; quantity = parseNumber(dataCells[1]); unitPrice = 0; }
    else if (!firstIsNumber && dataCells.length === 1) { name = dataCells[0]; quantity = 1; unitPrice = 0; }
    else continue;
    if (!name) continue;

    const category = explicitCategory || classifyByName(name).category;
    rows.push({ key: `bp-${i}`, selected: true, name, quantity, unitPrice, category });
  }
  return rows;
};

/** Fuzzy match tên paste với danh sách items trong DB */
const matchItemByName = (
  pasteName: string,
  category: BulkItemCategory,
  ingredientsList: Ingredient[],
  suppliesList: Supply[],
  equipmentList: Equipment[],
): { id: string; name: string; score: 'exact' | 'partial' | 'none' } => {
  const n = pasteName.toLowerCase().trim();

  // Chọn danh sách theo category
  const items: { id: string; name: string }[] =
    category === 'ingredient' ? ingredientsList.map((i) => ({ id: i.id, name: i.name })) :
    category === 'supply' ? suppliesList.map((s) => ({ id: s.id, name: s.name })) :
    equipmentList.map((e) => ({ id: e.id, name: e.name }));

  // Exact match
  const exact = items.find((i) => i.name.toLowerCase().trim() === n);
  if (exact) return { id: exact.id, name: exact.name, score: 'exact' };

  // Partial match: tên paste chứa trong tên DB hoặc ngược lại
  const partial = items.find((i) => {
    const dbName = i.name.toLowerCase().trim();
    return dbName.includes(n) || n.includes(dbName);
  });
  if (partial) return { id: partial.id, name: partial.name, score: 'partial' };

  return { id: '', name: '', score: 'none' };
};

const bulkCategoryLabels: Record<BulkItemCategory, { label: string; tag: string; color: string }> = {
  ingredient: { label: 'Nguyên liệu', tag: 'NL', color: 'blue' },
  supply: { label: 'Vật tư', tag: 'VT', color: 'orange' },
  equipment: { label: 'Dụng cụ', tag: 'DC', color: 'green' },
};

// ============================================================
// Sub-component: Mỗi dòng hàng nhập trong form
// ============================================================
type POItemType = 'ingredient' | 'supply' | 'equipment';

const itemTypeOptions = [
  { value: 'ingredient', label: '🧪 Nguyên liệu' },
  { value: 'supply', label: '📦 Vật tư' },
  { value: 'equipment', label: '🔧 Dụng cụ' },
];

interface ItemRowProps {
  name: number;
  rest: any;
  ingredientOptions: { value: string; label: string; ingredient: Ingredient }[];
  supplyOptions: { value: string; label: string; supply: Supply }[];
  equipmentOptions: { value: string; label: string; equipment: Equipment }[];
  onItemChange: (name: number, itemType: string, itemId: string) => void;
  onItemTypeChange: (name: number, itemType: string) => void;
  onRemove: (name: number) => void;
  getSelectedUnit: (name: number) => string;
  form: any;
}

function ItemRow({
  name,
  rest,
  ingredientOptions,
  supplyOptions,
  equipmentOptions,
  onItemChange,
  onItemTypeChange,
  onRemove,
  getSelectedUnit,
  form,
}: ItemRowProps) {
  const unit = getSelectedUnit(name);
  const items = form.getFieldValue('items') || [];
  const currentItemType: POItemType = items[name]?.itemType || 'ingredient';

  return (
    <div
      className="po-ingredient-row"
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        padding: '12px 12px 4px',
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      {/* Loại */}
      <Form.Item
        {...rest}
        name={[name, 'itemType']}
        initialValue="ingredient"
        style={{ width: 150, marginBottom: 8 }}
      >
        <Select
          options={itemTypeOptions}
          onChange={(val) => onItemTypeChange(name, val)}
        />
      </Form.Item>

      {/* Item selector - changes based on itemType */}
      {currentItemType === 'ingredient' && (
        <Form.Item
          {...rest}
          name={[name, 'ingredientId']}
          rules={[{ required: true, message: 'Chọn nguyên liệu' }]}
          style={{ flex: '1 1 200px', minWidth: 200, marginBottom: 8 }}
        >
          <Select
            placeholder="Tìm nguyên liệu..."
            showSearch
            optionFilterProp="label"
            onChange={(val) => onItemChange(name, 'ingredient', val)}
            options={ingredientOptions}
            optionRender={(option) => {
              const ing = option.data.ingredient as Ingredient;
              if (!ing) return option.label;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ing.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      Tồn: {Number(ing.currentStock).toLocaleString('vi-VN')} {ing.unit}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </Form.Item>
      )}

      {currentItemType === 'supply' && (
        <Form.Item
          {...rest}
          name={[name, 'supplyId']}
          rules={[{ required: true, message: 'Chọn vật tư' }]}
          style={{ flex: '1 1 200px', minWidth: 200, marginBottom: 8 }}
        >
          <Select
            placeholder="Tìm vật tư..."
            showSearch
            optionFilterProp="label"
            onChange={(val) => onItemChange(name, 'supply', val)}
            options={supplyOptions}
            optionRender={(option) => {
              const sup = option.data.supply as Supply;
              if (!sup) return option.label;
              return (
                <div style={{ lineHeight: 1.3, padding: '4px 0' }}>
                  <div style={{ fontWeight: 500 }}>{sup.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Tồn: {Number(sup.currentStock).toLocaleString('vi-VN')} {sup.unit}
                  </div>
                </div>
              );
            }}
          />
        </Form.Item>
      )}

      {currentItemType === 'equipment' && (
        <Form.Item
          {...rest}
          name={[name, 'equipmentId']}
          rules={[{ required: true, message: 'Chọn dụng cụ' }]}
          style={{ flex: '1 1 200px', minWidth: 200, marginBottom: 8 }}
        >
          <Select
            placeholder="Tìm dụng cụ..."
            showSearch
            optionFilterProp="label"
            onChange={(val) => onItemChange(name, 'equipment', val)}
            options={equipmentOptions}
            optionRender={(option) => {
              const eq = option.data.equipment as Equipment;
              if (!eq) return option.label;
              return (
                <div style={{ lineHeight: 1.3, padding: '4px 0' }}>
                  <div style={{ fontWeight: 500 }}>{eq.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    SL: {eq.quantity}
                  </div>
                </div>
              );
            }}
          />
        </Form.Item>
      )}

      {/* Số lượng */}
      <Form.Item
        {...rest}
        name={[name, 'quantity']}
        rules={[{ required: true, message: 'Nhập SL' }]}
        style={{ width: 130, marginBottom: 8 }}
      >
        <InputNumber
          placeholder="Số lượng"
          min={0.001}
          style={{ width: '100%' }}
          addonAfter={unit || '—'}
        />
      </Form.Item>

      {/* Đơn giá */}
      <Form.Item
        {...rest}
        name={[name, 'unitPrice']}
        rules={[{ required: true, message: 'Nhập giá' }]}
        style={{ width: 150, marginBottom: 8 }}
      >
        <InputNumber
          placeholder="Đơn giá"
          min={0}
          step={1000}
          style={{ width: '100%' }}
          addonAfter="₫"
          formatter={(val) => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
          parser={(val) => (val ? Number(val.replace(/,/g, '')) : 0) as any}
        />
      </Form.Item>

      {/* Thành tiền (read-only) */}
      <Form.Item shouldUpdate style={{ width: 120, marginBottom: 8 }}>
        {() => {
          const items = form.getFieldValue('items') || [];
          const qty = items[name]?.quantity || 0;
          const price = items[name]?.unitPrice || 0;
          const subtotal = qty * price;
          return (
            <div
              style={{
                height: 32,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                background: '#fff',
                borderRadius: 6,
                border: '1px solid #d9d9d9',
                color: subtotal > 0 ? '#8B6914' : '#bfbfbf',
                fontWeight: 500,
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              {subtotal > 0 ? formatCurrency(subtotal) : 'Thành tiền'}
            </div>
          );
        }}
      </Form.Item>

      {/* Xoá */}
      <Tooltip title="Xoá dòng này">
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => onRemove(name)}
          style={{ marginTop: 4 }}
        />
      </Tooltip>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================
export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedItemMap, setSelectedItemMap] = useState<Record<number, { type: string; id: string; unit: string }>>({});

  const [isMobile, setIsMobile] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const MOBILE_PAGE_SIZE = 10;

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [showStatusGuide, setShowStatusGuide] = useState(false);

  // Minimize / Draft states
  const [minimized, setMinimized] = useState(false);

  // Drawer tạo nguyên liệu / vật tư / dụng cụ nhanh
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<DrawerCategory>('ingredient');
  const [drawerForm] = Form.useForm();
  const [drawerImageList, setDrawerImageList] = useState<string[]>([]);
  const [drawerImageUrl, setDrawerImageUrl] = useState('');
  const [drawerUploading, setDrawerUploading] = useState(false);
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);

  // ========== React Query data ==========
  const posQuery = usePurchaseOrdersQuery({ page: pagination.current, limit: pagination.pageSize });
  const purchaseOrders: PurchaseOrder[] = posQuery.data?.list || [];
  const loading = posQuery.isLoading;
  const { data: ingredients = [] } = useAllIngredientsQuery();
  const { data: allSupplies = [] } = useAllSuppliesQuery();
  const { data: allEquipment = [] } = useAllEquipmentQuery();
  const { data: suppliers = [] } = useActiveSuppliersQuery();

  // Update pagination total when posQuery data changes
  useEffect(() => {
    if (posQuery.data?.pagination?.total !== undefined) {
      setPagination((prev) => ({ ...prev, total: posQuery.data?.pagination?.total || 0 }));
    }
  }, [posQuery.data?.pagination?.total]);

  // Khôi phục draft nếu có
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft && draft.values) {
          setMinimized(true);
          setFormDirty(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ========== Ingredient map O(1) ==========
  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const lowStockIngredients = useMemo(
    () => ingredients.filter((i) => i.currentStock <= i.minStock),
    [ingredients],
  );

  // ========== Client-side filter ==========
  const filteredPOs = useMemo(() => {
    let result = purchaseOrders;

    // Lọc theo trạng thái
    if (filterStatus !== 'all') {
      result = result.filter((po) => po.status === filterStatus);
    }

    // Lọc theo khoảng thời gian
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const start = filterDateRange[0].startOf('day');
      const end = filterDateRange[1].endOf('day');
      result = result.filter((po) => {
        const d = dayjs(po.createdAt);
        return d.isAfter(start) && d.isBefore(end);
      });
    }

    // Lọc theo từ khoá (mã phiếu, NCC, ghi chú)
    if (filterSearch.trim()) {
      const kw = filterSearch.toLowerCase().trim();
      result = result.filter((po) =>
        po.poNumber?.toLowerCase().includes(kw) ||
        po.supplier?.name?.toLowerCase().includes(kw) ||
        po.notes?.toLowerCase().includes(kw),
      );
    }

    return result;
  }, [purchaseOrders, filterStatus, filterDateRange, filterSearch]);

  // Đếm số phiếu theo trạng thái
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: purchaseOrders.length };
    purchaseOrders.forEach((po) => {
      counts[po.status] = (counts[po.status] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  const hasActiveFilters = filterStatus !== 'all' || filterSearch.trim() !== '' || (filterDateRange !== null && filterDateRange[0] !== null);

  const clearAllFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterSearch('');
    setFilterDateRange(null);
  }, []);

  // ========== Build options loại trừ đã chọn ==========
  const buildIngredientOptions = useCallback(
    (excludeFieldName: number) => {
      const allItems = form.getFieldValue('items') || [];
      const selectedIds = allItems
        .filter((_: any, idx: number) => idx !== excludeFieldName)
        .map((item: any) => item?.ingredientId)
        .filter(Boolean);
      return ingredients
        .filter((i) => !selectedIds.includes(i.id))
        .map((i) => ({
          value: i.id,
          label: `${i.name} (${i.unit})`,
          ingredient: i,
        }));
    },
    [ingredients, form],
  );

  const buildSupplyOptions = useCallback(
    (excludeFieldName: number) => {
      const allItems = form.getFieldValue('items') || [];
      const selectedIds = allItems
        .filter((_: any, idx: number) => idx !== excludeFieldName)
        .map((item: any) => item?.supplyId)
        .filter(Boolean);
      return allSupplies
        .filter((s) => !selectedIds.includes(s.id))
        .map((s) => ({
          value: s.id,
          label: `${s.name} (${s.unit})`,
          supply: s,
        }));
    },
    [allSupplies, form],
  );

  const buildEquipmentOptions = useCallback(
    (excludeFieldName: number) => {
      const allItems = form.getFieldValue('items') || [];
      const selectedIds = allItems
        .filter((_: any, idx: number) => idx !== excludeFieldName)
        .map((item: any) => item?.equipmentId)
        .filter(Boolean);
      return allEquipment
        .filter((e) => !selectedIds.includes(e.id))
        .map((e) => ({
          value: e.id,
          label: e.name,
          equipment: e,
        }));
    },
    [allEquipment, form],
  );

  // ========== Handlers ==========
  const handleItemChange = useCallback((fieldName: number, itemType: string, itemId: string) => {
    let unit = '';
    if (itemType === 'ingredient') {
      const ing = ingredients.find((i) => i.id === itemId);
      unit = ing?.unit || '';
    } else if (itemType === 'supply') {
      const sup = allSupplies.find((s) => s.id === itemId);
      unit = sup?.unit || '';
    } else if (itemType === 'equipment') {
      unit = 'cái';
    }
    setSelectedItemMap((prev) => ({ ...prev, [fieldName]: { type: itemType, id: itemId, unit } }));
  }, [ingredients, allSupplies]);

  const handleItemTypeChange = useCallback((fieldName: number, newType: string) => {
    // Clear the item selection when type changes
    const items = form.getFieldValue('items') || [];
    const updatedItems = [...items];
    if (updatedItems[fieldName]) {
      updatedItems[fieldName] = {
        ...updatedItems[fieldName],
        itemType: newType,
        ingredientId: undefined,
        supplyId: undefined,
        equipmentId: undefined,
      };
      form.setFieldsValue({ items: updatedItems });
    }
    setSelectedItemMap((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, [form]);

  const getSelectedUnit = useCallback((fieldName: number) => {
    const item = selectedItemMap[fieldName];
    return item?.unit || '';
  }, [selectedItemMap]);

  const handleCreate = useCallback(async (values: any) => {
    setSubmitting(true);
    try {
      const poData = {
        supplierId: values.supplierId,
        notes: values.notes,
        items: values.items.map((item: any) => ({
          itemType: item.itemType || 'ingredient',
          ingredientId: item.ingredientId,
          supplyId: item.supplyId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      await purchaseOrdersApi.create(poData);
      message.success('Tạo phiếu nhập thành công');
      setModalOpen(false);
      setFormDirty(false);
      setMinimized(false);
      form.resetFields();
      setSelectedItemMap({});
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  }, [form, queryClient]);

  // draft → confirmed: chỉ xác nhận đơn, CHƯA nhập kho
  const handleConfirm = useCallback(async (id: string) => {
    try {
      await purchaseOrdersApi.updateStatus(id, 'confirmed');
      message.success('Đã xác nhận đơn hàng — chờ nhận hàng từ nhà cung cấp');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  }, [queryClient]);

  // confirmed → received: nhận hàng + CỘNG TỒN KHO
  const handleReceived = useCallback(async (id: string) => {
    try {
      await purchaseOrdersApi.updateStatus(id, 'received');
      message.success('Nhận hàng thành công — tồn kho đã được cộng!');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      // Refresh ingredients để cập nhật tồn kho mới trong dropdown
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  }, [queryClient]);

  // draft | confirmed → cancelled: huỷ phiếu (chưa nhận hàng nên không ảnh hưởng tồn kho)
  const handleCancel = useCallback(async (id: string) => {
    try {
      await purchaseOrdersApi.updateStatus(id, 'cancelled');
      message.success('Đã huỷ phiếu nhập');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  }, [queryClient]);

  const viewDetail = useCallback(async (po: PurchaseOrder) => {
    try {
      const res = await purchaseOrdersApi.getOne(po.id);
      setSelectedPO(res.data.data);
      setDetailOpen(true);
    } catch {
      message.error('Không thể tải chi tiết');
    }
  }, []);

  // ========== Nhập nhanh NL thiếu ==========
  const handleQuickAddLowStock = useCallback(() => {
    const currentItems = form.getFieldValue('items') || [];
    const alreadySelected = new Set(currentItems.map((item: any) => item?.ingredientId).filter(Boolean));

    const newItems = lowStockIngredients
      .filter((i) => !alreadySelected.has(i.id))
      .map((i) => ({
        itemType: 'ingredient' as const,
        ingredientId: i.id,
        quantity: undefined,
        unitPrice: i.costPerUnit > 0 ? Number(i.costPerUnit) : undefined,
      }));

    if (newItems.length === 0) {
      message.info('Tất cả nguyên liệu thiếu đã có trong danh sách');
      return;
    }

    form.setFieldsValue({ items: [...currentItems, ...newItems] });
    setFormDirty(true);
    message.success(`Đã thêm ${newItems.length} nguyên liệu đang thiếu`);
  }, [form, lowStockIngredients]);

  // ========== Minimize modal -> lưu nháp ==========
  const handleMinimize = useCallback(() => {
    const values = form.getFieldsValue(true);
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        values,
        timestamp: Date.now(),
      }));
    } catch { /* quota exceeded */ }
    setModalOpen(false);
    setMinimized(true);
    message.info('Phiếu nhập đã thu nhỏ. Nhấn nút bên dưới để tiếp tục.');
  }, [form]);

  // ========== Restore draft ==========
  const handleRestore = useCallback(async () => {
    // Refresh danh sách NL mới nhất trước khi restore
    await queryClient.invalidateQueries({ queryKey: ['ingredients'] });

    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft?.values) {
          // Delay 1 tick để form mount xong
          setModalOpen(true);
          setMinimized(false);
          setTimeout(() => {
            form.setFieldsValue(draft.values);
            setFormDirty(true);
          }, 50);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fallback: mở modal trống
    setModalOpen(true);
    setMinimized(false);
  }, [form, queryClient]);

  // ========== Đóng modal ==========
  const handleCloseModal = useCallback(() => {
    if (formDirty) {
      Modal.confirm({
        title: 'Xác nhận đóng',
        icon: <ExclamationCircleOutlined />,
        content: 'Bạn đã nhập dữ liệu. Bạn muốn thu nhỏ (giữ nháp) hay đóng hoàn toàn (mất dữ liệu)?',
        okText: 'Đóng hoàn toàn',
        cancelText: 'Thu nhỏ (giữ nháp)',
        okButtonProps: { danger: true },
        onOk: () => {
          setModalOpen(false);
          setFormDirty(false);
          setMinimized(false);
          form.resetFields();
          setSelectedItemMap({});
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        },
        onCancel: () => {
          handleMinimize();
        },
      });
    } else {
      setModalOpen(false);
      form.resetFields();
      setSelectedItemMap({});
    }
  }, [formDirty, form, handleMinimize]);

  // ========== Drawer: Tạo nguyên liệu nhanh ==========
  const handleDrawerUpload = useCallback(async (file: File) => {
    if (drawerImageList.length >= 3) {
      message.warning('Tối đa 3 ảnh');
      return false;
    }
    setDrawerUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data.url;
      setDrawerImageList((prev) => {
        const newList = [...prev, url];
        drawerForm.setFieldsValue({ images: newList });
        return newList;
      });
      if (!drawerImageUrl) {
        setDrawerImageUrl(url);
        drawerForm.setFieldsValue({ imageUrl: url });
      }
      message.success('Upload ảnh thành công');
    } catch {
      message.error('Upload ảnh thất bại');
    } finally {
      setDrawerUploading(false);
    }
    return false;
  }, [drawerImageList, drawerImageUrl, drawerForm]);

  const handleDrawerRemoveImage = useCallback((url: string) => {
    setDrawerImageList((prev) => {
      const newList = prev.filter((u) => u !== url);
      drawerForm.setFieldsValue({ images: newList });
      if (drawerImageUrl === url) {
        const next = newList[0] || '';
        setDrawerImageUrl(next);
        drawerForm.setFieldsValue({ imageUrl: next });
      }
      return newList;
    });
  }, [drawerImageUrl, drawerForm]);

  const handleDrawerSubmit = useCallback(async (values: any) => {
    setDrawerSubmitting(true);
    try {
      const label = drawerCategoryLabels[drawerCategory];

      if (drawerCategory === 'ingredient') {
        await ingredientsApi.create(values);
        await queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      } else if (drawerCategory === 'supply') {
        await suppliesApi.create(values);
        await queryClient.invalidateQueries({ queryKey: ['supplies'] });
        await queryClient.invalidateQueries({ queryKey: ['lowStockSupplies'] });
      } else {
        await equipmentApi.create(values);
        await queryClient.invalidateQueries({ queryKey: ['equipment'] });
      }

      message.success(`Đã tạo ${label} "${values.name}" thành công`);

      // Đóng drawer
      setDrawerOpen(false);
      drawerForm.resetFields();
      setDrawerImageList([]);
      setDrawerImageUrl('');
    } catch (err: any) {
      const label = drawerCategoryLabels[drawerCategory];
      message.error(err.response?.data?.message || `Tạo ${label} thất bại`);
    } finally {
      setDrawerSubmitting(false);
    }
  }, [drawerForm, drawerCategory, queryClient]);

  const handleOpenDrawer = useCallback(() => {
    drawerForm.resetFields();
    setDrawerImageList([]);
    setDrawerImageUrl('');
    setDrawerCategory('ingredient');
    setDrawerOpen(true);
  }, [drawerForm]);

  const handleDrawerCategoryChange = useCallback((value: string | number) => {
    drawerForm.resetFields();
    setDrawerImageList([]);
    setDrawerImageUrl('');
    setDrawerCategory(value as DrawerCategory);
  }, [drawerForm]);

  // ========== Bulk Paste: Dán từ Excel ==========
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteStep, setBulkPasteStep] = useState<0 | 1>(0);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkPasteRows, setBulkPasteRows] = useState<BulkPasteRow[]>([]);

  const bulkPasteSelectedCount = bulkPasteRows.filter((r) => r.selected && r.matchScore !== 'none').length;
  const bulkPasteUnmatchedCount = bulkPasteRows.filter((r) => r.selected && r.matchScore === 'none').length;

  const handleBulkPasteOpen = useCallback(() => {
    setBulkPasteText('');
    setBulkPasteRows([]);
    setBulkPasteStep(0);
    setBulkPasteOpen(true);
  }, []);

  const handleBulkPasteParse = useCallback(() => {
    if (!bulkPasteText.trim()) {
      message.warning('Vui lòng dán dữ liệu từ Excel vào');
      return;
    }
    const parsed = parseBulkPasteData(bulkPasteText);
    if (parsed.length === 0) {
      message.error('Không nhận diện được dữ liệu. Vui lòng kiểm tra format.');
      return;
    }
    // Match với DB
    const matched: BulkPasteRow[] = parsed.map((row) => {
      const result = matchItemByName(row.name, row.category, ingredients, allSupplies, allEquipment);
      return {
        ...row,
        matchedId: result.id || undefined,
        matchedName: result.name || undefined,
        matchScore: result.score,
      };
    });
    setBulkPasteRows(matched);
    setBulkPasteStep(1);
  }, [bulkPasteText, ingredients, allSupplies, allEquipment]);

  const handleBulkPasteToggleRow = useCallback((key: string) => {
    setBulkPasteRows((prev) => prev.map((r) => r.key === key ? { ...r, selected: !r.selected } : r));
  }, []);

  const handleBulkPasteToggleAll = useCallback((checked: boolean) => {
    setBulkPasteRows((prev) => prev.map((r) => r.matchScore !== 'none' ? { ...r, selected: checked } : r));
  }, []);

  const handleBulkPasteChangeMatch = useCallback((key: string, newId: string, category: BulkItemCategory) => {
    // User chọn thủ công từ dropdown
    const list = category === 'ingredient' ? ingredients : category === 'supply' ? allSupplies : allEquipment;
    const found = list.find((i: any) => i.id === newId);
    setBulkPasteRows((prev) => prev.map((r) =>
      r.key === key ? { ...r, matchedId: newId, matchedName: found?.name || '', matchScore: 'exact' } : r
    ));
  }, [ingredients, allSupplies, allEquipment]);

  const handleBulkPasteAddToForm = useCallback(() => {
    const validRows = bulkPasteRows.filter((r) => r.selected && r.matchedId && r.matchScore !== 'none');
    if (validRows.length === 0) {
      message.warning('Không có mục nào hợp lệ để thêm');
      return;
    }

    const currentItems = form.getFieldValue('items') || [];
    const existingIds = new Set(
      currentItems.map((item: any) => item?.ingredientId || item?.supplyId || item?.equipmentId).filter(Boolean)
    );

    const newItems = validRows
      .filter((r) => !existingIds.has(r.matchedId))
      .map((r) => ({
        itemType: r.category,
        ingredientId: r.category === 'ingredient' ? r.matchedId : undefined,
        supplyId: r.category === 'supply' ? r.matchedId : undefined,
        equipmentId: r.category === 'equipment' ? r.matchedId : undefined,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      }));

    if (newItems.length === 0) {
      message.info('Tất cả mục đã có trong phiếu nhập');
      return;
    }

    // Update selectedItemMap for unit display
    const newMap = { ...selectedItemMap };
    const startIdx = currentItems.length;
    newItems.forEach((item: any, idx: number) => {
      let unit = '';
      if (item.itemType === 'ingredient') {
        const ing = ingredients.find((i) => i.id === item.ingredientId);
        unit = ing?.unit || '';
      } else if (item.itemType === 'supply') {
        const sup = allSupplies.find((s) => s.id === item.supplyId);
        unit = sup?.unit || '';
      } else {
        unit = 'cái';
      }
      newMap[startIdx + idx] = { type: item.itemType, id: item.ingredientId || item.supplyId || item.equipmentId, unit };
    });
    setSelectedItemMap(newMap);

    form.setFieldsValue({ items: [...currentItems, ...newItems] });
    setFormDirty(true);
    message.success(`Đã thêm ${newItems.length} mục vào phiếu nhập`);
    setBulkPasteOpen(false);
  }, [bulkPasteRows, form, selectedItemMap, ingredients, allSupplies, allEquipment]);

  // ========== Table columns ==========
  const columns = useMemo(() => [
    {
      title: 'Mã phiếu',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (num: string) => <strong>{num}</strong>,
    },
    {
      title: 'Nhà cung cấp',
      key: 'supplier',
      render: (_: any, record: PurchaseOrder) => record.supplier?.name || '-',
    },
    {
      title: 'Tổng chi phí',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = poStatusMap[status] || { label: status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => formatDateTime(d),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 320,
      render: (_: any, record: PurchaseOrder) => (
        <Space size={4} wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
            Chi tiết
          </Button>

          {/* draft → confirmed (xác nhận đơn, CHƯA nhập kho) */}
          {record.status === 'draft' && (
            <Popconfirm
              title="Xác nhận đơn hàng này?"
              description="Đơn hàng sẽ được duyệt. Tồn kho chưa thay đổi — chỉ cộng khi nhận hàng."
              onConfirm={() => handleConfirm(record.id)}
              okText="Xác nhận"
              cancelText="Không"
            >
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                Xác nhận
              </Button>
            </Popconfirm>
          )}

          {/* confirmed → received (nhận hàng + CỘNG TỒN KHO) */}
          {record.status === 'confirmed' && (
            <Popconfirm
              title="Xác nhận đã nhận hàng & nhập kho?"
              description="Tồn kho sẽ được cộng thêm theo số lượng trong phiếu. Giá mua nguyên liệu sẽ được cập nhật."
              onConfirm={() => handleReceived(record.id)}
              okText="Nhận hàng & Nhập kho"
              cancelText="Chưa nhận"
            >
              <Button size="small" type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} icon={<CheckCircleOutlined />}>
                Nhận hàng & Nhập kho
              </Button>
            </Popconfirm>
          )}

          {/* draft | confirmed → cancelled (huỷ — tồn kho không bị ảnh hưởng vì chưa nhận hàng) */}
          {(record.status === 'draft' || record.status === 'confirmed') && (
            <Popconfirm
              title="Huỷ phiếu nhập này?"
              description="Phiếu sẽ bị huỷ vĩnh viễn. Tồn kho không bị ảnh hưởng vì chưa nhận hàng."
              onConfirm={() => handleCancel(record.id)}
              okText="Huỷ phiếu"
              cancelText="Giữ lại"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Huỷ
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [viewDetail, handleConfirm, handleReceived, handleCancel]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Nhập hàng / Mua nguyên liệu
        </Title>
        <Space>
          <Tooltip title="Xem hướng dẫn trạng thái phiếu nhập">
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => setShowStatusGuide(true)}
            >
              Hướng dẫn trạng thái
            </Button>
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setFormDirty(false);
              setSelectedItemMap({});
              setMinimized(false);
              sessionStorage.removeItem(DRAFT_STORAGE_KEY);
              setModalOpen(true);
            }}
            style={{ backgroundColor: '#8B6914' }}
          >
            Tạo phiếu nhập
          </Button>
        </Space>
      </div>

      {/* ============ Bộ lọc ============ */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          {/* Lọc trạng thái - tabs */}
          <Col xs={24} lg={12}>
            <Space size={4} wrap>
              <FilterOutlined style={{ color: '#999', marginRight: 4 }} />
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'draft', label: '📝 Nháp' },
                { key: 'confirmed', label: '✅ Đã xác nhận' },
                { key: 'received', label: '📦 Đã nhận' },
                { key: 'cancelled', label: '❌ Đã huỷ' },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="small"
                  type={filterStatus === tab.key ? 'primary' : 'default'}
                  onClick={() => setFilterStatus(tab.key)}
                  style={filterStatus === tab.key ? { backgroundColor: '#8B6914', borderColor: '#8B6914' } : {}}
                >
                  {tab.label}
                  {statusCounts[tab.key] !== undefined && (
                    <Badge
                      count={statusCounts[tab.key]}
                      size="small"
                      style={{
                        marginLeft: 6,
                        backgroundColor: filterStatus === tab.key ? '#fff' : '#8B6914',
                        color: filterStatus === tab.key ? '#8B6914' : '#fff',
                        boxShadow: 'none',
                      }}
                    />
                  )}
                </Button>
              ))}
            </Space>
          </Col>

          {/* Tìm kiếm + ngày */}
          <Col xs={24} sm={12} lg={7}>
            <Input
              placeholder="Tìm mã phiếu, NCC, ghi chú..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              allowClear
              size="small"
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Space size={4} style={{ width: '100%' }}>
              <RangePicker
                size="small"
                style={{ width: '100%' }}
                placeholder={['Từ ngày', 'Đến ngày']}
                format="DD/MM/YYYY"
                value={filterDateRange}
                onChange={(dates) => setFilterDateRange(dates)}
                allowClear
              />
              {hasActiveFilters && (
                <Tooltip title="Xoá tất cả bộ lọc">
                  <Button
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={clearAllFilters}
                    danger
                    type="text"
                  />
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>

        {/* Kết quả filter */}
        {hasActiveFilters && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            Hiển thị <strong style={{ color: '#8B6914' }}>{filteredPOs.length}</strong> / {purchaseOrders.length} phiếu nhập
          </div>
        )}
      </Card>

      <Card>
        {isMobile ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : filteredPOs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              {hasActiveFilters ? 'Không tìm thấy phiếu nhập phù hợp' : 'Chưa có phiếu nhập nào'}
            </div>
          ) : (
            <>
              {filteredPOs.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE).map((po) => (
                <div key={po.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13, color: '#333' }}>{po.poNumber}</strong>
                    <Tag color={poStatusMap[po.status]?.color} style={{ margin: 0, fontSize: 11 }}>{poStatusMap[po.status]?.label}</Tag>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>NCC: {po.supplier?.name || '-'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{formatDateTime(po.createdAt)}</span>
                    <strong style={{ fontSize: 15, color: '#8B6914' }}>{formatCurrency(po.totalCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #f5f5f5', paddingTop: 6 }}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(po)}>Chi tiết</Button>

                    {/* draft -> confirmed */}
                    {po.status === 'draft' && (
                      <Popconfirm
                        title="Xác nhận đơn hàng này?"
                        description="Đơn hàng sẽ được duyệt. Tồn kho chưa thay đổi — chỉ cộng khi nhận hàng."
                        onConfirm={() => handleConfirm(po.id)}
                        okText="Xác nhận"
                        cancelText="Không"
                      >
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />}>Xác nhận</Button>
                      </Popconfirm>
                    )}

                    {/* confirmed -> received */}
                    {po.status === 'confirmed' && (
                      <Popconfirm
                        title="Xác nhận đã nhận hàng & nhập kho?"
                        description="Tồn kho sẽ được cộng thêm theo số lượng trong phiếu. Giá mua nguyên liệu sẽ được cập nhật."
                        onConfirm={() => handleReceived(po.id)}
                        okText="Nhận hàng & Nhập kho"
                        cancelText="Chưa nhận"
                      >
                        <Button size="small" type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} icon={<CheckCircleOutlined />}>Nhận hàng</Button>
                      </Popconfirm>
                    )}

                    {/* draft | confirmed -> cancelled */}
                    {(po.status === 'draft' || po.status === 'confirmed') && (
                      <Popconfirm
                        title="Huỷ phiếu nhập này?"
                        description="Phiếu sẽ bị huỷ vĩnh viễn. Tồn kho không bị ảnh hưởng vì chưa nhận hàng."
                        onConfirm={() => handleCancel(po.id)}
                        okText="Huỷ phiếu"
                        cancelText="Giữ lại"
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>Huỷ</Button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              ))}

              {/* Mobile pagination */}
              {filteredPOs.length > MOBILE_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 8 }}>
                  <Button
                    size="small"
                    disabled={mobilePage <= 1}
                    onClick={() => setMobilePage((p) => p - 1)}
                  >
                    ← Trước
                  </Button>
                  <span style={{ fontSize: 13, color: '#666' }}>
                    {mobilePage} / {Math.ceil(filteredPOs.length / MOBILE_PAGE_SIZE)}
                  </span>
                  <Button
                    size="small"
                    disabled={mobilePage >= Math.ceil(filteredPOs.length / MOBILE_PAGE_SIZE)}
                    onClick={() => setMobilePage((p) => p + 1)}
                  >
                    Sau →
                  </Button>
                </div>
              )}
            </>
          )
        ) : (
          <Table
            columns={columns}
            dataSource={filteredPOs}
            rowKey="id"
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: filteredPOs.length,
              onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} phiếu`,
            }}
            locale={{ emptyText: hasActiveFilters ? 'Không tìm thấy phiếu nhập phù hợp' : 'Chưa có phiếu nhập nào' }}
          />
        )}
      </Card>

      {/* ============ Floating badge: phiếu nháp đang thu nhỏ ============ */}
      {minimized && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            animation: 'po-float 2s ease-in-out infinite',
          }}
        >
          <style>{`
            @keyframes po-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
          `}</style>
          <Badge count="Nháp" offset={[-8, 0]}>
            <Button
              type="primary"
              size="large"
              icon={<EditOutlined />}
              onClick={handleRestore}
              style={{
                backgroundColor: '#8B6914',
                borderColor: '#8B6914',
                borderRadius: 24,
                height: 48,
                paddingLeft: 20,
                paddingRight: 20,
                boxShadow: '0 4px 16px rgba(139, 105, 20, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Tiếp tục phiếu nhập
            </Button>
          </Badge>
        </div>
      )}

      {/* ============ Modal tạo phiếu nhập mới ============ */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 24 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Tạo phiếu nhập mới</div>
              <div style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
                Tạo phiếu nhập nguyên liệu từ nhà cung cấp vào kho
              </div>
            </div>
            {formDirty && (
              <Tooltip title="Thu nhỏ — lưu nháp để thêm nguyên liệu mới rồi quay lại">
                <Button
                  type="text"
                  size="small"
                  icon={<MinusOutlined />}
                  onClick={handleMinimize}
                  style={{ marginTop: 2, color: '#8B6914' }}
                />
              </Tooltip>
            )}
          </div>
        }
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText="Tạo phiếu"
        cancelText="Huỷ"
        width={960}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        destroyOnClose={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          onValuesChange={() => setFormDirty(true)}
        >
          {/* — Nhà cung cấp — */}
          <Form.Item
            name="supplierId"
            label={
              <span>
                Nhà cung cấp{' '}
                <Tooltip title="Chọn nhà cung cấp cho lô hàng nhập này. Chỉ hiển thị NCC đang hoạt động.">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </span>
            }
          >
            <Select
              placeholder="Chọn nhà cung cấp (không bắt buộc)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>

          {/* — Ghi chú — */}
          <Form.Item
            name="notes"
            label={
              <span>
                Ghi chú đơn hàng{' '}
                <Tooltip title="Ghi chú thêm cho phiếu nhập (VD: hàng giao trước 10h, thanh toán khi nhận...)">
                  <QuestionCircleOutlined style={{ color: '#999' }} />
                </Tooltip>
              </span>
            }
          >
            <Input.TextArea rows={2} placeholder="VD: Hàng giao trước 10h sáng, thanh toán chuyển khoản..." />
          </Form.Item>

          {/* — Nguyên liệu nhập — */}
          <Divider style={{ margin: '16px 0 12px' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Nguyên liệu nhập{' '}
              <Tooltip title="Thêm các nguyên liệu cần nhập. Nguyên liệu đã chọn sẽ tự động ẩn khỏi danh sách. Đơn giá sẽ được tự động điền từ giá mua gần nhất.">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </span>
          </Divider>

          {/* Nút nhập nhanh NL thiếu */}
          {lowStockIngredients.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 12 }}
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span>
                    Có <strong>{lowStockIngredients.length}</strong> nguyên liệu đang thiếu/hết hàng
                  </span>
                  <Button
                    size="small"
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={handleQuickAddLowStock}
                    style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                  >
                    Thêm nhanh NL thiếu
                  </Button>
                </div>
              }
            />
          )}

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Form.Item shouldUpdate={(prev, cur) => prev.items !== cur.items} noStyle key={key}>
                    {() => (
                      <ItemRow
                        name={name}
                        rest={rest}
                        ingredientOptions={buildIngredientOptions(name)}
                        supplyOptions={buildSupplyOptions(name)}
                        equipmentOptions={buildEquipmentOptions(name)}
                        onItemChange={handleItemChange}
                        onItemTypeChange={handleItemTypeChange}
                        onRemove={remove}
                        getSelectedUnit={getSelectedUnit}
                        form={form}
                      />
                    )}
                  </Form.Item>
                ))}

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    style={{ flex: '1 1 auto' }}
                    icon={<PlusOutlined />}
                  >
                    Thêm dòng
                  </Button>
                  <Tooltip title="Dán danh sách hàng từ Excel">
                    <Button
                      type="dashed"
                      onClick={handleBulkPasteOpen}
                      icon={<CopyOutlined />}
                      style={{ color: '#1677ff', borderColor: '#1677ff' }}
                    >
                      Dán từ Excel
                    </Button>
                  </Tooltip>
                  <Tooltip title="Tạo nguyên liệu, vật tư hoặc dụng cụ mới">
                    <Button
                      type="dashed"
                      onClick={handleOpenDrawer}
                      icon={<PlusOutlined />}
                      style={{ color: '#8B6914', borderColor: '#8B6914' }}
                    >
                      Tạo mới
                    </Button>
                  </Tooltip>
                </div>
              </>
            )}
          </Form.List>

          {/* — Tổng cộng — */}
          <Form.Item shouldUpdate>
            {() => {
              const items = form.getFieldValue('items') || [];
              const total = items.reduce((sum: number, item: any) => {
                if (!item) return sum;
                return sum + (item.quantity || 0) * (item.unitPrice || 0);
              }, 0);
              const itemCount = items.filter((i: any) => i?.ingredientId || i?.supplyId || i?.equipmentId).length;

              if (itemCount === 0) return null;

              return (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #fdfcfb 0%, #f5f0e6 100%)',
                    borderRadius: 8,
                    border: '1px solid #e8dcc8',
                  }}
                >
                  <Text style={{ color: '#666' }}>
                    {itemCount} mặt hàng
                  </Text>
                  <div style={{ textAlign: 'right' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>Tổng ước tính</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#8B6914' }}>
                      {formatCurrency(total)}
                    </div>
                  </div>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* ============ Drawer: Tạo nguyên liệu / vật tư / dụng cụ nhanh ============ */}
      <Drawer
        title={`Tạo ${drawerCategoryLabels[drawerCategory]} mới`}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          drawerForm.resetFields();
          setDrawerImageList([]);
          setDrawerImageUrl('');
          setDrawerCategory('ingredient');
        }}
        extra={
          <Button
            type="primary"
            onClick={() => drawerForm.submit()}
            loading={drawerSubmitting}
            style={{ backgroundColor: '#8B6914' }}
          >
            Tạo {drawerCategoryLabels[drawerCategory]}
          </Button>
        }
      >
        {/* Chọn loại */}
        <div style={{ marginBottom: 16 }}>
          <Segmented
            block
            value={drawerCategory}
            onChange={handleDrawerCategoryChange}
            options={drawerCategorySegments}
          />
        </div>

        <Alert
          message={
            drawerCategory === 'ingredient'
              ? 'Nguyên liệu mới sẽ xuất hiện ngay trong danh sách chọn của phiếu nhập.'
              : drawerCategory === 'supply'
              ? 'Vật tư mới sẽ xuất hiện trong mục Vật tư tiêu hao.'
              : 'Dụng cụ mới sẽ xuất hiện trong mục Dụng cụ.'
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={drawerForm} layout="vertical" onFinish={handleDrawerSubmit}>
          {/* Tên - chung cho tất cả */}
          <Form.Item
            name="name"
            label={`Tên ${drawerCategoryLabels[drawerCategory]}`}
            rules={[{ required: true, message: 'Nhập tên' }]}
          >
            <Input placeholder={
              drawerCategory === 'ingredient' ? 'VD: Bột mì, Đường, Bơ...' :
              drawerCategory === 'supply' ? 'VD: Hộp đựng bánh, Túi zip...' :
              'VD: Khuôn bánh, Máy đánh trứng...'
            } />
          </Form.Item>

          {/* === Fields cho Nguyên liệu === */}
          {drawerCategory === 'ingredient' && (
            <>
              <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
                <Select options={unitOptions} placeholder="Chọn đơn vị" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="currentStock" label="Tồn kho hiện tại" initialValue={0} style={{ flex: 1 }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="minStock" label="Tồn kho tối thiểu" initialValue={0} style={{ flex: 1 }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </div>
              <Form.Item name="costPerUnit" label="Giá mỗi đơn vị (VNĐ)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            </>
          )}

          {/* === Fields cho Vật tư tiêu hao === */}
          {drawerCategory === 'supply' && (
            <>
              <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
                <Select options={supplyUnitOptions} placeholder="Chọn đơn vị" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="currentStock" label="Tồn kho hiện tại" initialValue={0} style={{ flex: 1 }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="minStock" label="Tồn kho tối thiểu" initialValue={0} style={{ flex: 1 }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </div>
              <Form.Item name="costPerUnit" label="Giá mỗi đơn vị (VNĐ)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
              </Form.Item>
            </>
          )}

          {/* === Fields cho Dụng cụ === */}
          {drawerCategory === 'equipment' && (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="quantity" label="Số lượng" initialValue={1} style={{ flex: 1 }} rules={[{ required: true, message: 'Nhập SL' }]}>
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
                <Form.Item name="condition" label="Tình trạng" initialValue="good" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn tình trạng' }]}>
                  <Select options={conditionOptions} />
                </Form.Item>
              </div>
              <Form.Item name="purchasePrice" label="Giá mua (VNĐ)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} step={1000} />
              </Form.Item>
              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm (không bắt buộc)" />
              </Form.Item>
            </>
          )}

          {/* Upload ảnh - chung cho tất cả */}
          <Form.Item label={`Hình ảnh (${drawerImageList.length}/3)`}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => { handleDrawerUpload(file); return false; }}
              disabled={drawerImageList.length >= 3}
            >
              <Button
                icon={<UploadOutlined />}
                loading={drawerUploading}
                disabled={drawerImageList.length >= 3}
                block
              >
                {drawerUploading ? 'Đang tải...' : 'Chọn ảnh'}
              </Button>
            </Upload>
            {drawerImageList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {drawerImageList.map((url) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      border: drawerImageUrl === url ? '2px solid #8B6914' : '1px solid #eee',
                      borderRadius: 8,
                      padding: 2,
                    }}
                  >
                    <Image
                      src={getFullImageUrl(url)}
                      alt="img"
                      width={72}
                      height={72}
                      style={{ borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'center', marginTop: 2 }}>
                      {drawerImageUrl === url ? (
                        <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>Đại diện</Tag>
                      ) : (
                        <Button
                          type="link"
                          size="small"
                          style={{ fontSize: 10, padding: 0 }}
                          onClick={() => {
                            setDrawerImageUrl(url);
                            drawerForm.setFieldsValue({ imageUrl: url });
                          }}
                        >
                          Đặt đại diện
                        </Button>
                      )}
                      <Button
                        type="link"
                        danger
                        size="small"
                        style={{ fontSize: 10, padding: 0, marginLeft: 4 }}
                        onClick={() => handleDrawerRemoveImage(url)}
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item name="imageUrl" hidden><Input /></Form.Item>
          <Form.Item name="images" hidden><Input /></Form.Item>
        </Form>
      </Drawer>

      {/* ============ Modal: Dán từ Excel ============ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CopyOutlined style={{ color: '#1677ff' }} />
            <span>Dán từ Excel</span>
          </div>
        }
        open={bulkPasteOpen}
        onCancel={() => setBulkPasteOpen(false)}
        width={isMobile ? '100%' : (bulkPasteStep === 0 ? 520 : 900)}
        style={isMobile ? { top: 16, maxWidth: '100vw', paddingBottom: 0 } : undefined}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            {bulkPasteStep === 0 ? (
              <>
                <Button onClick={() => setBulkPasteOpen(false)}>Huỷ</Button>
                <Button type="primary" onClick={handleBulkPasteParse} block={isMobile}>Xem trước</Button>
              </>
            ) : (
              <>
                <Button onClick={() => setBulkPasteStep(0)}>← Quay lại</Button>
                <Button
                  type="primary"
                  onClick={handleBulkPasteAddToForm}
                  disabled={bulkPasteSelectedCount === 0}
                  block={isMobile}
                >
                  Thêm {bulkPasteSelectedCount} mục vào phiếu
                </Button>
              </>
            )}
          </div>
        }
      >
        <Steps
          current={bulkPasteStep}
          size="small"
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ marginBottom: 16 }}
          items={[{ title: 'Dán dữ liệu' }, { title: 'Xem trước & chọn' }]}
        />

        {bulkPasteStep === 0 ? (
          <>
            {/* Hướng dẫn nhanh */}
            <div style={{ marginBottom: 14, padding: '12px 14px', background: '#f0f7ff', borderRadius: 10, border: '1px solid #bad6ff' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                Hướng dẫn nhanh
              </div>

              {/* Các bước */}
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8, marginBottom: 12 }}>
                <div><strong>1.</strong> Mở file Excel chứa danh sách hàng cần nhập</div>
                <div><strong>2.</strong> Bôi đen các dòng, bấm <Tag style={{ fontSize: 11, padding: '0 6px', margin: '0 2px' }}>Ctrl+C</Tag></div>
                <div><strong>3.</strong> Bấm vào ô bên dưới, bấm <Tag style={{ fontSize: 11, padding: '0 6px', margin: '0 2px' }}>Ctrl+V</Tag></div>
              </div>

              {/* Format hỗ trợ */}
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
                <strong>Format hỗ trợ:</strong> Tên | Số lượng | Đơn giá | <span style={{ color: '#1677ff' }}>Loại</span>
              </div>

              {/* Loại */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <Tag color="blue" style={{ fontSize: 11 }}><strong>NL</strong> = Nguyên liệu</Tag>
                <Tag color="orange" style={{ fontSize: 11 }}><strong>VT</strong> = Vật tư</Tag>
                <Tag color="green" style={{ fontSize: 11 }}><strong>DC</strong> = Dụng cụ</Tag>
              </div>

              {/* Bảng ví dụ */}
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' }}>Ví dụ:</div>
              <div style={{ overflowX: 'auto', background: '#1e1e1e', borderRadius: 6, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#d4d4d4', lineHeight: 1.7, whiteSpace: 'pre' }}>
{`Baking soda - 100g   5     28,000   NL
Cuộn mica bao bánh   2     61,000   VT
Bộ muỗng đo lường    1     30,000   DC
Bánh Marie 120g      10    15,000`}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Cột Loại & STT không bắt buộc. Dòng tiêu đề tự bỏ qua.
                </div>
                <Button
                  size="small"
                  type="link"
                  style={{ fontSize: 11, padding: 0 }}
                  onClick={() => setBulkPasteText(`Baking soda - 100g\t5\t28000\tNL\nCuộn mica bao bánh 6cm - 1kg\t2\t61000\tVT\nBộ muỗng đo lường\t1\t30000\tDC\nBánh Marie 120g\t10\t15000\nSữa tươi 1L\t5\t32000\tNL`)}
                >
                  Dán dữ liệu mẫu
                </Button>
              </div>
            </div>

            {/* Textarea */}
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#666' }}>
              Dán dữ liệu vào đây:
            </div>
            <Input.TextArea
              rows={isMobile ? 6 : 8}
              placeholder="Dán dữ liệu từ Excel vào đây..."
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </>
        ) : (
          <>
            {bulkPasteUnmatchedCount > 0 && (
              <Alert
                message={`${bulkPasteUnmatchedCount} mục không tìm thấy trong kho.`}
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <div style={{ marginBottom: 8 }}>
              <Checkbox
                checked={bulkPasteRows.filter((r) => r.matchScore !== 'none').every((r) => r.selected)}
                indeterminate={
                  bulkPasteRows.filter((r) => r.matchScore !== 'none').some((r) => r.selected) &&
                  !bulkPasteRows.filter((r) => r.matchScore !== 'none').every((r) => r.selected)
                }
                onChange={(e) => handleBulkPasteToggleAll(e.target.checked)}
              >
                Chọn tất cả ({bulkPasteSelectedCount}/{bulkPasteRows.filter((r) => r.matchScore !== 'none').length})
              </Checkbox>
            </div>

            {/* Mobile: card list */}
            {isMobile ? (
              <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {bulkPasteRows.map((record) => {
                  const catInfo = bulkCategoryLabels[record.category];
                  const isDisabled = record.matchScore === 'none' && !record.matchedId;
                  return (
                    <div
                      key={record.key}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 8,
                        background: record.selected && !isDisabled ? '#fff' : '#fafafa',
                        border: `1px solid ${record.selected && !isDisabled ? '#d9d9d9' : '#f0f0f0'}`,
                        borderRadius: 8,
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Checkbox
                          checked={record.selected}
                          disabled={isDisabled}
                          onChange={() => handleBulkPasteToggleRow(record.key)}
                        />
                        <div style={{ flex: 1, fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {record.name}
                        </div>
                        <Tag color={catInfo.color} style={{ margin: 0, fontSize: 11 }}>{catInfo.tag}</Tag>
                      </div>
                      {/* Match status */}
                      <div style={{ marginBottom: 6, paddingLeft: 30 }}>
                        <Select
                          size="small"
                          placeholder="Chọn mặt hàng..."
                          showSearch
                          optionFilterProp="label"
                          options={
                            record.category === 'ingredient' ? ingredients.map((i) => ({ value: i.id, label: i.name })) :
                            record.category === 'supply' ? allSupplies.map((s) => ({ value: s.id, label: s.name })) :
                            allEquipment.map((e) => ({ value: e.id, label: e.name }))
                          }
                          style={{ width: '100%' }}
                          value={record.matchedId || undefined}
                          onChange={(val) => handleBulkPasteChangeMatch(record.key, val, record.category)}
                          allowClear
                          status={record.matchScore === 'none' && !record.matchedId ? 'warning' : undefined}
                        />
                        {record.matchScore === 'exact' && (
                          <div style={{ fontSize: 11, color: '#52c41a', marginTop: 2 }}>✅ Khớp chính xác</div>
                        )}
                        {record.matchScore === 'partial' && (
                          <div style={{ fontSize: 11, color: '#faad14', marginTop: 2 }}>⚠️ Khớp gần đúng</div>
                        )}
                        {record.matchScore === 'none' && !record.matchedId && (
                          <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2 }}>❌ Chưa khớp</div>
                        )}
                      </div>
                      {/* SL + Giá */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 30, fontSize: 12, color: '#666' }}>
                        <span>SL: {record.quantity.toLocaleString('vi-VN')} × {formatCurrency(record.unitPrice)}</span>
                        <strong style={{ color: '#8B6914' }}>{formatCurrency(record.quantity * record.unitPrice)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop: table */
              <Table
                dataSource={bulkPasteRows}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
                columns={[
                  {
                    title: '',
                    key: 'selected',
                    width: 40,
                    render: (_: any, record: BulkPasteRow) => (
                      <Checkbox
                        checked={record.selected}
                        disabled={record.matchScore === 'none' && !record.matchedId}
                        onChange={() => handleBulkPasteToggleRow(record.key)}
                      />
                    ),
                  },
                  {
                    title: 'Tên (từ Excel)',
                    dataIndex: 'name',
                    width: 180,
                    ellipsis: true,
                  },
                  {
                    title: 'Loại',
                    dataIndex: 'category',
                    width: 60,
                    render: (cat: BulkItemCategory) => {
                      const c = bulkCategoryLabels[cat];
                      return <Tag color={c.color} style={{ margin: 0 }}>{c.tag}</Tag>;
                    },
                  },
                  {
                    title: 'Khớp với',
                    key: 'match',
                    width: 240,
                    render: (_: any, record: BulkPasteRow) => {
                      const options = record.category === 'ingredient'
                        ? ingredients.map((i) => ({ value: i.id, label: i.name }))
                        : record.category === 'supply'
                        ? allSupplies.map((s) => ({ value: s.id, label: s.name }))
                        : allEquipment.map((e) => ({ value: e.id, label: e.name }));
                      return (
                        <div>
                          <Select
                            size="small"
                            placeholder="Chọn mặt hàng..."
                            showSearch
                            optionFilterProp="label"
                            options={options}
                            style={{ width: '100%' }}
                            value={record.matchedId || undefined}
                            onChange={(val) => handleBulkPasteChangeMatch(record.key, val, record.category)}
                            allowClear
                            status={record.matchScore === 'none' && !record.matchedId ? 'warning' : undefined}
                          />
                          {record.matchScore === 'exact' && (
                            <div style={{ fontSize: 11, color: '#52c41a', marginTop: 2 }}>✅ Khớp chính xác</div>
                          )}
                          {record.matchScore === 'partial' && (
                            <div style={{ fontSize: 11, color: '#faad14', marginTop: 2 }}>⚠️ Khớp gần đúng</div>
                          )}
                          {record.matchScore === 'none' && !record.matchedId && (
                            <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2 }}>❌ Chưa khớp — chọn thủ công</div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    title: 'SL',
                    dataIndex: 'quantity',
                    width: 65,
                    render: (v: number) => v.toLocaleString('vi-VN'),
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'unitPrice',
                    width: 95,
                    render: (v: number) => formatCurrency(v),
                  },
                  {
                    title: 'Thành tiền',
                    key: 'subtotal',
                    width: 105,
                    render: (_: any, record: BulkPasteRow) => (
                      <strong style={{ color: '#8B6914' }}>
                        {formatCurrency(record.quantity * record.unitPrice)}
                      </strong>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}
      </Modal>

      {/* ============ Modal hướng dẫn trạng thái ============ */}
      <Modal
        title={
          <div>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#8B6914' }} />
            Hướng dẫn trạng thái phiếu nhập hàng
          </div>
        }
        open={showStatusGuide}
        onCancel={() => setShowStatusGuide(false)}
        footer={
          <Button type="primary" onClick={() => setShowStatusGuide(false)} style={{ backgroundColor: '#8B6914' }}>
            Đã hiểu
          </Button>
        }
        width={640}
      >
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f9f7f2', borderRadius: 8, border: '1px solid #e8dcc8' }}>
          <Text style={{ color: '#666' }}>
            Mỗi phiếu nhập hàng sẽ trải qua các trạng thái dưới đây. Hiểu rõ từng trạng thái giúp bạn quản lý nhập kho chính xác hơn.
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(STATUS_DETAILS).map(([key, detail]) => (
            <div
              key={key}
              style={{
                padding: '16px',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{detail.icon}</span>
                <Tag color={detail.color} style={{ fontSize: 14, padding: '2px 12px' }}>
                  {detail.label}
                </Tag>
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
                {detail.description}
              </div>
              <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                <ThunderboltOutlined style={{ marginRight: 4 }} />
                {detail.actions}
              </div>
            </div>
          ))}
        </div>

        <Divider style={{ margin: '16px 0 12px' }} />
        <div style={{ fontSize: 12, color: '#999' }}>
          <strong>Quy trình:</strong> 📝 Nháp → ✅ Xác nhận đơn (chờ NCC giao) → 📦 Nhận hàng &amp; Nhập kho (cộng tồn kho)
        </div>
      </Modal>

      {/* ============ Modal chi tiết phiếu nhập ============ */}
      <Modal
        title={`Chi tiết phiếu nhập: ${selectedPO?.poNumber || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {selectedPO && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã phiếu">{selectedPO.poNumber}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={poStatusMap[selectedPO.status]?.color}>
                  {poStatusMap[selectedPO.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="NCC">{selectedPO.supplier?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tổng chi phí">
                <strong style={{ color: '#8B6914' }}>{formatCurrency(selectedPO.totalCost)}</strong>
              </Descriptions.Item>
            </Descriptions>
            <Divider>Danh sách hàng nhập</Divider>
            {isMobile ? (
              /* Mobile: Card list */
              <>
                {selectedPO.items.map((item: any) => {
                  const itemType = item.itemType || 'ingredient';
                  const itemName = itemType === 'ingredient' ? item.ingredient?.name
                    : itemType === 'supply' ? item.supply?.name
                    : item.equipment?.name;
                  const itemUnit = itemType === 'ingredient' ? item.ingredient?.unit
                    : itemType === 'supply' ? item.supply?.unit
                    : 'cái';
                  const imgUrl = itemType === 'ingredient' ? item.ingredient?.imageUrl
                    : itemType === 'supply' ? item.supply?.imageUrl
                    : item.equipment?.imageUrl;
                  const typeTag = itemType === 'ingredient' ? { label: 'NL', color: 'blue' }
                    : itemType === 'supply' ? { label: 'VT', color: 'orange' }
                    : { label: 'DC', color: 'green' };
                  return (
                    <div key={item.id} style={{
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <img
                          src={getFullImageUrl(imgUrl) || PLACEHOLDER_IMG}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                        />
                        <div style={{ flex: 1 }}>
                          <Tag color={typeTag.color} style={{ fontSize: 10 }}>{typeTag.label}</Tag>
                          <strong style={{ fontSize: 13 }}>{itemName}</strong>
                          <Tag style={{ marginLeft: 6, fontSize: 10 }}>{itemUnit}</Tag>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                        <span>{Number(item.quantity).toLocaleString()} × {formatCurrency(item.unitPrice)}</span>
                        <strong style={{ color: '#8B6914' }}>{formatCurrency(item.subtotal)}</strong>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <Table
                dataSource={selectedPO.items}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Ảnh',
                    key: 'image',
                    width: 50,
                    render: (_: any, record: any) => {
                      const itemType = record.itemType || 'ingredient';
                      const imgUrl = itemType === 'ingredient' ? record.ingredient?.imageUrl
                        : itemType === 'supply' ? record.supply?.imageUrl
                        : record.equipment?.imageUrl;
                      return (
                        <img
                          src={getFullImageUrl(imgUrl) || PLACEHOLDER_IMG}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                        />
                      );
                    },
                  },
                  {
                    title: 'Tên',
                    key: 'name',
                    render: (_: any, record: any) => {
                      const itemType = record.itemType || 'ingredient';
                      const name = itemType === 'ingredient' ? record.ingredient?.name
                        : itemType === 'supply' ? record.supply?.name
                        : record.equipment?.name;
                      const typeTag = itemType === 'ingredient' ? { label: 'NL', color: 'blue' }
                        : itemType === 'supply' ? { label: 'VT', color: 'orange' }
                        : { label: 'DC', color: 'green' };
                      return (
                        <span>
                          <Tag color={typeTag.color} style={{ fontSize: 10 }}>{typeTag.label}</Tag>
                          {name || '—'}
                        </span>
                      );
                    },
                  },
                  {
                    title: 'Đơn vị',
                    key: 'unit',
                    render: (_: any, record: any) => {
                      const itemType = record.itemType || 'ingredient';
                      if (itemType === 'ingredient') return record.ingredient?.unit || '';
                      if (itemType === 'supply') return record.supply?.unit || '';
                      return 'cái';
                    },
                  },
                  { title: 'Số lượng', dataIndex: 'quantity', render: (v: number) => Number(v).toLocaleString() },
                  { title: 'Đơn giá', dataIndex: 'unitPrice', render: (v: number) => formatCurrency(v) },
                  { title: 'Thành tiền', dataIndex: 'subtotal', render: (v: number) => formatCurrency(v) },
                ]}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

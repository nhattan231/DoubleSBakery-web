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
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, ingredientsApi, uploadApi } from '@/lib/api';
import { usePurchaseOrdersQuery, useAllIngredientsQuery, useActiveSuppliersQuery } from '@/lib/hooks';
import { formatCurrency, formatDateTime, formatDate, poStatusMap } from '@/lib/format';
import type { PurchaseOrder, Ingredient, Supplier } from '@/types';

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

// ============================================================
// Sub-component: Mỗi dòng nguyên liệu trong form
// ============================================================
interface IngredientRowProps {
  name: number;
  rest: any;
  ingredientOptions: { value: string; label: string; ingredient: Ingredient }[];
  onIngredientChange: (name: number, ingredientId: string) => void;
  onRemove: (name: number) => void;
  getSelectedUnit: (name: number) => string;
  form: any;
}

function IngredientRow({
  name,
  rest,
  ingredientOptions,
  onIngredientChange,
  onRemove,
  getSelectedUnit,
  form,
}: IngredientRowProps) {
  const unit = getSelectedUnit(name);

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
      {/* Nguyên liệu */}
      <Form.Item
        {...rest}
        name={[name, 'ingredientId']}
        rules={[{ required: true, message: 'Chọn nguyên liệu' }]}
        style={{ flex: '1 1 220px', minWidth: 220, marginBottom: 8 }}
      >
        <Select
          placeholder="Tìm nguyên liệu..."
          showSearch
          optionFilterProp="label"
          onChange={(val) => onIngredientChange(name, val)}
          options={ingredientOptions}
          optionRender={(option) => {
            const ing = option.data.ingredient as Ingredient;
            if (!ing) return option.label;
            const isLow = ing.currentStock <= ing.minStock;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <img
                  src={getFullImageUrl(ing.imageUrl) || PLACEHOLDER_IMG}
                  alt={ing.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    objectFit: 'cover',
                    border: '1px solid #f0f0f0',
                    flexShrink: 0,
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ing.name}
                  </div>
                  <div style={{ fontSize: 12, color: isLow ? '#ff4d4f' : '#999' }}>
                    {isLow && <WarningOutlined style={{ marginRight: 4 }} />}
                    Tồn: {Number(ing.currentStock).toLocaleString('vi-VN')} {ing.unit}
                    {isLow && ' (thiếu)'}
                  </div>
                </div>
              </div>
            );
          }}
          labelRender={(props) => {
            const ing = ingredientOptions.find((o) => o.value === props.value)?.ingredient;
            if (!ing) return props.label;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img
                  src={getFullImageUrl(ing.imageUrl) || PLACEHOLDER_IMG}
                  alt={ing.name}
                  style={{ width: 22, height: 22, borderRadius: 3, objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                />
                <span>{ing.name} ({ing.unit})</span>
              </div>
            );
          }}
        />
      </Form.Item>

      {/* Số lượng */}
      <Form.Item
        {...rest}
        name={[name, 'quantity']}
        rules={[{ required: true, message: 'Nhập SL' }]}
        style={{ width: 140, marginBottom: 8 }}
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
        style={{ width: 160, marginBottom: 8 }}
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
      <Form.Item shouldUpdate style={{ width: 130, marginBottom: 8 }}>
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
  const [selectedIngredientMap, setSelectedIngredientMap] = useState<Record<number, string>>({});

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

  // Drawer tạo nguyên liệu nhanh
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // ========== Handlers ==========
  const handleIngredientChange = useCallback(
    (fieldName: number, ingredientId: string) => {
      const ing = ingredientMap.get(ingredientId);
      if (!ing) return;

      setSelectedIngredientMap((prev) => ({ ...prev, [fieldName]: ingredientId }));

      const items = form.getFieldValue('items') || [];
      if (items[fieldName] && !items[fieldName].unitPrice && ing.costPerUnit > 0) {
        const newItems = [...items];
        newItems[fieldName] = { ...newItems[fieldName], unitPrice: Number(ing.costPerUnit) };
        form.setFieldsValue({ items: newItems });
      }

      setFormDirty(true);
    },
    [ingredientMap, form],
  );

  const getSelectedUnit = useCallback(
    (fieldName: number) => {
      const items = form.getFieldValue('items') || [];
      const ingId = items[fieldName]?.ingredientId || selectedIngredientMap[fieldName];
      if (!ingId) return '';
      return ingredientMap.get(ingId)?.unit || '';
    },
    [ingredientMap, selectedIngredientMap, form],
  );

  const handleCreate = useCallback(async (values: any) => {
    setSubmitting(true);
    try {
      const poData = {
        supplierId: values.supplierId,
        notes: values.notes,
        items: values.items.map((item: any) => ({
          ingredientId: item.ingredientId,
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
      setSelectedIngredientMap({});
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
          setSelectedIngredientMap({});
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        },
        onCancel: () => {
          handleMinimize();
        },
      });
    } else {
      setModalOpen(false);
      form.resetFields();
      setSelectedIngredientMap({});
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
      const res = await ingredientsApi.create(values);
      const newIngredient: Ingredient = res.data.data;
      message.success(`Đã tạo nguyên liệu "${values.name}" thành công`);

      // Refresh danh sách ingredients
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] });

      // Đóng drawer
      setDrawerOpen(false);
      drawerForm.resetFields();
      setDrawerImageList([]);
      setDrawerImageUrl('');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Tạo nguyên liệu thất bại');
    } finally {
      setDrawerSubmitting(false);
    }
  }, [drawerForm, queryClient]);

  const handleOpenDrawer = useCallback(() => {
    drawerForm.resetFields();
    setDrawerImageList([]);
    setDrawerImageUrl('');
    setDrawerOpen(true);
  }, [drawerForm]);

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
              setSelectedIngredientMap({});
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
                      <IngredientRow
                        name={name}
                        rest={rest}
                        ingredientOptions={buildIngredientOptions(name)}
                        onIngredientChange={handleIngredientChange}
                        onRemove={remove}
                        getSelectedUnit={getSelectedUnit}
                        form={form}
                      />
                    )}
                  </Form.Item>
                ))}

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm nguyên liệu
                  </Button>
                  <Tooltip title="Tạo nguyên liệu mới nếu chưa có trong danh sách">
                    <Button
                      type="dashed"
                      onClick={handleOpenDrawer}
                      icon={<PlusOutlined />}
                      style={{ color: '#8B6914', borderColor: '#8B6914' }}
                    >
                      Tạo NL mới
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
              const itemCount = items.filter((i: any) => i?.ingredientId).length;

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
                    {itemCount} nguyên liệu
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

      {/* ============ Drawer: Tạo nguyên liệu nhanh ============ */}
      <Drawer
        title="Tạo nguyên liệu mới"
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          drawerForm.resetFields();
          setDrawerImageList([]);
          setDrawerImageUrl('');
        }}
        extra={
          <Button
            type="primary"
            onClick={() => drawerForm.submit()}
            loading={drawerSubmitting}
            style={{ backgroundColor: '#8B6914' }}
          >
            Tạo nguyên liệu
          </Button>
        }
      >
        <Alert
          message="Nguyên liệu mới sẽ xuất hiện ngay trong danh sách chọn của phiếu nhập."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={drawerForm} layout="vertical" onFinish={handleDrawerSubmit}>
          <Form.Item name="name" label="Tên nguyên liệu" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Bột mì, Đường, Bơ..." />
          </Form.Item>

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

          {/* Upload ảnh */}
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
                      alt="NL"
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
            <Divider>Nguyên liệu</Divider>
            {isMobile ? (
              /* Mobile: Card list */
              <>
                {selectedPO.items.map((item: any) => (
                  <div key={item.id} style={{
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <img
                        src={getFullImageUrl(item.ingredient?.imageUrl) || PLACEHOLDER_IMG}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13 }}>{item.ingredient?.name}</strong>
                        <Tag style={{ marginLeft: 6, fontSize: 10 }}>{item.ingredient?.unit}</Tag>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                      <span>{Number(item.quantity).toLocaleString()} × {formatCurrency(item.unitPrice)}</span>
                      <strong style={{ color: '#8B6914' }}>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  </div>
                ))}
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
                    render: (_: any, record: any) => (
                      <img
                        src={getFullImageUrl(record.ingredient?.imageUrl) || PLACEHOLDER_IMG}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                      />
                    ),
                  },
                  { title: 'Nguyên liệu', dataIndex: ['ingredient', 'name'] },
                  { title: 'Đơn vị', dataIndex: ['ingredient', 'unit'] },
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

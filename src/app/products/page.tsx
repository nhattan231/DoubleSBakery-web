'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProductsQuery, useAllIngredientsQuery, useAllSuppliesQuery } from '@/lib/hooks';
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
  Divider,
  Upload,
  Image,
  Tabs,
  Steps,
  Collapse,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  UploadOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { productsApi, recipesApi, uploadApi } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types';

const { Title } = Typography;
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

// Clear menu cache when products change so public menu shows fresh data
const clearMenuCache = () => {
  try {
    localStorage.removeItem('menu_cache_settings');
    localStorage.removeItem('menu_cache_menu');
  } catch {}
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productRecipes, setProductRecipes] = useState<any[]>([]);
  const [activeRecipeTab, setActiveRecipeTab] = useState('default');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageList, setImageList] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [recipeForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const productsQuery = useProductsQuery({ page: pagination.current, limit: pagination.pageSize });
  const products: Product[] = productsQuery.data?.list || [];
  const loading = productsQuery.isLoading;
  const { data: ingredients = [] } = useAllIngredientsQuery();
  const { data: supplies = [] } = useAllSuppliesQuery();
  const [showGuide, setShowGuide] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [copiedFromSize, setCopiedFromSize] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (productsQuery.data?.pagination?.total !== undefined) {
      setPagination(prev => ({ ...prev, total: productsQuery.data?.pagination?.total || 0 }));
    }
  }, [productsQuery.data?.pagination?.total]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data.url;

      // Ảnh đầu tiên đặt làm ảnh đại diện
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

  const removeImage = (url: string) => {
    const newList = imageList.filter((u) => u !== url);
    setImageList(newList);
    form.setFieldsValue({ images: newList });
    // Nếu xoá ảnh đại diện → dùng ảnh tiếp theo hoặc rỗng
    if (imageUrl === url) {
      const next = newList[0] || '';
      setImageUrl(next);
      form.setFieldsValue({ imageUrl: next });
    }
  };

  const setAsCover = (url: string) => {
    setImageUrl(url);
    form.setFieldsValue({ imageUrl: url });
    message.success('Đã đặt làm ảnh đại diện');
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        await productsApi.create(values);
        message.success('Tạo sản phẩm thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingProduct(null);
      setImageUrl('');
      setImageList([]);
      clearMenuCache();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productsApi.delete(id);
      message.success('Xoá sản phẩm thành công');
      clearMenuCache();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    // Giữ id (để TypeORM update đúng) + loại bỏ productId/createdAt/updatedAt (DTO không cho phép)
    const cleanSizes = (product as any).sizes?.map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      sortOrder: s.sortOrder,
    })) || [];
    form.setFieldsValue({ ...product, sizes: cleanSizes });
    setImageUrl(product.imageUrl || '');
    setImageList((product as any).images || []);
    setModalOpen(true);
  };

  const openRecipe = async (product: Product) => {
    setSelectedProduct(product);
    setCopiedFromSize(null);
    try {
      // Lấy recipes theo product (nhanh hơn getAll)
      const res = await recipesApi.getByProduct(product.id);
      const allRecipes = res.data.list || [];
      setProductRecipes(allRecipes);
      setActiveRecipeTab('default');
      // Load recipe mặc định vào form
      const defaultRecipe = allRecipes.find((r: any) => !r.sizeId);
      if (defaultRecipe) {
        recipeForm.setFieldsValue({
          notes: defaultRecipe.notes,
          items: defaultRecipe.items.map((item: any) => ({
            ingredientId: item.ingredientId || undefined,
            supplyId: item.supplyId || undefined,
            quantity: Number(item.quantity),
          })),
        });
      } else {
        recipeForm.resetFields();
      }
    } catch {
      setProductRecipes([]);
      recipeForm.resetFields();
    }
    setRecipeModalOpen(true);
  };

  const loadRecipeForTab = (tabKey: string) => {
    setActiveRecipeTab(tabKey);
    setCopiedFromSize(null);
    // Reset form trước để tránh dữ liệu cũ bị giữ lại
    recipeForm.resetFields();

    const sizeId = tabKey === 'default' ? null : tabKey;
    const recipe = productRecipes.find((r: any) =>
      sizeId ? r.sizeId === sizeId : !r.sizeId,
    );
    if (recipe && recipe.items?.length > 0) {
      recipeForm.setFieldsValue({
        notes: recipe.notes,
        items: recipe.items.map((item: any) => ({
          ingredientId: item.ingredientId || undefined,
          supplyId: item.supplyId || undefined,
          quantity: Number(item.quantity),
        })),
      });
    } else {
      // Tìm công thức mẫu: ưu tiên Mặc định → bất kỳ size nào có công thức
      const templateRecipe =
        productRecipes.find((r: any) => !r.sizeId && r.items?.length > 0) ||
        productRecipes.find((r: any) => r.items?.length > 0);
      if (templateRecipe && templateRecipe.items?.length > 0) {
        const templateSizeName = !templateRecipe.sizeId
          ? 'Mặc định'
          : `Size ${selectedProduct?.sizes?.find((s: any) => s.id === templateRecipe.sizeId)?.name || ''}`;
        recipeForm.setFieldsValue({
          notes: templateRecipe.notes,
          items: templateRecipe.items.map((item: any) => ({
            ingredientId: item.ingredientId || undefined,
            supplyId: item.supplyId || undefined,
            // Nguyên liệu x2, vật tư giữ nguyên
            quantity: item.supplyId
              ? Number(item.quantity)
              : Math.round(Number(item.quantity) * 2 * 1000) / 1000,
          })),
        });
        setCopiedFromSize(templateSizeName);
      }
    }
  };

  const handleRecipeSubmit = async (values: any) => {
    if (!selectedProduct) return;
    setSubmitting(true);
    const sizeId = activeRecipeTab === 'default' ? null : activeRecipeTab;
    const existingRecipe = productRecipes.find((r: any) =>
      sizeId ? r.sizeId === sizeId : !r.sizeId,
    );

    // Clean items: chỉ gửi ingredientId hoặc supplyId (không cả 2)
    const cleanValues = {
      ...values,
      items: (values.items || []).map((item: any) => ({
        quantity: item.quantity,
        ...(item.ingredientId ? { ingredientId: item.ingredientId } : {}),
        ...(item.supplyId ? { supplyId: item.supplyId } : {}),
      })),
    };

    try {
      if (existingRecipe) {
        await recipesApi.update(existingRecipe.id, cleanValues);
        message.success('Cập nhật công thức thành công');
      } else {
        await recipesApi.create({
          productId: selectedProduct.id,
          sizeId,
          ...cleanValues,
        });
        message.success('Tạo công thức thành công');
      }
      // Reload recipes theo product
      const res = await recipesApi.getByProduct(selectedProduct.id);
      setProductRecipes(res.data.list || []);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 70,
      render: (url: string, record: any) => (
        <div style={{ cursor: 'pointer' }} onClick={() => setDetailProduct(record)}>
          {url ? (
            <img
              src={getFullImageUrl(url)}
              alt="SP"
              width={48}
              height={48}
              style={{ borderRadius: 6, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}>
              N/A
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Product) => (
        <div style={{ cursor: 'pointer' }} onClick={() => setDetailProduct(record)}>
          <strong style={{ color: '#8B6914' }}>{name}</strong>
          {record.description && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: any) => {
        const sizes = record.sizes || [];
        if (sizes.length > 0) {
          const prices = sizes.map((s: any) => Number(s.price));
          return (
            <div>
              <div>{formatCurrency(price)}</div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {sizes.map((s: any) => `${s.name}: ${formatCurrency(s.price)}`).join(' | ')}
              </div>
            </div>
          );
        }
        return formatCurrency(price);
      },
      sorter: (a: Product, b: Product) => a.price - b.price,
    },
    {
      title: 'Size',
      key: 'sizes',
      render: (_: any, record: any) => {
        const sizes = record.sizes || [];
        return sizes.length > 0
          ? sizes.map((s: any) => <Tag key={s.id} color="purple">{s.name}</Tag>)
          : <Tag>Mặc định</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'Đang bán' : 'Ngừng bán'}
        </Tag>
      ),
    },
    {
      title: 'Công thức',
      key: 'recipe',
      render: (_: any, record: Product) => (
        <Tag color={(record as any).recipes?.length > 0 ? 'blue' : 'default'}>
          {(record as any).recipes?.length > 0 ? 'Có' : 'Chưa có'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Button size="small" icon={<ExperimentOutlined />} onClick={() => openRecipe(record)}>
            Công thức
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xác nhận xoá sản phẩm này?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý sản phẩm</Title>
        <Space>
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Ẩn hướng dẫn' : 'Hướng dẫn'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingProduct(null); form.resetFields(); setImageUrl(''); setImageList([]); setModalOpen(true); }}
            style={{ backgroundColor: '#8B6914' }}
          >
            Thêm sản phẩm
          </Button>
        </Space>
      </div>

      {showGuide && (
        <Card style={{ marginBottom: 16, background: '#FFFDF5', border: '1px solid #F5E6C8' }}>
          <Title level={5} style={{ color: '#8B6914', marginTop: 0 }}>
            Hướng dẫn sử dụng
          </Title>

          <Steps
            direction="vertical"
            size="small"
            current={-1}
            items={[
              {
                title: 'Bước 1: Tạo sản phẩm',
                description: 'Bấm "Thêm sản phẩm" → nhập tên, giá, upload ảnh. Nếu sản phẩm có nhiều kích cỡ (S, M, L...), thêm các size ở mục "Các size" với giá riêng cho mỗi size.',
              },
              {
                title: 'Bước 2: Cấu hình công thức',
                description: 'Bấm nút "Công thức" trên sản phẩm → chọn tab size cần cấu hình → thêm nguyên liệu và số lượng cho 1 sản phẩm → bấm "Lưu công thức". Mỗi size có thể có công thức riêng.',
              },
              {
                title: 'Bước 3: Tạo đơn hàng',
                description: 'Vào trang "Đơn hàng" → chọn sản phẩm + size + số lượng. Khi xác nhận đơn, hệ thống tự động tính nguyên liệu theo công thức của size đó và trừ kho.',
              },
              {
                title: 'Bước 4: Ước tính nguyên liệu',
                description: 'Vào "Ước tính NL" → chọn sản phẩm + size + số lượng cần sản xuất → hệ thống hiển thị bảng nguyên liệu cần dùng, so sánh với tồn kho.',
              },
            ]}
          />

          <Collapse
            ghost
            size="small"
            style={{ marginTop: 8 }}
            items={[
              {
                key: 'faq',
                label: 'Câu hỏi thường gặp',
                children: (
                  <div style={{ fontSize: 13 }}>
                    <p><strong>Size không có công thức riêng thì sao?</strong><br />
                    Hệ thống sẽ tự động dùng công thức "Mặc định". Nếu cả mặc định cũng chưa có → báo lỗi khi xác nhận đơn.</p>
                    <p><strong>Sản phẩm không phân size?</strong><br />
                    Không cần thêm size. Chỉ cần cấu hình 1 công thức mặc định là đủ.</p>
                    <p><strong>Muốn thay đổi công thức?</strong><br />
                    Bấm "Công thức" → chọn tab size → sửa nguyên liệu → bấm "Lưu công thức".</p>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {isMobile ? (
        <Spin spinning={loading}>
          <div style={{ padding: '0 2px' }}>
            {products.map((product) => (
              <div key={product.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {/* Row 1: Image + Name + Status */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  {product.imageUrl ? (
                    <img src={getFullImageUrl(product.imageUrl)} alt={product.name} width={48} height={48} style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onClick={() => setDetailProduct(product)} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }} onClick={() => setDetailProduct(product)}>N/A</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#8B6914', fontSize: 14 }}>{product.name}</strong>
                      <Tag color={product.status === 'active' ? 'green' : 'red'} style={{ margin: 0, fontSize: 11 }}>
                        {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                      </Tag>
                    </div>
                    {product.description && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{product.description}</div>}
                  </div>
                </div>
                {/* Row 2: Price + Sizes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 15, color: '#333' }}>{formatCurrency(product.price)}</strong>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(product as any).sizes?.length > 0
                      ? (product as any).sizes.map((s: any) => <Tag key={s.id} color="purple" style={{ margin: 0, fontSize: 11 }}>{s.name}</Tag>)
                      : <Tag style={{ margin: 0, fontSize: 11 }}>Mặc định</Tag>
                    }
                  </div>
                </div>
                {/* Row 3: Recipe tag + Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color={(product as any).recipes?.length > 0 ? 'blue' : 'default'} style={{ margin: 0 }}>{(product as any).recipes?.length > 0 ? 'Có CT' : 'Chưa có CT'}</Tag>
                  <Space size={4}>
                    <Button size="small" icon={<ExperimentOutlined />} onClick={() => openRecipe(product)}>CT</Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(product)} />
                    <Popconfirm title="Xác nhận xoá?" onConfirm={() => handleDelete(product.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))}
            {pagination.total > pagination.pageSize && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Space>
                  <Button size="small" disabled={pagination.current <= 1} onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}>Trước</Button>
                  <span style={{ fontSize: 13, color: '#666' }}>Trang {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}</span>
                  <Button size="small" disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)} onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}>Sau</Button>
                </Space>
              </div>
            )}
          </div>
        </Spin>
      ) : (
        <Card>
          <Table columns={columns} dataSource={products} rowKey="id" loading={loading}
            scroll={{ x: 800 }}
            pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, onChange: (page) => setPagination(prev => ({ ...prev, current: page })) }}
          />
        </Card>
      )}

      {/* Modal tạo/sửa sản phẩm */}
      <Modal
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); setImageUrl(''); setImageList([]); }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Ví dụ: Bánh Croissant" />
          </Form.Item>

          <Form.Item name="price" label="Giá mặc định (VNĐ)" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>

          {/* Upload nhiều ảnh */}
          <Form.Item label="Hình ảnh sản phẩm (có thể chọn nhiều)">
            <Upload
              accept="image/*"
              multiple
              showUploadList={false}
              beforeUpload={(file) => { handleUpload(file); return false; }}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              </Button>
            </Upload>
            {imageList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {imageList.map((url) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      border: imageUrl === url ? '2px solid #8B6914' : '1px solid #eee',
                      borderRadius: 8,
                      padding: 2,
                    }}
                  >
                    <Image
                      src={getFullImageUrl(url)}
                      alt="SP"
                      width={80}
                      height={80}
                      style={{ borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'center', marginTop: 2 }}>
                      {imageUrl === url ? (
                        <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>Ảnh đại diện</Tag>
                      ) : (
                        <Button type="link" size="small" style={{ fontSize: 10, padding: 0 }} onClick={() => setAsCover(url)}>
                          Đặt đại diện
                        </Button>
                      )}
                      <Button type="link" danger size="small" style={{ fontSize: 10, padding: 0, marginLeft: 4 }} onClick={() => removeImage(url)}>
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

          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select>
              <Select.Option value="active">Đang bán</Select.Option>
              <Select.Option value="inactive">Ngừng bán</Select.Option>
            </Select>
          </Form.Item>

          {/* Quản lý Size */}
          <Divider>Các size (tuỳ chọn)</Divider>
          <div style={{ marginBottom: 8, color: '#888', fontSize: 12 }}>
            Mỗi size có giá riêng. Sau khi tạo sản phẩm, vào "Công thức" để cấu hình nguyên liệu cho từng size.
          </div>
          <Form.List name="sizes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="size-card" style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 150px 80px auto',
                    gap: 8,
                    alignItems: 'start',
                    marginBottom: 8,
                  }}>
                    <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Tên size' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="VD: S, M, L" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'price']} rules={[{ required: true, message: 'Giá' }]} style={{ marginBottom: 0 }}>
                      <InputNumber placeholder="Giá (VNĐ)" min={0} step={1000} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'sortOrder']} initialValue={0} style={{ marginBottom: 0 }}>
                      <InputNumber placeholder="TT" min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ height: 32 }} />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Thêm size
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Modal công thức — có tabs cho từng size */}
      <Modal
        title={`Công thức: ${selectedProduct?.name || ''}`}
        open={recipeModalOpen}
        onCancel={() => { setRecipeModalOpen(false); recipeForm.resetFields(); }}
        onOk={() => recipeForm.submit()}
        okText="Lưu công thức"
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={750}
      >
        {/* Tabs: Mặc định + từng size */}
        {selectedProduct && (
          <Tabs
            activeKey={activeRecipeTab}
            onChange={loadRecipeForTab}
            items={[
              {
                key: 'default',
                label: selectedProduct.sizes?.length ? 'Mặc định' : 'Công thức',
              },
              ...(selectedProduct.sizes || []).map((s: any) => ({
                key: s.id,
                label: `Size ${s.name}`,
              })),
            ]}
          />
        )}

        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f6f6f6', borderRadius: 6, fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>
            {activeRecipeTab === 'default'
              ? selectedProduct?.sizes?.length
                ? '📋 CT mặc định'
                : '📋 Định lượng / 1 SP'
              : `📋 Size "${selectedProduct?.sizes?.find((s: any) => s.id === activeRecipeTab)?.name || ''}"`
            }
          </span>
          {productRecipes.find((r: any) => (activeRecipeTab === 'default' ? !r.sizeId : r.sizeId === activeRecipeTab) && r.items?.length > 0)
            ? <Tag color="green" style={{ margin: 0 }}>Đã có</Tag>
            : <Tag color="orange" style={{ margin: 0 }}>Chưa có</Tag>
          }
        </div>

        {copiedFromSize && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FFF7E6', border: '1px solid #FFD591', borderRadius: 6, fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: '#D46B08', marginBottom: 4 }}>
              Dữ liệu tham khảo từ công thức "{copiedFromSize}"
            </div>
            <div style={{ color: '#8C6A1E' }}>
              Nguyên liệu đã được x2 số lượng, vật tư tiêu hao giữ nguyên. Bạn có thể chỉnh sửa lại cho phù hợp trước khi bấm "Lưu công thức".
            </div>
          </div>
        )}

        <Form form={recipeForm} layout="vertical" onFinish={handleRecipeSubmit}>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="VD: Nướng ở 180 độ C trong 25 phút" />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Form.Item shouldUpdate={(prev, cur) => prev.items !== cur.items} noStyle>
              {() => {
              const allItems = recipeForm.getFieldValue('items') || [];
              // Phân nhóm fields theo loại: dùng _type marker hoặc supplyId/ingredientId
              const ingFields = fields.filter(({ name }) => {
                const item = allItems[name];
                return item?._type !== 'supply' && !item?.supplyId;
              });
              const supFields = fields.filter(({ name }) => {
                const item = allItems[name];
                return item?._type === 'supply' || !!item?.supplyId;
              });

              // Lấy tất cả ID đã chọn để loại khỏi dropdown
              const selectedIngIds = allItems.filter((i: any) => i?.ingredientId).map((i: any) => i.ingredientId);
              const selectedSupIds = allItems.filter((i: any) => i?.supplyId).map((i: any) => i.supplyId);

              // Render 1 item card
              const renderItemCard = (
                { key, name, ...restField }: any,
                type: 'ingredient' | 'supply',
              ) => {
                const isSupply = type === 'supply';
                const borderColor = isSupply ? '#ffe7ba' : '#d6e4ff';
                const bgColor = isSupply ? '#fffbe6' : '#f0f5ff';
                const dataList = isSupply ? supplies : ingredients;
                const selectedIds = isSupply ? selectedSupIds : selectedIngIds;
                const fieldName = isSupply ? 'supplyId' : 'ingredientId';
                const currentItem = allItems[name];
                const currentId = currentItem?.[fieldName];

                const options = dataList
                  .filter((d) => !selectedIds.includes(d.id) || d.id === currentId)
                  .map((d) => ({ value: d.id, label: `${d.name} - ${d.unit}`, imageUrl: d.imageUrl }));

                return (
                  <div key={key} style={{
                    marginBottom: 8,
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Form.Item
                          {...restField}
                          name={[name, fieldName]}
                          rules={[{ required: true, message: isSupply ? 'Chọn vật tư' : 'Chọn nguyên liệu' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Select
                            placeholder={isSupply ? 'Chọn vật tư tiêu hao' : 'Chọn nguyên liệu'}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            options={options}
                            optionRender={(option) => (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {(option.data as any).imageUrl ? (
                                  <img src={getFullImageUrl((option.data as any).imageUrl)} alt="" width={24} height={24} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 24, height: 24, borderRadius: 4, background: isSupply ? '#ffe7ba' : '#d6e4ff', flexShrink: 0 }} />
                                )}
                                <span>{option.label}</span>
                              </div>
                            )}
                            labelRender={(props) => {
                              const found = dataList.find((d) => d.id === props.value);
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {found?.imageUrl ? (
                                    <img src={getFullImageUrl(found.imageUrl)} alt="" width={20} height={20} style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                                  ) : null}
                                  <span>{found ? `${found.name} (${found.unit})` : props.label}</span>
                                </div>
                              );
                            }}
                          />
                        </Form.Item>
                      </div>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        size="small"
                        style={{ flexShrink: 0, marginTop: 4 }}
                      />
                    </div>
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true, message: 'Nhập số lượng' }]} label="Số lượng" style={{ marginBottom: 0 }}>
                      <InputNumber placeholder="Số lượng" min={0.001} style={{ width: '100%' }} />
                    </Form.Item>
                  </div>
                );
              };

              return (
                <>
                  {/* ===== SECTION: Nguyên liệu ===== */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: '#e6f4ff', borderRadius: 6, border: '1px solid #91caff' }}>
                      <span style={{ fontSize: 14 }}>🧂</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0958d9' }}>Nguyên liệu</span>
                      <span style={{ fontSize: 12, color: '#4096ff', marginLeft: 'auto' }}>{ingFields.length} mục</span>
                    </div>
                    {ingFields.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: '#bfbfbf', fontSize: 12 }}>
                        Chưa có nguyên liệu
                      </div>
                    )}
                    {ingFields.map((field) => renderItemCard(field, 'ingredient'))}
                    <Button
                      type="dashed"
                      onClick={() => add({ _type: 'ingredient', quantity: undefined })}
                      block
                      icon={<PlusOutlined />}
                      style={{ borderColor: '#91caff', color: '#1677ff' }}
                    >
                      Thêm nguyên liệu
                    </Button>
                  </div>

                  {/* ===== SECTION: Vật tư tiêu hao ===== */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                      <span style={{ fontSize: 14 }}>📦</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#d46b08' }}>Vật tư tiêu hao</span>
                      <span style={{ fontSize: 12, color: '#fa8c16', marginLeft: 'auto' }}>{supFields.length} mục</span>
                    </div>
                    {supFields.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: '#bfbfbf', fontSize: 12 }}>
                        Chưa có vật tư
                      </div>
                    )}
                    {supFields.map((field) => renderItemCard(field, 'supply'))}
                    <Button
                      type="dashed"
                      onClick={() => add({ _type: 'supply', quantity: undefined })}
                      block
                      icon={<PlusOutlined />}
                      style={{ borderColor: '#ffd591', color: '#fa8c16' }}
                    >
                      Thêm vật tư tiêu hao
                    </Button>
                  </div>
                </>
              );
            }}
            </Form.Item>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Modal chi tiết sản phẩm — gallery ảnh */}
      <Modal
        title={detailProduct?.name || 'Chi tiết sản phẩm'}
        open={!!detailProduct}
        onCancel={() => setDetailProduct(null)}
        footer={null}
        width={600}
      >
        {detailProduct && (() => {
          const allImages: string[] = [];
          if (detailProduct.images && detailProduct.images.length > 0) {
            allImages.push(...detailProduct.images);
          } else if (detailProduct.imageUrl) {
            allImages.push(detailProduct.imageUrl);
          }

          return (
            <div>
              {/* Gallery ảnh */}
              {allImages.length > 0 ? (
                <div>
                  {/* Ảnh lớn chính */}
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Image.PreviewGroup>
                      <Image
                        src={getFullImageUrl(allImages[0])}
                        alt={detailProduct.name}
                        style={{ maxHeight: 300, borderRadius: 8, objectFit: 'contain' }}
                      />
                    </Image.PreviewGroup>
                  </div>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                      <Image.PreviewGroup>
                        {allImages.map((url: string, idx: number) => (
                          <Image
                            key={idx}
                            src={getFullImageUrl(url)}
                            alt={`Ảnh ${idx + 1}`}
                            width={64}
                            height={64}
                            style={{ borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1px solid #eee' }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}
                  <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 12 }}>
                    Bấm vào ảnh để xem phóng to • {allImages.length} ảnh
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, background: '#fafafa', borderRadius: 8, marginBottom: 16, color: '#ccc' }}>
                  Chưa có ảnh sản phẩm
                </div>
              )}

              {/* Thông tin sản phẩm */}
              <Divider style={{ margin: '8px 0 12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px', fontSize: 14 }}>
                <div><span style={{ color: '#888' }}>Giá mặc định:</span> <strong>{formatCurrency(detailProduct.price)}</strong></div>
                <div>
                  <span style={{ color: '#888' }}>Trạng thái:</span>{' '}
                  <Tag color={detailProduct.status === 'active' ? 'green' : 'red'}>
                    {detailProduct.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                  </Tag>
                </div>
                {detailProduct.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#888' }}>Mô tả:</span> {detailProduct.description}
                  </div>
                )}
              </div>

              {/* Sizes */}
              {detailProduct.sizes?.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0 8px' }}>Các size</Divider>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {detailProduct.sizes.map((s: any) => (
                      <Tag key={s.id} color="purple" style={{ padding: '4px 12px' }}>
                        {s.name} — {formatCurrency(s.price)}
                      </Tag>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, UploadOutlined, HistoryOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ingredientsApi, uploadApi, inventoryApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Ingredient, InventoryTransaction } from '@/types';

const { Title } = Typography;
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

const unitOptions = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Mililiter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'piece', label: 'Cái/Quả' },
  { value: 'tbsp', label: 'Muỗng canh (tbsp)' },
  { value: 'tsp', label: 'Muỗng cà phê (tsp)' },
];

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lowStockIngredients, setLowStockIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [detailIngredient, setDetailIngredient] = useState<Ingredient | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageList, setImageList] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Lịch sử nhập/xuất kho
  const [historyData, setHistoryData] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchIngredients = async (page = 1) => {
    setLoading(true);
    try {
      const res = await ingredientsApi.getAll({ page, limit: pagination.pageSize });
      setIngredients(res.data.list || []);
      setPagination((prev) => ({ ...prev, current: page, total: res.data.pagination?.total || 0 }));
    } catch {
      message.error('Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await ingredientsApi.getLowStock();
      setLowStockIngredients(res.data.list || []);
    } catch {}
  };

  // Fetch lịch sử kho cho nguyên liệu đang xem chi tiết
  const fetchHistory = async (ingredientId: string, page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await inventoryApi.getTransactions({
        ingredientId,
        limit: historyPagination.pageSize,
        page,
      });
      setHistoryData(res.data.list || []);
      setHistoryPagination((prev) => ({ ...prev, current: page, total: res.data.pagination?.total || 0 }));
    } catch (err) {
      console.error('Lỗi khi tải lịch sử kho:', err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Khi mở chi tiết nguyên liệu → fetch lịch sử
  useEffect(() => {
    if (detailIngredient?.id) {
      setHistoryPagination((prev) => ({ ...prev, current: 1 }));
      fetchHistory(detailIngredient.id, 1);
    } else {
      setHistoryData([]);
    }
  }, [detailIngredient?.id]);

  useEffect(() => {
    fetchIngredients();
    fetchLowStock();
  }, []);

  const handleUpload = async (file: File) => {
    if (imageList.length >= 3) {
      message.warning('Tối đa 3 ảnh cho mỗi nguyên liệu');
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

  const removeImage = (url: string) => {
    const newList = imageList.filter((u) => u !== url);
    setImageList(newList);
    form.setFieldsValue({ images: newList });
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
    try {
      if (editing) {
        await ingredientsApi.update(editing.id, values);
        message.success('Cập nhật nguyên liệu thành công');
      } else {
        await ingredientsApi.create(values);
        message.success('Thêm nguyên liệu thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      setImageUrl('');
      setImageList([]);
      fetchIngredients(pagination.current);
      fetchLowStock();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ingredientsApi.delete(id);
      message.success('Xoá nguyên liệu thành công');
      fetchIngredients(pagination.current);
      fetchLowStock();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const openEdit = (record: Ingredient) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      currentStock: Number(record.currentStock),
      minStock: Number(record.minStock),
      costPerUnit: Number(record.costPerUnit),
    });
    setImageUrl(record.imageUrl || '');
    setImageList(record.images || []);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 60,
      render: (url: string, record: Ingredient) => (
        <div style={{ cursor: 'pointer' }} onClick={() => setDetailIngredient(record)}>
          {url ? (
            <img
              src={getFullImageUrl(url)}
              alt={record.name}
              width={40}
              height={40}
              style={{ borderRadius: 6, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 11 }}>
              N/A
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tên nguyên liệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Ingredient) => (
        <span style={{ cursor: 'pointer', color: '#8B6914', fontWeight: 500 }} onClick={() => setDetailIngredient(record)}>
          {name}
        </span>
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
      title: 'Tồn kho tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (val: number, record: Ingredient) => `${Number(val).toLocaleString()} ${record.unit}`,
    },
    {
      title: 'Giá/đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      render: (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Ingredient) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xác nhận xoá?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý nguyên liệu
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setImageUrl('');
            setImageList([]);
            setModalOpen(true);
          }}
          style={{ backgroundColor: '#8B6914' }}
        >
          Thêm nguyên liệu
        </Button>
      </div>

      {lowStockIngredients.length > 0 && (
        <Alert
          message={`Cảnh báo: ${lowStockIngredients.length} nguyên liệu sắp hết`}
          description={lowStockIngredients.map((i) => `${i.name} (${Number(i.currentStock)} ${i.unit})`).join(', ')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={ingredients}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => fetchIngredients(page),
          }}
        />
      </Card>

      {/* Modal thêm/sửa nguyên liệu */}
      <Modal
        title={editing ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
          setImageUrl('');
          setImageList([]);
        }}
        onOk={() => form.submit()}
        width={550}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input placeholder="VD: Bột mì" />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
            <Select options={unitOptions} placeholder="Chọn đơn vị" />
          </Form.Item>
          <Form.Item name="currentStock" label="Tồn kho hiện tại" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="minStock" label="Tồn kho tối thiểu (cảnh báo)" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="costPerUnit" label="Giá mỗi đơn vị (VNĐ)" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} step={100} />
          </Form.Item>

          {/* Upload ảnh nguyên liệu */}
          <Form.Item label={`Hình ảnh nguyên liệu (tối đa 3 ảnh — đã chọn ${imageList.length}/3)`}>
            <Upload
              accept="image/*"
              multiple
              showUploadList={false}
              beforeUpload={(file) => { handleUpload(file); return false; }}
              disabled={imageList.length >= 3}
            >
              <Button icon={<UploadOutlined />} loading={uploading} disabled={imageList.length >= 3}>
                {uploading ? 'Đang tải...' : imageList.length >= 3 ? 'Đã đủ 3 ảnh' : 'Chọn ảnh'}
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
                      alt="NL"
                      width={80}
                      height={80}
                      style={{ borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'center', marginTop: 2 }}>
                      {imageUrl === url ? (
                        <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>Đại diện</Tag>
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
        </Form>
      </Modal>

      {/* Modal chi tiết nguyên liệu */}
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

          const reasonMap: Record<string, { label: string; color: string }> = {
            PURCHASE: { label: 'Mua hàng', color: 'blue' },
            ORDER: { label: 'Đơn hàng', color: 'orange' },
            ADJUSTMENT: { label: 'Điều chỉnh', color: 'purple' },
            WASTE: { label: 'Hao hụt', color: 'red' },
          };

          return (
            <div>
              {/* Gallery ảnh */}
              {allImages.length > 0 ? (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Image.PreviewGroup>
                    {allImages.map((url, idx) => (
                      <Image
                        key={idx}
                        src={getFullImageUrl(url)}
                        alt={`${detailIngredient.name} ${idx + 1}`}
                        width={allImages.length === 1 ? 200 : 120}
                        height={allImages.length === 1 ? 200 : 120}
                        style={{ borderRadius: 8, objectFit: 'cover', margin: 4 }}
                      />
                    ))}
                  </Image.PreviewGroup>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    Bấm vào ảnh để xem phóng to
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, background: '#fafafa', borderRadius: 8, marginBottom: 16, color: '#ccc' }}>
                  Chưa có ảnh nguyên liệu
                </div>
              )}

              <Divider style={{ margin: '8px 0 12px' }} />

              {/* Thông tin chi tiết */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 14 }}>
                <div>
                  <span style={{ color: '#888' }}>Đơn vị:</span> <Tag>{detailIngredient.unit}</Tag>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Giá/đơn vị:</span>{' '}
                  <strong>{formatCurrency(Number(detailIngredient.costPerUnit))}</strong>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Tồn kho:</span>{' '}
                  <strong style={{ color: isLow ? '#ff4d4f' : '#52c41a' }}>
                    {Number(detailIngredient.currentStock).toLocaleString()} {detailIngredient.unit}
                    {isLow && <WarningOutlined style={{ marginLeft: 4 }} />}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Tối thiểu:</span>{' '}
                  {Number(detailIngredient.minStock).toLocaleString()} {detailIngredient.unit}
                </div>
              </div>

              {isLow && (
                <Alert
                  message="Nguyên liệu sắp hết, cần nhập thêm!"
                  type="error"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}

              {/* ========== Lịch sử nhập/xuất kho ========== */}
              <Divider style={{ margin: '16px 0 12px' }}>
                <Space size={6}>
                  <HistoryOutlined />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Lịch sử nhập/xuất kho</span>
                </Space>
              </Divider>

              <Spin spinning={historyLoading}>
                {historyData.length > 0 ? (
                  <Table
                    dataSource={historyData}
                    rowKey="id"
                    size="small"
                    pagination={{
                      current: historyPagination.current,
                      pageSize: historyPagination.pageSize,
                      total: historyPagination.total,
                      size: 'small',
                      showTotal: (total) => `${total} giao dịch`,
                      onChange: (page) => fetchHistory(detailIngredient.id, page),
                    }}
                    columns={[
                      {
                        title: 'Loại',
                        dataIndex: 'type',
                        key: 'type',
                        width: 70,
                        render: (type: string) => (
                          type === 'IN'
                            ? <Tag color="green"><ArrowDownOutlined /> Nhập</Tag>
                            : <Tag color="red"><ArrowUpOutlined /> Xuất</Tag>
                        ),
                      },
                      {
                        title: 'Số lượng',
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 100,
                        render: (qty: number, record: any) => (
                          <span style={{ fontWeight: 500, color: record.type === 'IN' ? '#52c41a' : '#ff4d4f' }}>
                            {record.type === 'IN' ? '+' : '-'}{Number(qty).toLocaleString()} {detailIngredient.unit}
                          </span>
                        ),
                      },
                      {
                        title: 'Lý do',
                        dataIndex: 'reason',
                        key: 'reason',
                        width: 100,
                        render: (reason: string) => {
                          const r = reasonMap[reason] || { label: reason, color: 'default' };
                          return <Tag color={r.color}>{r.label}</Tag>;
                        },
                      },
                      {
                        title: 'Ghi chú',
                        dataIndex: 'notes',
                        key: 'notes',
                        ellipsis: true,
                        render: (notes: string) => notes || '—',
                      },
                      {
                        title: 'Thời gian',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        width: 140,
                        render: (d: string) => formatDateTime(d),
                      },
                    ]}
                  />
                ) : (
                  !historyLoading && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chưa có lịch sử giao dịch"
                      style={{ padding: '16px 0' }}
                    />
                  )
                )}
              </Spin>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

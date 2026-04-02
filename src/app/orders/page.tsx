'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdersQuery, useActiveProductsQuery, useAllSuppliesQuery } from '@/lib/hooks';
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
  Alert,
  DatePicker,
  Radio,
  Spin,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  GiftOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  ExperimentOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { ordersApi, productionApi, suppliesApi } from '@/lib/api';
import { formatCurrency, formatDateTime, orderStatusMap } from '@/lib/format';
import type { Order, Product, EstimateHistoryItem, Supply } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all';

function getDateRange(preset: DatePreset): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const today = dayjs();
  switch (preset) {
    case 'today':
      return [today.startOf('day'), today.endOf('day')];
    case 'yesterday':
      return [today.subtract(1, 'day').startOf('day'), today.subtract(1, 'day').endOf('day')];
    case '7days':
      return [today.subtract(6, 'day').startOf('day'), today.endOf('day')];
    case '30days':
      return [today.subtract(29, 'day').startOf('day'), today.endOf('day')];
    default:
      return null;
  }
}

/** Helper: lấy đơn giá theo sizeId (nếu có) hoặc giá mặc định */
function getItemPrice(product: Product | undefined, sizeId?: string): number {
  if (!product) return 0;
  if (sizeId && product.sizes && product.sizes.length > 0) {
    const size = product.sizes.find((s) => s.id === sizeId);
    if (size) return Number(size.price);
  }
  return Number(product.price);
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderEstimate, setOrderEstimate] = useState<EstimateHistoryItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const ordersQuery = useOrdersQuery({
    page,
    limit: 20,
    status: statusFilter,
    startDate: dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined,
    endDate: dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined,
    search: searchText.trim() || undefined,
  });
  const orders: Order[] = ordersQuery.data?.list || [];
  const loading = ordersQuery.isLoading;
  const paginationTotal = ordersQuery.data?.pagination?.total || 0;
  const { data: products = [] } = useActiveProductsQuery();
  const { data: allSupplies = [] } = useAllSuppliesQuery();

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateRange, searchText]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') return;
    if (preset === 'all') {
      setDateRange(null);
    } else {
      setDateRange(getDateRange(preset));
    }
  };

  const handleRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setDateRange(dates);
    if (dates) {
      setDatePreset('custom');
    } else {
      setDatePreset('all');
    }
  };

  const handleSearchDebounce = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchText(value);
    }, 400);
  };

  const supplyOptions = useMemo(() =>
    allSupplies.map((s: any) => ({
      value: s.id,
      label: `${s.name} (${s.unit})`,
      supply: s,
    })),
    [allSupplies],
  );

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      // Gộp sản phẩm thường + quà tặng vào cùng 1 mảng items
      const normalItems = (values.items || []).map((item: any) => ({
        productId: item.productId,
        sizeId: item.sizeId || undefined,
        quantity: item.quantity,
      }));
      const giftItems = (values.giftItems || [])
        .filter((item: any) => item?.productId)
        .map((item: any) => ({
          productId: item.productId,
          sizeId: item.sizeId || undefined,
          quantity: item.quantity || 1,
          isGift: true,
          customPrice: Number(item.customPrice ?? 0),
        }));

      const supplyItemsPayload = (values.supplyItems || [])
        .filter((item: any) => item?.supplyId)
        .map((item: any) => ({
          supplyId: item.supplyId,
          quantity: item.quantity || 1,
          unitPrice: Number(item.unitPrice ?? 0),
        }));

      const orderData = {
        customerName: values.customerName,
        phone: values.phone,
        address: values.address,
        notes: values.notes,
        deductStock: values.deductStock !== false,
        items: [...normalItems, ...giftItems],
        supplyItems: supplyItemsPayload,
      };
      await ordersApi.create(orderData);
      message.success('Tạo đơn hàng thành công');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      message.success(`Cập nhật trạng thái thành công`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (selectedOrder?.id === orderId) {
        const res = await ordersApi.getOne(orderId);
        setSelectedOrder(res.data.data);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message;
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        Modal.error({
          title: 'Không đủ nguyên liệu',
          content: (
            <ul>
              {errors.map((e: string, i: number) => (
                <li key={i} style={{ color: '#ff4d4f' }}>{e}</li>
              ))}
            </ul>
          ),
        });
      } else {
        message.error(errMsg || 'Có lỗi xảy ra');
      }
    }
  };

  const viewDetail = async (order: Order) => {
    try {
      const res = await ordersApi.getOne(order.id);
      setSelectedOrder(res.data.data);
      setDetailOpen(true);
      // Load estimate history cho đơn hàng này (chỉ khi đơn có xuất định lượng)
      const orderData = res.data.data;
      if (orderData.deductStock !== false) {
        productionApi
          .getEstimateByOrder(order.id)
          .then((estRes) => setOrderEstimate(estRes.data.data || null))
          .catch(() => setOrderEstimate(null));
      } else {
        setOrderEstimate(null);
      }
    } catch {
      message.error('Không thể tải chi tiết đơn hàng');
    }
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (num: string) => <strong>{num}</strong>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatCurrency(val),
      sorter: (a: Order, b: Order) => Number(a.totalAmount) - Number(b.totalAmount),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Order) => {
        const s = orderStatusMap[status] || { label: status, color: 'default' };
        return (
          <Space size={4}>
            <Tag color={s.color}>{s.label}</Tag>
            {record.deductStock === false && (
              <Tag color="orange" style={{ fontSize: 10 }}>Không xuất kho</Tag>
            )}
          </Space>
        );
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
      render: (_: any, record: Order) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
            Chi tiết
          </Button>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="Xác nhận đơn hàng? (Sẽ trừ nguyên liệu khỏi kho)"
                onConfirm={() => handleStatusChange(record.id, 'confirmed')}
              >
                <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                  Xác nhận
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Huỷ đơn hàng này?"
                onConfirm={() => handleStatusChange(record.id, 'cancelled')}
              >
                <Button size="small" danger icon={<CloseCircleOutlined />}>
                  Huỷ
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'confirmed' && (
            <Button
              size="small"
              onClick={() => handleStatusChange(record.id, 'processing')}
            >
              Xử lý
            </Button>
          )}
          {record.status === 'processing' && (
            <Button
              size="small"
              type="primary"
              style={{ backgroundColor: '#52c41a' }}
              onClick={() => handleStatusChange(record.id, 'completed')}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý đơn hàng
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setTimeout(() => form.setFieldsValue({ items: [{}] }), 0);
            setModalOpen(true);
          }}
          style={{ backgroundColor: '#8B6914' }}
        >
          Tạo đơn hàng
        </Button>
      </div>

      <Card>
        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Radio.Group
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="all">Tất cả</Radio.Button>
            <Radio.Button value="today">Hôm nay</Radio.Button>
            <Radio.Button value="yesterday">Hôm qua</Radio.Button>
            <Radio.Button value="7days">7 ngày</Radio.Button>
            <Radio.Button value="30days">30 ngày</Radio.Button>
          </Radio.Group>

          <RangePicker
            value={dateRange}
            onChange={(dates) => handleRangeChange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            style={{ width: 240, minWidth: 200, flex: '1 1 200px' }}
            allowClear
          />

          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 140, minWidth: 120, flex: '0 1 140px' }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={Object.entries(orderStatusMap).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />

          <Input.Search
            placeholder="Mã đơn, khách hàng, SĐT..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => handleSearchDebounce(e.target.value)}
            style={{ width: 220, minWidth: 160, flex: '1 1 160px' }}
          />

          <Button icon={<ReloadOutlined />} onClick={() => ordersQuery.refetch()}>
            Tải lại
          </Button>
        </div>

        {isMobile ? (
          /* Mobile: Card List */
          <Spin spinning={loading}>
            {orders.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>Không có đơn hàng</div>
            ) : (
              <>
                {orders.map((order) => {
                  const s = orderStatusMap[order.status] || { label: order.status, color: 'default' };
                  return (
                    <div
                      key={order.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #f0f0f0',
                        borderRadius: 10,
                        padding: '12px 14px',
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Row 1: Mã đơn + Trạng thái */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ fontSize: 13, color: '#333' }}>{order.orderNumber}</strong>
                        <Tag color={s.color} style={{ margin: 0, fontSize: 11 }}>{s.label}</Tag>
                      </div>
                      {/* Row 2: Khách hàng + SĐT */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 6 }}>
                        <span>{order.customerName}</span>
                        <span>{order.phone || ''}</span>
                      </div>
                      {/* Row 3: Ngày + Tổng tiền */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#999' }}>{formatDateTime(order.createdAt)}</span>
                        <strong style={{ fontSize: 15, color: '#8B6914' }}>{formatCurrency(order.totalAmount)}</strong>
                      </div>
                      {/* Row 4: Buttons */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(order)}>Chi tiết</Button>
                        {order.status === 'pending' && (
                          <>
                            <Popconfirm title="Xác nhận đơn hàng?" onConfirm={() => handleStatusChange(order.id, 'confirmed')}>
                              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>Xác nhận</Button>
                            </Popconfirm>
                            <Popconfirm title="Huỷ đơn hàng?" onConfirm={() => handleStatusChange(order.id, 'cancelled')}>
                              <Button size="small" danger icon={<CloseCircleOutlined />}>Huỷ</Button>
                            </Popconfirm>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button size="small" onClick={() => handleStatusChange(order.id, 'processing')}>Xử lý</Button>
                        )}
                        {order.status === 'processing' && (
                          <Button size="small" type="primary" style={{ backgroundColor: '#52c41a' }} onClick={() => handleStatusChange(order.id, 'completed')}>Hoàn thành</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Pagination */}
                {paginationTotal > 20 && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Space>
                      <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
                      <span style={{ fontSize: 13, color: '#666' }}>Trang {page} / {Math.ceil(paginationTotal / 20)}</span>
                      <Button size="small" disabled={page >= Math.ceil(paginationTotal / 20)} onClick={() => setPage(page + 1)}>Sau</Button>
                    </Space>
                  </div>
                )}
              </>
            )}
          </Spin>
        ) : (
          /* Desktop: Table */
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              current: page,
              pageSize: 20,
              total: paginationTotal,
              onChange: (p) => setPage(p),
            }}
          />
        )}
      </Card>

      {/* Modal tạo đơn hàng */}
      <Modal
        title="Tạo đơn hàng mới"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        okText="Tạo đơn hàng"
        cancelText="Huỷ"
        okButtonProps={{ icon: <ShoppingCartOutlined />, loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        onOk={() => form.submit()}
        width={860}
      >
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          closable
          style={{ marginBottom: 16 }}
          message="Hướng dẫn"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Chọn sản phẩm → chọn size (nếu có) → nhập số lượng</li>
              <li>Cùng 1 sản phẩm có thể thêm nhiều dòng với size khác nhau</li>
              <li>Quà tặng: giá mặc định 0đ, có thể điều chỉnh</li>
            </ul>
          }
        />

        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="customerName"
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { pattern: /^0\d{9}$/, message: 'SĐT phải gồm 10 số, bắt đầu bằng 0' },
              ]}
            >
              <Input placeholder="0909123456" maxLength={10} />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ">
              <Input placeholder="123 Nguyễn Huệ, Q.1" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú cho đơn hàng (tuỳ chọn)" />
          </Form.Item>

          {/* Toggle xuất kho toàn đơn */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                <ExperimentOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                Xuất kho khi xác nhận đơn
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                Trừ nguyên liệu (theo công thức) và vật tư tiêu hao khỏi kho
              </div>
            </div>
            <Form.Item name="deductStock" valuePropName="checked" initialValue={true} style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Xuất kho" unCheckedChildren="Không xuất" />
            </Form.Item>
          </div>

          <Divider>Sản phẩm</Divider>

          <Form.List name="items" rules={[{ validator: async (_, items) => {
            if (!items || items.length === 0) throw new Error('Thêm ít nhất 1 sản phẩm');
          }}]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                {/* Header bảng */}
                {fields.length > 0 && (
                  <div className="order-item-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 120px 100px 80px 110px 40px',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0',
                    marginBottom: 8,
                    color: '#888',
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    <span>Sản phẩm</span>
                    <span>Size</span>
                    <span>Đơn giá</span>
                    <span>SL</span>
                    <span style={{ textAlign: 'right' }}>Thành tiền</span>
                    <span />
                  </div>
                )}

                {fields.map(({ key, name, ...rest }) => {
                  const items = form.getFieldValue('items') || [];
                  const currentItem = items[name] || {};
                  const selectedProductId = currentItem.productId;
                  const selectedProduct = products.find((p) => p.id === selectedProductId);
                  const unitPrice = getItemPrice(selectedProduct, currentItem.sizeId);
                  const quantity = currentItem.quantity || 0;
                  const subtotal = unitPrice * quantity;

                  // Tính các sizeId đã chọn cho cùng productId ở các dòng khác
                  const takenSizeKeys = new Set<string>();
                  items.forEach((item: any, idx: number) => {
                    if (idx !== name && item?.productId === selectedProductId) {
                      takenSizeKeys.add(item?.sizeId || 'default');
                    }
                  });

                  const hasSizes = selectedProduct?.sizes && selectedProduct.sizes.length > 0;
                  const sortedSizes = hasSizes
                    ? [...selectedProduct!.sizes!]
                        .filter((s) => s.isActive)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                    : [];

                  return (
                    <div
                      key={key}
                      className="order-item-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 120px 100px 80px 110px 40px',
                        gap: 8,
                        alignItems: 'start',
                        marginBottom: 4,
                      }}
                    >
                      <Form.Item
                        {...rest}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: 'Chọn sản phẩm' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Chọn sản phẩm"
                          showSearch
                          optionFilterProp="label"
                          onChange={() => {
                            // Reset sizeId khi đổi sản phẩm
                            const allItems = form.getFieldValue('items') || [];
                            allItems[name] = { ...allItems[name], sizeId: undefined };
                            form.setFieldsValue({ items: allItems });
                          }}
                          options={products.map((p) => ({
                            value: p.id,
                            label: p.name,
                          }))}
                        />
                      </Form.Item>

                      {/* Size Select */}
                      <Form.Item
                        {...rest}
                        name={[name, 'sizeId']}
                        style={{ marginBottom: 0 }}
                      >
                        {hasSizes ? (
                          <Select
                            placeholder="Chọn size"
                            allowClear
                            onChange={() => form.setFieldsValue({})}
                            options={sortedSizes.map((s) => ({
                              value: s.id,
                              label: s.name,
                              disabled: takenSizeKeys.has(s.id),
                            }))}
                          />
                        ) : (
                          <Select
                            disabled
                            placeholder="Mặc định"
                            value={undefined}
                          />
                        )}
                      </Form.Item>

                      <div style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        color: '#666',
                        fontSize: 13,
                      }}>
                        {unitPrice > 0 ? formatCurrency(unitPrice) : '—'}
                      </div>

                      <Form.Item
                        {...rest}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'SL' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={1}
                          style={{ width: '100%' }}
                          onChange={() => form.setFieldsValue({})}
                        />
                      </Form.Item>

                      <div style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontWeight: 500,
                        color: subtotal > 0 ? '#8B6914' : '#ccc',
                        fontSize: 13,
                      }}>
                        {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                      </div>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        style={{ height: 32 }}
                      />
                    </div>
                  );
                })}

                {/* Tổng cộng */}
                {fields.length > 0 && (() => {
                  const items = form.getFieldValue('items') || [];
                  const grandTotal = items.reduce((sum: number, item: any) => {
                    if (!item?.productId || !item?.quantity) return sum;
                    const product = products.find((p) => p.id === item.productId);
                    return sum + (getItemPrice(product, item.sizeId) * item.quantity);
                  }, 0);

                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0 4px',
                      borderTop: '2px solid #f0f0f0',
                      marginTop: 8,
                    }}>
                      <span style={{ fontWeight: 600, color: '#333' }}>Tổng cộng</span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: '#8B6914',
                      }}>
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  );
                })()}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  Thêm sản phẩm
                </Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>

          {/* ========== Section vật tư đi kèm ========== */}
          <Divider style={{ borderColor: '#d9d9d9' }}>
            <Space size={6}>
              <InboxOutlined style={{ color: '#1677ff' }} />
              <span>Vật tư đi kèm</span>
              <Tag color="blue" style={{ margin: 0 }}>tuỳ chọn</Tag>
            </Space>
          </Divider>

          <Form.List name="supplyItems">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => {
                  const supplyItemsList = form.getFieldValue('supplyItems') || [];
                  const currentItem = supplyItemsList[name] || {};
                  const selectedSupply = allSupplies.find((s: any) => s.id === currentItem.supplyId);
                  const unitPrice = Number(currentItem.unitPrice ?? 0);
                  const quantity = currentItem.quantity || 0;
                  const subtotal = unitPrice * quantity;

                  return (
                    <div key={key} style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                      padding: '8px 10px',
                      background: '#fafafa',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}>
                      {/* Vật tư */}
                      <Form.Item
                        {...rest}
                        name={[name, 'supplyId']}
                        rules={[{ required: true, message: 'Chọn vật tư' }]}
                        style={{ flex: '1 1 180px', minWidth: 180, marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Chọn vật tư..."
                          showSearch
                          optionFilterProp="label"
                          options={supplyOptions}
                        />
                      </Form.Item>

                      {/* Số lượng */}
                      <Form.Item
                        {...rest}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'SL' }]}
                        initialValue={1}
                        style={{ width: 80, marginBottom: 0 }}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="SL" />
                      </Form.Item>

                      {/* Đơn giá */}
                      <Form.Item
                        {...rest}
                        name={[name, 'unitPrice']}
                        initialValue={0}
                        style={{ width: 110, marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          step={1000}
                          style={{ width: '100%' }}
                          placeholder="Giá"
                          addonAfter="₫"
                          formatter={(val) => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                          parser={(val) => (val ? Number(val.replace(/,/g, '')) : 0) as any}
                        />
                      </Form.Item>

                      {/* Thành tiền */}
                      <div style={{ minWidth: 80, textAlign: 'right', fontSize: 13, fontWeight: 500, color: subtotal > 0 ? '#8B6914' : '#bfbfbf' }}>
                        {subtotal > 0 ? formatCurrency(subtotal) : '0 ₫'}
                      </div>

                      {/* Xoá */}
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        size="small"
                      />
                    </div>
                  );
                })}

                <Button
                  type="dashed"
                  onClick={() => add({ quantity: 1, unitPrice: 0 })}
                  block
                  icon={<InboxOutlined />}
                  style={{ marginTop: 4, borderColor: '#1677ff', color: '#1677ff' }}
                >
                  Thêm vật tư
                </Button>
              </>
            )}
          </Form.List>

          {/* ========== Section quà tặng kèm ========== */}
          <Divider style={{ borderColor: '#d9d9d9' }}>
            <Space size={6}>
              <GiftOutlined style={{ color: '#eb2f96' }} />
              <span>Quà tặng kèm</span>
              <Tag color="pink" style={{ margin: 0 }}>tuỳ chọn</Tag>
            </Space>
          </Divider>

          <Form.List name="giftItems">
            {(fields, { add, remove }) => (
              <>
                {fields.length > 0 && (
                  <div className="order-item-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 120px 100px 80px 110px 40px',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0',
                    marginBottom: 8,
                    color: '#888',
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    <span>Sản phẩm tặng</span>
                    <span>Size</span>
                    <span>Giá tặng</span>
                    <span>SL</span>
                    <span style={{ textAlign: 'right' }}>Thành tiền</span>
                    <span />
                  </div>
                )}

                {fields.map(({ key, name, ...rest }) => {
                  const giftItems = form.getFieldValue('giftItems') || [];
                  const currentItem = giftItems[name] || {};
                  const selectedProductId = currentItem.productId;
                  const selectedProduct = products.find((p) => p.id === selectedProductId);
                  const customPrice = Number(currentItem.customPrice ?? 0);
                  const quantity = currentItem.quantity || 0;
                  const subtotal = customPrice * quantity;

                  // Tính các sizeId đã chọn cho cùng productId ở các dòng gift khác (không check chéo items thường)
                  const takenSizeKeys = new Set<string>();
                  giftItems.forEach((item: any, idx: number) => {
                    if (idx !== name && item?.productId === selectedProductId) {
                      takenSizeKeys.add(item?.sizeId || 'default');
                    }
                  });

                  const hasSizes = selectedProduct?.sizes && selectedProduct.sizes.length > 0;
                  const sortedSizes = hasSizes
                    ? [...selectedProduct!.sizes!]
                        .filter((s) => s.isActive)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                    : [];

                  return (
                    <div
                      key={key}
                      className="order-item-grid order-gift-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 120px 100px 80px 110px 40px',
                        gap: 8,
                        alignItems: 'start',
                        marginBottom: 4,
                      }}
                    >
                      <Form.Item
                        {...rest}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: 'Chọn SP' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Chọn quà tặng"
                          showSearch
                          optionFilterProp="label"
                          onChange={() => {
                            // Reset sizeId khi đổi sản phẩm
                            const allGiftItems = form.getFieldValue('giftItems') || [];
                            allGiftItems[name] = { ...allGiftItems[name], sizeId: undefined };
                            form.setFieldsValue({ giftItems: allGiftItems });
                          }}
                          options={products.map((p) => ({
                            value: p.id,
                            label: p.name,
                          }))}
                        />
                      </Form.Item>

                      {/* Size Select */}
                      <Form.Item
                        {...rest}
                        name={[name, 'sizeId']}
                        style={{ marginBottom: 0 }}
                      >
                        {hasSizes ? (
                          <Select
                            placeholder="Chọn size"
                            allowClear
                            onChange={() => form.setFieldsValue({})}
                            options={sortedSizes.map((s) => ({
                              value: s.id,
                              label: s.name,
                              disabled: takenSizeKeys.has(s.id),
                            }))}
                          />
                        ) : (
                          <Select
                            disabled
                            placeholder="Mặc định"
                            value={undefined}
                          />
                        )}
                      </Form.Item>

                      <Form.Item
                        {...rest}
                        name={[name, 'customPrice']}
                        initialValue={0}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          step={1000}
                          style={{ width: '100%' }}
                          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          onChange={() => form.setFieldsValue({})}
                        />
                      </Form.Item>

                      <Form.Item
                        {...rest}
                        name={[name, 'quantity']}
                        initialValue={1}
                        rules={[{ required: true, message: 'SL' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={1}
                          style={{ width: '100%' }}
                          onChange={() => form.setFieldsValue({})}
                        />
                      </Form.Item>

                      <div style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontWeight: 500,
                        color: subtotal > 0 ? '#eb2f96' : '#ccc',
                        fontSize: 13,
                      }}>
                        {formatCurrency(subtotal)}
                      </div>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        style={{ height: 32 }}
                      />
                    </div>
                  );
                })}

                <Button
                  type="dashed"
                  onClick={() => add({ customPrice: 0, quantity: 1 })}
                  block
                  icon={<GiftOutlined />}
                  style={{ marginTop: 4, borderColor: '#eb2f96', color: '#eb2f96' }}
                >
                  Thêm quà tặng
                </Button>
              </>
            )}
          </Form.List>

          {/* ========== Tổng hợp cuối cùng ========== */}
          <Form.Item noStyle shouldUpdate>
            {() => {
              const items = form.getFieldValue('items') || [];
              const giftItems = form.getFieldValue('giftItems') || [];

              const productTotal = items.reduce((sum: number, item: any) => {
                if (!item?.productId || !item?.quantity) return sum;
                const p = products.find((pr) => pr.id === item.productId);
                return sum + (getItemPrice(p, item.sizeId) * item.quantity);
              }, 0);

              const giftTotal = giftItems.reduce((sum: number, item: any) => {
                if (!item?.productId) return sum;
                return sum + (Number(item.customPrice ?? 0) * (item.quantity || 1));
              }, 0);

              const supplyItemsData = form.getFieldValue('supplyItems') || [];
              const supplyTotal = supplyItemsData.reduce((sum: number, item: any) => {
                if (!item?.supplyId) return sum;
                return sum + (Number(item.unitPrice ?? 0) * (item.quantity || 1));
              }, 0);

              const grandTotal = productTotal + giftTotal + supplyTotal;

              if (items.length === 0 && giftItems.length === 0 && supplyItemsData.length === 0) return null;

              return (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#666' }}>
                    <span>Sản phẩm</span>
                    <span>{formatCurrency(productTotal)}</span>
                  </div>
                  {supplyItemsData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#1677ff' }}>
                      <span>Vật tư đi kèm</span>
                      <span>{formatCurrency(supplyTotal)}</span>
                    </div>
                  )}
                  {giftItems.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#eb2f96' }}>
                      <span>Quà tặng kèm</span>
                      <span>{formatCurrency(giftTotal)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid #e8e8e8',
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#8B6914',
                  }}>
                    <span>TỔNG CỘNG</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chi tiết đơn hàng */}
      <Modal
        title={`Chi tiết đơn hàng: ${selectedOrder?.orderNumber || ''}`}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setOrderEstimate(null);
        }}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã đơn">{selectedOrder.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={orderStatusMap[selectedOrder.status]?.color}>
                  {orderStatusMap[selectedOrder.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selectedOrder.customerName}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{selectedOrder.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {selectedOrder.address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền" span={2}>
                <strong style={{ color: '#8B6914', fontSize: 16 }}>
                  {formatCurrency(selectedOrder.totalAmount)}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDateTime(selectedOrder.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Xuất kho">
                {selectedOrder.deductStock !== false
                  ? <Tag color="green">Có xuất kho</Tag>
                  : <Tag color="orange">Không xuất kho</Tag>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>{selectedOrder.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>Sản phẩm trong đơn</Divider>

            {isMobile ? (
              /* Mobile: Product card list */
              <>
                {selectedOrder.items.map((item: any) => (
                  <div key={item.id} style={{
                    background: item.isGift ? '#fff7fa' : '#fafafa',
                    border: `1px solid ${item.isGift ? '#ffd6e7' : '#f0f0f0'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13 }}>{item.product?.name}</strong>
                        {item.size && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{item.size.name}</Tag>}
                        {item.isGift && <Tag color="pink" style={{ margin: 0, fontSize: 11 }}><GiftOutlined /> Tặng</Tag>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: item.isGift ? '#eb2f96' : '#666' }}>
                        {formatCurrency(item.unitPrice)}{item.isGift && Number(item.unitPrice) === 0 ? ' (Free)' : ''} × {item.quantity}
                      </span>
                      <strong style={{ color: item.isGift ? '#eb2f96' : '#8B6914', fontSize: 14 }}>
                        {formatCurrency(item.subtotal)}
                      </strong>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <Table
                dataSource={selectedOrder.items}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Sản phẩm',
                    dataIndex: ['product', 'name'],
                    render: (name: string, record: any) => (
                      <Space>
                        <span>{name}</span>
                        {record.size && (
                          <Tag color="blue" style={{ margin: '0 0 0 4px' }}>{record.size.name}</Tag>
                        )}
                        {record.isGift && <Tag color="pink" style={{ margin: 0 }}><GiftOutlined /> Tặng</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'unitPrice',
                    render: (v: number, record: any) => (
                      <span style={{ color: record.isGift ? '#eb2f96' : undefined }}>
                        {formatCurrency(v)}
                        {record.isGift && Number(v) === 0 && ' (Free)'}
                      </span>
                    ),
                  },
                  { title: 'SL', dataIndex: 'quantity' },
                  {
                    title: 'Thành tiền',
                    dataIndex: 'subtotal',
                    render: (v: number, record: any) => (
                      <span style={{ color: record.isGift ? '#eb2f96' : undefined }}>
                        {formatCurrency(v)}
                      </span>
                    ),
                  },
                ]}
              />
            )}

            {/* ========== Vật tư đi kèm ========== */}
            {selectedOrder?.supplyItems && selectedOrder.supplyItems.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }}>
                  <Space size={4}>
                    <InboxOutlined style={{ color: '#1677ff' }} />
                    <span style={{ fontSize: 13 }}>Vật tư đi kèm</span>
                  </Space>
                </Divider>
                {selectedOrder.supplyItems.map((si: any) => (
                  <div key={si.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #f5f5f5',
                    fontSize: 13,
                  }}>
                    <div>
                      <span>{si.supply?.name || '—'}</span>
                      <Tag style={{ marginLeft: 6, fontSize: 10 }}>{si.supply?.unit}</Tag>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#666' }}>{Number(si.quantity).toLocaleString()} × {formatCurrency(si.unitPrice)}</span>
                      <span style={{ marginLeft: 8, fontWeight: 600, color: '#8B6914' }}>{formatCurrency(si.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ========== Chi tiết định lượng (chỉ hiển thị khi đơn có xuất định lượng) ========== */}
            {orderEstimate && selectedOrder.deductStock !== false && (
              <>
                <Divider>
                  <Space>
                    <ExperimentOutlined style={{ color: '#8B6914' }} />
                    Chi tiết định lượng nguyên liệu
                  </Space>
                </Divider>

                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                    padding: '10px 16px',
                    background: '#fafafa',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <span style={{ color: '#999', fontSize: 12 }}>Tổng chi phí NL</span>
                    <div style={{ fontWeight: 700, color: '#8B6914', fontSize: 15 }}>
                      {formatCurrency(orderEstimate.totalEstimatedCost)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#999', fontSize: 12 }}>Số nguyên liệu</span>
                    <div style={{ fontWeight: 600 }}>{orderEstimate.ingredients.length} loại</div>
                  </div>
                  <div>
                    <span style={{ color: '#999', fontSize: 12 }}>Trạng thái</span>
                    <div>
                      {orderEstimate.hasShortage ? (
                        <Tag color="red" icon={<WarningOutlined />}>Thiếu NL</Tag>
                      ) : (
                        <Tag color="green" icon={<CheckCircleOutlined />}>Đủ NL</Tag>
                      )}
                    </div>
                  </div>
                </div>

                {isMobile ? (
                  /* Mobile: Ingredient card list */
                  <>
                    {orderEstimate.ingredients.map((ing: any) => (
                      <div key={ing.ingredientId} style={{
                        background: ing.shortage > 0 ? '#fff2f0' : '#fafafa',
                        border: `1px solid ${ing.shortage > 0 ? '#ffccc7' : '#f0f0f0'}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 6,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontSize: 13 }}>{ing.ingredientName}</strong>
                            <Tag style={{ margin: 0, fontSize: 10 }}>{ing.unit}</Tag>
                          </div>
                          {ing.shortage > 0 ? (
                            <Tag color="red" style={{ margin: 0, fontSize: 11 }}>-{Number(ing.shortage).toLocaleString()}</Tag>
                          ) : (
                            <Tag color="green" style={{ margin: 0, fontSize: 11 }}>Đủ</Tag>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                          <span>Cần: <strong>{Number(ing.totalNeeded).toLocaleString()}</strong></span>
                          <span>Kho: <span style={{ color: ing.shortage > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>{Number(ing.currentStock).toLocaleString()}</span></span>
                          <strong style={{ color: '#8B6914' }}>{formatCurrency(ing.estimatedCost)}</strong>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <Table
                    dataSource={orderEstimate.ingredients}
                    rowKey="ingredientId"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Nguyên liệu',
                        dataIndex: 'ingredientName',
                        render: (name: string, record: any) => (
                          <span>
                            {name}
                            {record.shortage > 0 && (
                              <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />
                            )}
                          </span>
                        ),
                      },
                      {
                        title: 'Đơn vị',
                        dataIndex: 'unit',
                        width: 70,
                        render: (u: string) => <Tag>{u}</Tag>,
                      },
                      {
                        title: 'Cần dùng',
                        dataIndex: 'totalNeeded',
                        width: 90,
                        render: (v: number) => <strong>{Number(v).toLocaleString()}</strong>,
                      },
                      {
                        title: 'Tồn kho',
                        dataIndex: 'currentStock',
                        width: 90,
                        render: (v: number, record: any) => (
                          <span style={{ color: record.shortage > 0 ? '#ff4d4f' : '#52c41a' }}>
                            {Number(v).toLocaleString()}
                          </span>
                        ),
                      },
                      {
                        title: 'Thiếu',
                        dataIndex: 'shortage',
                        width: 80,
                        render: (v: number) =>
                          v > 0 ? (
                            <Tag color="red">-{Number(v).toLocaleString()}</Tag>
                          ) : (
                            <Tag color="green">Đủ</Tag>
                          ),
                      },
                      {
                        title: 'Đơn giá',
                        dataIndex: 'costPerUnit',
                        width: 100,
                        render: (v: number) => v ? formatCurrency(v) : '—',
                      },
                      {
                        title: 'Chi phí',
                        dataIndex: 'estimatedCost',
                        width: 110,
                        render: (v: number) => formatCurrency(v),
                      },
                    ]}
                  />
                )}
              </>
            )}

            {selectedOrder.status === 'pending' && selectedOrder.deductStock !== false && (
              <div style={{ marginTop: 12, color: '#999', fontSize: 12, fontStyle: 'italic' }}>
                * Thông tin định lượng sẽ hiển thị sau khi đơn hàng được xác nhận.
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

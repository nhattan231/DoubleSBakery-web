'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  DatePicker,
  Space,
  Button,
  Modal,
  Divider,
  Statistic,
  Row,
  Col,
  Tabs,
  Input,
  Radio,
  message,
} from 'antd';
import {
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  CalculatorOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { productionApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { EstimateHistoryItem, EstimateType, PaginationMeta } from '@/types';
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

export default function EstimateHistoryPage() {
  const [activeTab, setActiveTab] = useState<EstimateType>('ORDER');
  const [data, setData] = useState<EstimateHistoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<EstimateHistoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params: any = { page, limit: 20, type: activeTab };
        if (dateRange) {
          params.startDate = dateRange[0].format('YYYY-MM-DD');
          params.endDate = dateRange[1].format('YYYY-MM-DD');
        }
        if (searchText.trim()) {
          params.search = searchText.trim();
        }
        const res = await productionApi.getEstimateHistory(params);
        setData(res.data.list || []);
        setPagination(
          res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
        );
      } catch {
        message.error('Không thể tải lịch sử');
      } finally {
        setLoading(false);
      }
    },
    [dateRange, activeTab, searchText],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await productionApi.getEstimateDetail(id);
      setDetailData(res.data.data);
    } catch {
      message.error('Không thể tải chi tiết');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as EstimateType);
    setDatePreset('all');
    setDateRange(null);
    setSearchText('');
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') return; // giữ RangePicker mở, chờ user chọn
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

  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const handleSearchDebounce = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchText(value);
    }, 400);
  };

  // ========== Columns cho tab Đơn hàng ==========
  const orderColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 140,
      render: (val: string) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'products',
      key: 'products',
      render: (products: EstimateHistoryItem['products']) => (
        <Space size={[0, 4]} wrap>
          {products.map((p, i) => (
            <Tag key={i}>
              {p.productName}
              {p.sizeName ? ` (${p.sizeName})` : ''} x{p.quantity}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Tổng chi phí NL',
      dataIndex: 'totalEstimatedCost',
      key: 'totalEstimatedCost',
      width: 150,
      render: (val: number) => (
        <strong style={{ color: '#8B6914' }}>{formatCurrency(val)}</strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'hasShortage',
      key: 'hasShortage',
      width: 110,
      render: (hasShortage: boolean) =>
        hasShortage ? (
          <Tag color="red" icon={<WarningOutlined />}>
            Thiếu NL
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Đủ NL
          </Tag>
        ),
    },
    {
      title: 'Người tạo',
      dataIndex: 'creator',
      key: 'creator',
      width: 120,
      render: (creator: EstimateHistoryItem['creator']) => creator?.name || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: EstimateHistoryItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.id)}
        >
          Xem
        </Button>
      ),
    },
  ];

  // ========== Columns cho tab Ước tính ==========
  const estimateColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'products',
      key: 'products',
      render: (products: EstimateHistoryItem['products']) => (
        <Space size={[0, 4]} wrap>
          {products.map((p, i) => (
            <Tag key={i}>
              {p.productName}
              {p.sizeName ? ` (${p.sizeName})` : ''} x{p.quantity}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Tổng chi phí NL',
      dataIndex: 'totalEstimatedCost',
      key: 'totalEstimatedCost',
      width: 150,
      render: (val: number) => (
        <strong style={{ color: '#8B6914' }}>{formatCurrency(val)}</strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'hasShortage',
      key: 'hasShortage',
      width: 110,
      render: (hasShortage: boolean) =>
        hasShortage ? (
          <Tag color="red" icon={<WarningOutlined />}>
            Thiếu NL
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Đủ NL
          </Tag>
        ),
    },
    {
      title: 'Người tạo',
      dataIndex: 'creator',
      key: 'creator',
      width: 120,
      render: (creator: EstimateHistoryItem['creator']) => creator?.name || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: EstimateHistoryItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.id)}
        >
          Xem
        </Button>
      ),
    },
  ];

  const ingredientColumns = [
    {
      title: 'Nguyên liệu',
      dataIndex: 'ingredientName',
      key: 'ingredientName',
      render: (name: string, record: any) => (
        <span>
          {name}
          {record.shortage > 0 && (
            <WarningOutlined style={{ marginLeft: 6, color: '#ff4d4f' }} />
          )}
        </span>
      ),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => <Tag>{unit}</Tag>,
    },
    {
      title: 'Cần sử dụng',
      dataIndex: 'totalNeeded',
      key: 'totalNeeded',
      render: (val: number) => <strong>{Number(val).toLocaleString()}</strong>,
    },
    {
      title: 'Tồn kho (lúc tạo)',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (val: number, record: any) => (
        <span style={{ color: record.shortage > 0 ? '#ff4d4f' : '#52c41a' }}>
          {Number(val).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Thiếu',
      dataIndex: 'shortage',
      key: 'shortage',
      render: (val: number) =>
        val > 0 ? (
          <Tag color="red">-{Number(val).toLocaleString()}</Tag>
        ) : (
          <Tag color="green">Đủ</Tag>
        ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      render: (val: number) => val ? formatCurrency(val) : '—',
    },
    {
      title: 'Chi phí ước tính',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      render: (val: number) => formatCurrency(val),
    },
  ];

  const columns = activeTab === 'ORDER' ? orderColumns : estimateColumns;

  const filterBar = (
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
        style={{ width: 240 }}
        allowClear
      />

      <Input.Search
        placeholder={
          activeTab === 'ORDER'
            ? 'Mã đơn, tên SP...'
            : 'Tên sản phẩm...'
        }
        allowClear
        onSearch={(value) => handleSearchChange(value)}
        onChange={(e) => handleSearchDebounce(e.target.value)}
        style={{ width: 200 }}
      />

      <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
        Tải lại
      </Button>
    </div>
  );

  const tableContent = (
    <>
      {filterBar}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          onChange: (page) => fetchData(page),
        }}
      />
    </>
  );

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        <HistoryOutlined /> Lịch sử xuất định lượng
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'ORDER',
              label: (
                <span>
                  <ShoppingCartOutlined /> Theo đơn hàng
                </span>
              ),
              children: tableContent,
            },
            {
              key: 'ESTIMATE',
              label: (
                <span>
                  <CalculatorOutlined /> Ước tính thủ công
                </span>
              ),
              children: tableContent,
            },
          ]}
        />
      </Card>

      <Modal
        title={
          detailData?.type === 'ORDER'
            ? `Chi tiết xuất ĐL — ${detailData?.orderNumber || ''}`
            : 'Chi tiết ước tính nguyên liệu'
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={900}
        loading={detailLoading}
      >
        {detailData && (
          <>
            {detailData.type === 'ORDER' && detailData.orderNumber && (
              <div style={{ marginBottom: 16 }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                  Đơn hàng: {detailData.orderNumber}
                </Tag>
              </div>
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="Tổng chi phí NL"
                  value={detailData.totalEstimatedCost}
                  formatter={(val) => formatCurrency(Number(val))}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Số nguyên liệu"
                  value={detailData.ingredients.length}
                  suffix="loại"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Trạng thái"
                  valueRender={() =>
                    detailData.hasShortage ? (
                      <Tag color="red" icon={<WarningOutlined />}>
                        Thiếu NL
                      </Tag>
                    ) : (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        Đủ NL
                      </Tag>
                    )
                  }
                />
              </Col>
            </Row>

            <Divider orientation="left">Sản phẩm</Divider>
            <div style={{ marginBottom: 16 }}>
              {detailData.products.map((p, i) => (
                <Tag key={i} style={{ marginBottom: 4, padding: '4px 12px' }}>
                  {p.productName}
                  {p.sizeName ? ` (${p.sizeName})` : ''} x {p.quantity}
                </Tag>
              ))}
            </div>

            <Divider orientation="left">Chi tiết nguyên liệu</Divider>
            <Table
              columns={ingredientColumns}
              dataSource={detailData.ingredients}
              rowKey="ingredientId"
              pagination={false}
              size="small"
              rowClassName={(record) =>
                record.shortage > 0 ? 'ant-table-row-warning' : ''
              }
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={6}>
                    <strong>Tổng chi phí nguyên liệu</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    <strong style={{ color: '#8B6914' }}>
                      {formatCurrency(detailData.totalEstimatedCost)}
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
              Tạo lúc: {formatDateTime(detailData.createdAt)}
              {detailData.creator && ` | Bởi: ${detailData.creator.name}`}
              {detailData.notes && ` | ${detailData.notes}`}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

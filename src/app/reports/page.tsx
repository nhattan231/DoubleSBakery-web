'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Table,
  Typography,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  ShoppingCartOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { ComparisonReport, TopProduct } from '@/types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = ['#8B6914', '#B8860B', '#DAA520', '#D2B48C', '#DEB887', '#F5DEB3', '#C4A265', '#A67B3D', '#8C7853', '#7B6B43'];

function ChangeTag({ value }: { value: number | undefined }) {
  if (value === undefined || value === null) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return <Tag style={{ fontSize: 11 }}>0%</Tag>;
  const isUp = rounded > 0;
  return (
    <Tag
      color={isUp ? 'green' : 'red'}
      style={{ fontSize: 11, marginLeft: 4 }}
      icon={isUp ? <CaretUpOutlined /> : <CaretDownOutlined />}
    >
      {isUp ? '+' : ''}{rounded}%
    </Tag>
  );
}

function RevenueTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e0d0',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        {dayjs(label).format('DD/MM/YYYY')}
      </Text>
      <Text style={{ color: '#8B6914' }}>
        Doanh thu: {formatCurrency(Number(payload[0]?.value || 0))}
      </Text>
      {payload[0]?.payload?.order_count && (
        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
          {Number(payload[0].payload.order_count)} đơn hàng
        </Text>
      )}
    </div>
  );
}

function TopProductTooltipContent({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e0d0',
      borderRadius: 6,
      padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        {data.displayName}
      </Text>
      <Text style={{ color: '#8B6914', display: 'block' }}>
        Doanh thu: {formatCurrency(Number(data.totalRevenue))}
      </Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Số lượng: {Number(data.totalQuantity).toLocaleString()}
      </Text>
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);

  const fetchReports = async () => {
    setLoading(true);
    const params = { startDate: dateRange[0], endDate: dateRange[1] };

    try {
      const [compRes, topRes, revenueRes] = await Promise.all([
        reportsApi.comparison(params).catch(() => null),
        reportsApi.topProducts(params).catch(() => null),
        reportsApi.revenue(params).catch(() => null),
      ]);

      if (compRes) setComparison(compRes.data.data);
      if (topRes) setTopProducts(topRes.data.list || []);
      if (revenueRes) {
        const daily = revenueRes.data.data?.dailyRevenue || [];
        setRevenueData(
          [...daily].sort((a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        );
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const current = comparison?.current;
  const changes = comparison?.changes;

  const topProductChartData = topProducts.map((p) => ({
    ...p,
    displayName: p.sizeName
      ? `${p.productName} (${p.sizeName})`
      : p.productName,
    totalQuantity: Number(p.totalQuantity),
    totalRevenue: Number(p.totalRevenue),
  }));

  const topProductColumns = [
    {
      title: '#',
      key: 'rank',
      render: (_: any, __: any, index: number) => (
        <span>
          {index < 3 ? (
            <TrophyOutlined
              style={{
                color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                fontSize: 16,
              }}
            />
          ) : (
            index + 1
          )}
        </span>
      ),
      width: 50,
    },
    {
      title: 'Sản phẩm',
      key: 'productName',
      render: (_: any, record: TopProduct) => (
        <span>
          <strong>{record.productName}</strong>
          {record.sizeName && (
            <Tag style={{ marginLeft: 6, fontSize: 11 }}>{record.sizeName}</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      align: 'right' as const,
      render: (val: any) => Number(val).toLocaleString(),
      sorter: (a: any, b: any) => Number(a.totalQuantity) - Number(b.totalQuantity),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      render: (val: any) => formatCurrency(Number(val)),
      sorter: (a: any, b: any) => Number(a.totalRevenue) - Number(b.totalRevenue),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Báo cáo doanh thu & chi phí
        </Title>
        <RangePicker
          value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([
                dates[0].format('YYYY-MM-DD'),
                dates[1].format('YYYY-MM-DD'),
              ]);
            }
          }}
        />
      </div>

      <Spin spinning={loading}>
        {/* Thống kê tổng hợp - 5 cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={5}>
            <Card size="small">
              <Statistic
                title="Doanh thu"
                value={current?.revenue || 0}
                formatter={(val) => formatCurrency(Number(val))}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
              <ChangeTag value={changes?.revenue} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card size="small">
              <Statistic
                title={
                  <Tooltip title="Chi phí NL thực tế sử dụng cho đơn hàng (tính từ công thức)">
                    <span style={{ cursor: 'help', borderBottom: '1px dashed #999' }}>
                      Chi phí NL sử dụng
                    </span>
                  </Tooltip>
                }
                value={current?.actualIngredientCost || 0}
                formatter={(val) => formatCurrency(Number(val))}
                prefix={<FallOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
              <ChangeTag value={changes?.actualIngredientCost} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card size="small">
              <Statistic
                title={
                  <Tooltip title="Tổng tiền đã chi mua nguyên liệu (từ đơn mua hàng)">
                    <span style={{ cursor: 'help', borderBottom: '1px dashed #999' }}>
                      Tiền mua NL
                    </span>
                  </Tooltip>
                }
                value={current?.cost || 0}
                formatter={(val) => formatCurrency(Number(val))}
                prefix={<FallOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              <ChangeTag value={changes?.cost} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card size="small">
              <Statistic
                title={
                  <Tooltip title="Lợi nhuận = Doanh thu - Chi phí NL sử dụng">
                    <span style={{ cursor: 'help', borderBottom: '1px dashed #999' }}>
                      Lợi nhuận
                    </span>
                  </Tooltip>
                }
                value={current?.profit || 0}
                formatter={(val) => formatCurrency(Number(val))}
                prefix={<RiseOutlined />}
                valueStyle={{
                  color: (current?.profit || 0) >= 0 ? '#3f8600' : '#cf1322',
                }}
              />
              <ChangeTag value={changes?.profit} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Đơn hàng"
                value={current?.totalOrders || 0}
                prefix={<ShoppingCartOutlined />}
                suffix={
                  current?.margin !== undefined ? (
                    <Tooltip title="Biên lợi nhuận">
                      <Tag
                        color={(current?.margin || 0) >= 0 ? 'green' : 'red'}
                        style={{ marginLeft: 4, fontSize: 11 }}
                      >
                        {(current?.margin || 0).toFixed(1)}%
                      </Tag>
                    </Tooltip>
                  ) : undefined
                }
              />
              <ChangeTag value={changes?.totalOrders} />
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ doanh thu */}
        <Card
          title="Doanh thu theo ngày"
          style={{ marginBottom: 24 }}
        >
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => dayjs(d).format('DD/MM')}
                  fontSize={12}
                  stroke="#999"
                />
                <YAxis
                  tickFormatter={(v) => {
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                    return v;
                  }}
                  fontSize={12}
                  stroke="#999"
                  width={60}
                />
                <RechartsTooltip content={<RevenueTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B6914"
                  strokeWidth={2}
                  dot={{ fill: '#8B6914', r: 4 }}
                  activeDot={{ r: 6, fill: '#8B6914' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              Không có dữ liệu doanh thu trong khoảng thời gian này
            </div>
          )}
        </Card>

        <Row gutter={24}>
          {/* Top sản phẩm - Biểu đồ ngang */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <TrophyOutlined style={{ color: '#FFD700', marginRight: 8 }} />
                  Top sản phẩm bán chạy
                </span>
              }
              style={{ marginBottom: 24 }}
            >
              {topProductChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, topProductChartData.length * 44)}>
                  <BarChart
                    data={topProductChartData}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => {
                        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                        return v;
                      }}
                      fontSize={11}
                      stroke="#999"
                    />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      width={140}
                      fontSize={12}
                      tick={{ fill: '#333' }}
                    />
                    <RechartsTooltip content={<TopProductTooltipContent />} />
                    <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={28}>
                      {topProductChartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  Không có dữ liệu sản phẩm
                </div>
              )}
            </Card>
          </Col>

          {/* Top sản phẩm - Bảng chi tiết */}
          <Col xs={24} lg={12}>
            <Card
              title="Chi tiết sản phẩm bán chạy"
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={topProductColumns}
                dataSource={topProducts}
                rowKey={(r) => `${r.productId}-${r.sizeId || 'default'}`}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}

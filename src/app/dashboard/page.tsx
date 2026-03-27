'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  AlertOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { formatCurrency, formatDateTime, orderStatusMap } from '@/lib/format';
import type { DashboardData, Order, Ingredient } from '@/types';
import { useDashboardQuery, useRecentOrdersQuery, useLowStockQuery } from '@/lib/hooks';

const { Title } = Typography;

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(false);

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardQuery();
  const { data: recentOrders = [], isLoading: ordersLoading } = useRecentOrdersQuery();
  const { data: lowStockIngredients = [], isLoading: lowStockLoading } = useLowStockQuery();

  const loading = dashboardLoading || ordersLoading || lowStockLoading;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const orderColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusInfo = orderStatusMap[status] || { label: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
  ];

  const lowStockColumns = [
    {
      title: 'Tên nguyên liệu',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Tồn kho',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock: number, record: Ingredient) => (
        <span style={{ color: stock < record.minStock ? '#ff4d4f' : undefined, fontWeight: stock < record.minStock ? 600 : undefined }}>
          {stock}
        </span>
      ),
    },
    {
      title: 'Tồn kho tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
    },
  ];

  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={3}>Tổng quan</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={dashboardData?.totalOrders || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đơn chờ xử lý"
              value={dashboardData?.pendingOrders || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Doanh thu hôm nay"
              value={dashboardData?.todayRevenue || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Nguyên liệu sắp hết"
              value={dashboardData?.lowStockCount || 0}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Đơn hàng gần đây">
            {isMobile ? (
              recentOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>Chưa có đơn hàng</div>
              ) : (
                recentOrders.map((order: Order) => {
                  const s = orderStatusMap[order.status] || { label: order.status, color: 'default' };
                  return (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{order.customerName}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{formatDateTime(order.createdAt)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#8B6914', fontSize: 13 }}>{formatCurrency(order.totalAmount)}</div>
                        <Tag color={s.color} style={{ margin: 0, fontSize: 10 }}>{s.label}</Tag>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <Table
                columns={orderColumns}
                dataSource={recentOrders}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Nguyên liệu tồn kho thấp">
            {isMobile ? (
              lowStockIngredients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>Tất cả đều đủ</div>
              ) : (
                lowStockIngredients.map((item: Ingredient) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                      <Tag style={{ fontSize: 10, margin: 0 }}>{item.unit}</Tag>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 13 }}>{Number(item.currentStock).toLocaleString()}</span>
                      <span style={{ color: '#999', fontSize: 12 }}> / {Number(item.minStock).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              <Table
                columns={lowStockColumns}
                dataSource={lowStockIngredients}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 400 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

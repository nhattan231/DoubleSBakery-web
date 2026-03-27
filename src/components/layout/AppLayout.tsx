'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Spin, Popover, Tag, Empty, Progress, Drawer } from 'antd';
import RouteLoadingBar from '@/components/RouteLoadingBar';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  ExperimentOutlined,
  ImportOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
  WarningOutlined,
  MenuOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import { ingredientsApi } from '@/lib/api';
import type { Ingredient } from '@/types';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: 'Đơn hàng',
  },
  {
    key: '/products',
    icon: <ShopOutlined />,
    label: 'Sản phẩm',
  },
  {
    key: '/ingredients',
    icon: <ExperimentOutlined />,
    label: 'Nguyên liệu',
  },
  {
    key: '/suppliers',
    icon: <TeamOutlined />,
    label: 'Nhà cung cấp',
  },
  {
    key: '/purchase-orders',
    icon: <ImportOutlined />,
    label: 'Nhập hàng',
  },
  {
    key: '/estimate',
    icon: <CalculatorOutlined />,
    label: 'Ước tính NL',
  },
  {
    key: '/estimate-history',
    icon: <HistoryOutlined />,
    label: 'Lịch sử xuất ĐL',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: 'Báo cáo',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: 'Cài đặt',
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loadFromStorage, isAuthenticated } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prefetch tất cả routes khi đã login → load nhanh khi bấm menu
  useEffect(() => {
    if (isAuthenticated) {
      menuItems.forEach((item) => {
        router.prefetch(item.key);
      });
    }
  }, [isAuthenticated, router]);

  // Bước 1: Load auth từ localStorage trước
  useEffect(() => {
    loadFromStorage();
    setInitialized(true);
  }, [loadFromStorage]);

  // Bước 2: Chỉ redirect khi đã load xong (bỏ qua trang công khai)
  const isPublicPage = pathname === '/login' || pathname === '/menu';
  useEffect(() => {
    if (initialized && !isAuthenticated && !isPublicPage) {
      router.push('/login');
    }
  }, [initialized, isAuthenticated, pathname, router, isPublicPage]);

  useEffect(() => {
    if (isAuthenticated) {
      ingredientsApi
        .getLowStock()
        .then((res) => {
          setLowStockItems(res.data.list || []);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Chưa load xong → hiện loading
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || isPublicPage) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const workflowSteps = [
    { step: 1, label: 'Nguyên liệu', desc: 'Tạo danh sách nguyên liệu', path: '/ingredients' },
    { step: 2, label: 'Nhà cung cấp', desc: 'Tạo thông tin NCC', path: '/suppliers' },
    { step: 3, label: 'Sản phẩm', desc: 'Tạo sản phẩm + công thức', path: '/products' },
    { step: 4, label: 'Nhập hàng', desc: 'Nhập nguyên liệu vào kho', path: '/purchase-orders' },
    { step: 5, label: 'Đơn hàng', desc: 'Tạo đơn, tự trừ kho', path: '/orders' },
    { step: 6, label: 'Báo cáo', desc: 'Doanh thu, chi phí, lợi nhuận', path: '/reports' },
  ];

  const currentStepIndex = workflowSteps.findIndex((s) => pathname.startsWith(s.path));

  const workflowContent = (
    <div style={{ width: 320 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#8B6914', marginBottom: 10 }}>
        Quy trình làm việc
      </div>
      {workflowSteps.map((s) => {
        const isActive = pathname.startsWith(s.path);
        return (
          <div
            key={s.step}
            onClick={() => router.push(s.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: isActive ? '#FFFDF5' : 'transparent',
              border: isActive ? '1px solid #F5E6C8' : '1px solid transparent',
              marginBottom: 4,
              transition: 'all 0.2s',
            }}
          >
            <Tag
              color={isActive ? 'gold' : 'default'}
              style={{ margin: 0, minWidth: 24, textAlign: 'center' }}
            >
              {s.step}
            </Tag>
            <div>
              <div style={{ fontWeight: isActive ? 600 : 400, fontSize: 13, color: isActive ? '#8B6914' : '#333' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>{s.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const notificationContent = (
    <div style={{ width: isMobile ? 'calc(100vw - 80px)' : 340, maxWidth: 340 }}>
      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: '#8B6914',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Cảnh báo tồn kho</span>
        {lowStockItems.length > 0 && (
          <Tag color="red">{lowStockItems.length}</Tag>
        )}
      </div>

      {lowStockItems.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Tất cả nguyên liệu đều đủ"
          style={{ padding: '16px 0' }}
        />
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {lowStockItems.map((item) => {
            const percent = item.minStock > 0
              ? Math.round((Number(item.currentStock) / Number(item.minStock)) * 100)
              : 0;
            const isOut = Number(item.currentStock) === 0;

            return (
              <div
                key={item.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: '#333' }}>
                    {isOut && <WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />}
                    {item.name}
                  </span>
                  <span style={{ fontSize: 12, color: isOut ? '#ff4d4f' : '#faad14', fontWeight: 600 }}>
                    {Number(item.currentStock).toLocaleString()} / {Number(item.minStock).toLocaleString()} {item.unit}
                  </span>
                </div>
                <Progress
                  percent={percent}
                  size="small"
                  showInfo={false}
                  strokeColor={isOut ? '#ff4d4f' : percent <= 50 ? '#faad14' : '#52c41a'}
                />
              </div>
            );
          })}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            paddingTop: 10,
            marginTop: 4,
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="link"
            size="small"
            onClick={() => router.push('/ingredients')}
            style={{ color: '#8B6914' }}
          >
            Xem tất cả nguyên liệu
          </Button>
        </div>
      )}
    </div>
  );

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.name} (${user?.role})`,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  const handleMenuClick = (key: string) => {
    router.push(key);
    if (isMobile) setDrawerOpen(false);
  };

  const sidebarMenu = (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          padding: '8px',
          cursor: 'pointer',
        }}
        onClick={() => handleMenuClick('/dashboard')}
      >
        <img
          src="/images/logo.jpg"
          alt="Double S Bakery"
          style={{ height: 48, width: 48, borderRadius: '50%', objectFit: 'cover' }}
        />
        <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#8B6914', whiteSpace: 'nowrap' }}>
          Double S Bakery
        </span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ borderRight: 0, marginTop: 8 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <RouteLoadingBar />
      {/* Desktop: Sider | Mobile: Drawer */}
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={250}
          styles={{ body: { padding: 0 } }}
        >
          {sidebarMenu}
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          style={{
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #f0f0f0',
              padding: '8px',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/dashboard')}
          >
            <img
              src="/images/logo.jpg"
              alt="Double S Bakery"
              style={{
                height: collapsed ? 40 : 48,
                width: collapsed ? 40 : 48,
                borderRadius: '50%',
                objectFit: 'cover',
                transition: 'all 0.2s',
              }}
            />
            {!collapsed && (
              <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#8B6914', whiteSpace: 'nowrap' }}>
                Double S Bakery
              </span>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ borderRight: 0, marginTop: 8 }}
          />
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            zIndex: 9,
          }}
        >
          {isMobile ? (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            {!isMobile && (
              <Popover content={workflowContent} trigger="click" placement="bottomRight">
                <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: '#8B6914' }}>
                  Quy trình
                </Button>
              </Popover>
            )}

            <Popover content={notificationContent} trigger="click" placement="bottomRight">
              <Badge count={lowStockItems.length} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Popover>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer', backgroundColor: '#8B6914' }} />
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: isMobile ? 12 : 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

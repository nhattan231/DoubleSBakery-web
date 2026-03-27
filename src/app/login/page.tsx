'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.email, values.password);
      const { accessToken, user } = res.data.data;

      if (!accessToken || !user) {
        throw new Error('Phản hồi từ server không hợp lệ');
      }

      setAuth(user, accessToken);
      message.success(`Xin chào, ${user.name}!`);

      // Dùng window.location để đảm bảo full reload,
      // tránh race condition với AppLayout auth check
      window.location.href = '/dashboard';
    } catch (err: any) {
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';

      if (err.response) {
        // Server trả về lỗi
        const status = err.response.status;
        if (status === 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
        } else if (status === 403) {
          errorMessage = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
        } else if (status === 429) {
          errorMessage = 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
        } else if (status >= 500) {
          errorMessage = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.';
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối đã hết thời gian chờ. Vui lòng thử lại.';
      }

      message.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE4C9 100%)',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#8B6914', margin: 0 }}>
            Double S Bakery
          </Title>
          <Text type="secondary">Hệ thống quản lý tiệm bánh</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ backgroundColor: '#8B6914' }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

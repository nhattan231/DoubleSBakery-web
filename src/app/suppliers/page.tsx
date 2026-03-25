'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  message,
  Popconfirm,
  Typography,
  Steps,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { suppliersApi } from '@/lib/api';
import type { Supplier } from '@/types';

const { Title } = Typography;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [form] = Form.useForm();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data.list || []);
    } catch {
      message.error('Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await suppliersApi.update(editing.id, values);
        message.success('Cập nhật nhà cung cấp thành công');
      } else {
        await suppliersApi.create(values);
        message.success('Thêm nhà cung cấp thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await suppliersApi.delete(id);
      message.success('Đã ngừng hoạt động nhà cung cấp');
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xoá');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await suppliersApi.update(id, { isActive: true });
      message.success('Đã kích hoạt lại nhà cung cấp');
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    form.setFieldsValue(supplier);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong style={{ color: '#8B6914' }}>{name}</strong>,
      sorter: (a: Supplier, b: Supplier) => a.name.localeCompare(b.name),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) =>
        phone ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <PhoneOutlined style={{ marginRight: 6, color: '#8B6914' }} />
            {phone}
          </span>
        ) : (
          <span style={{ color: '#ccc' }}>-</span>
        ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) =>
        email ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <MailOutlined style={{ marginRight: 6, color: '#8B6914' }} />
            {email}
          </span>
        ) : (
          <span style={{ color: '#ccc' }}>-</span>
        ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) =>
        address ? (
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <EnvironmentOutlined style={{ marginRight: 6, color: '#8B6914', flexShrink: 0 }} />
            {address}
          </span>
        ) : (
          <span style={{ color: '#ccc' }}>-</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
      filters: [
        { text: 'Hoạt động', value: true },
        { text: 'Ngừng', value: false },
      ],
      onFilter: (value: any, record: Supplier) => record.isActive === value,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Supplier) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Sửa
          </Button>
          {record.isActive ? (
            <Popconfirm
              title="Ngừng hoạt động nhà cung cấp này?"
              description="Nhà cung cấp sẽ không hiển thị khi tạo phiếu nhập mới."
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Ngừng
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Kích hoạt lại nhà cung cấp này?"
              description="Nhà cung cấp sẽ hiển thị lại trong danh sách chọn khi tạo phiếu nhập."
              onConfirm={() => handleReactivate(record.id)}
            >
              <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />}>
                Kích hoạt
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý nhà cung cấp
        </Title>
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
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setModalOpen(true);
            }}
            style={{ backgroundColor: '#8B6914' }}
          >
            Thêm nhà cung cấp
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
                title: 'Bước 1: Tạo nhà cung cấp',
                description:
                  'Bấm "Thêm nhà cung cấp" → nhập tên (bắt buộc), số điện thoại, email, địa chỉ. Đây là thông tin của nơi bạn mua nguyên liệu.',
              },
              {
                title: 'Bước 2: Sử dụng trong phiếu nhập hàng',
                description:
                  'Khi tạo phiếu nhập hàng (trang "Nhập hàng"), bạn sẽ thấy dropdown "Nhà cung cấp" hiển thị các NCC đã tạo. Chọn NCC tương ứng để theo dõi nguồn nhập.',
              },
              {
                title: 'Bước 3: Quản lý',
                description:
                  'Sửa thông tin NCC bất kỳ lúc nào. Nếu NCC ngừng hợp tác, bấm "Ngừng" để ẩn khỏi danh sách chọn khi nhập hàng, nhưng vẫn giữ lịch sử phiếu nhập cũ.',
              },
            ]}
          />

        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: 'Chưa có nhà cung cấp nào. Bấm "Thêm nhà cung cấp" để bắt đầu.' }}
        />
      </Card>

      {/* Modal tạo/sửa NCC */}
      <Modal
        title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editing ? 'Cập nhật' : 'Thêm mới'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Tên nhà cung cấp"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp' }]}
          >
            <Input placeholder="VD: Công ty Bột Mì Đại Phương" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="VD: 0901234567" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="VD: lienhe@botmi.vn" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="VD: 123 Nguyễn Trãi, Q.1, TP.HCM" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

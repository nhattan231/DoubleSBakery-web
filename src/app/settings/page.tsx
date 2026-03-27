'use client';

import { useState, useEffect } from 'react';
import {
  Card, Tabs, Form, Input, Button, Switch, InputNumber, Select,
  Upload, message, Typography, Space, TimePicker, Tag, Divider,
  ColorPicker, Popconfirm, Table, Modal, Spin, Image, Empty,
} from 'antd';
import {
  ShopOutlined, PhoneOutlined, ClockCircleOutlined, AppstoreOutlined,
  ShoppingCartOutlined, BgColorsOutlined, ShareAltOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  SaveOutlined, UploadOutlined, FacebookOutlined, InstagramOutlined,
  LinkOutlined, CopyOutlined, MenuOutlined, HolderOutlined,
} from '@ant-design/icons';
import { storeSettingsApi, categoriesApi, productsApi, uploadApi } from '@/lib/api';
import type { StoreSettings, Category, Product } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:2316';

/** Nếu URL đã là full URL (http/https) thì dùng trực tiếp, ngược lại ghép API_BASE */
const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

const dayLabels: Record<string, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
  sunday: 'Chủ nhật',
};

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const paymentOptions = [
  'Tiền mặt',
  'Chuyển khoản ngân hàng',
  'Momo',
  'ZaloPay',
  'VNPay',
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Product-category assignment modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningProduct, setAssigningProduct] = useState<Product | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);

  const [basicForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [orderForm] = Form.useForm();
  const [designForm] = Form.useForm();
  const [seoForm] = Form.useForm();
  const [catForm] = Form.useForm();

  // ===== Load data =====
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, categoriesRes, productsRes] = await Promise.all([
        storeSettingsApi.get(),
        categoriesApi.getAll().catch(() => ({ data: { data: null, list: [] } })),
        productsApi.getAll({ limit: 100 }).catch(() => ({ data: { list: [] } })),
      ]);

      const s = settingsRes.data.data || settingsRes.data;
      setSettings(s);
      setCategories(categoriesRes.data.list || categoriesRes.data.data || []);
      setProducts(productsRes.data.list || productsRes.data.data || []);

      // Populate forms
      basicForm.setFieldsValue({
        businessName: s.businessName,
        slogan: s.slogan,
        description: s.description,
      });

      contactForm.setFieldsValue({
        phone: s.phone,
        zalo: s.zalo,
        email: s.email,
        address: s.address,
        googleMapsUrl: s.googleMapsUrl,
        facebookUrl: s.facebookUrl,
        instagramUrl: s.instagramUrl,
        tiktokUrl: s.tiktokUrl,
      });

      orderForm.setFieldsValue({
        isOrderingEnabled: s.isOrderingEnabled,
        minOrderAmount: s.minOrderAmount,
        preparationTime: s.preparationTime,
        deliveryFeeNote: s.deliveryFeeNote,
        deliveryArea: s.deliveryArea,
        orderNote: s.orderNote,
        paymentMethods: s.paymentMethods || [],
        bankName: s.bankName,
        bankAccountNumber: s.bankAccountNumber,
        bankAccountName: s.bankAccountName,
      });

      designForm.setFieldsValue({
        menuLayout: s.menuLayout,
        showPrices: s.showPrices,
        showDescription: s.showDescription,
      });

      seoForm.setFieldsValue({
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
      });
    } catch (err) {
      message.error('Không thể tải cài đặt cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  // ===== Clear menu cache khi admin thay đổi =====
  const clearMenuCache = () => {
    try {
      localStorage.removeItem('menu_cache_settings');
      localStorage.removeItem('menu_cache_menu');
    } catch {}
  };

  // ===== Save helpers =====
  const saveSettings = async (data: Partial<StoreSettings>) => {
    setSaving(true);
    try {
      const res = await storeSettingsApi.update(data);
      const updated = res.data.data || res.data;
      setSettings(updated);
      clearMenuCache();
      message.success('Đã lưu thành công!');
    } catch {
      message.error('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ===== Upload helpers =====
  const handleUpload = async (file: File): Promise<string | null> => {
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data?.url || res.data.url;
      return url;
    } catch {
      message.error('Upload ảnh thất bại');
      return null;
    }
  };

  const handleLogoUpload = async (file: File) => {
    const url = await handleUpload(file);
    if (url) {
      await saveSettings({ logoUrl: url });
    }
    return false;
  };

  const handleBannerUpload = async (file: File) => {
    const url = await handleUpload(file);
    if (url && settings) {
      const banners = [...(settings.bannerUrls || []), url];
      await saveSettings({ bannerUrls: banners });
    }
    return false;
  };

  const removeBanner = async (idx: number) => {
    if (!settings) return;
    const banners = settings.bannerUrls.filter((_, i) => i !== idx);
    await saveSettings({ bannerUrls: banners });
  };

  // ===== Opening Hours =====
  const handleHoursChange = async (day: string, field: string, value: any) => {
    if (!settings) return;
    const currentHours = settings.openingHours || {} as any;
    const hours = { ...currentHours, [day]: { ...currentHours[day as keyof typeof currentHours], [field]: value } };
    await saveSettings({ openingHours: hours });
  };

  // ===== Category CRUD =====
  const handleSaveCategory = async () => {
    try {
      const values = await catForm.validateFields();
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, values);
        message.success('Đã cập nhật danh mục');
      } else {
        await categoriesApi.create(values);
        message.success('Đã thêm danh mục');
      }
      clearMenuCache();
      setCatModalOpen(false);
      catForm.resetFields();
      setEditingCategory(null);
      // Reload categories
      const res = await categoriesApi.getAll();
      setCategories(res.data.list || res.data.data || []);
    } catch {
      message.error('Lỗi khi lưu danh mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoriesApi.delete(id);
      message.success('Đã xóa danh mục');
      clearMenuCache();
      const res = await categoriesApi.getAll();
      setCategories(res.data.list || res.data.data || []);
    } catch {
      message.error('Xóa danh mục thất bại');
    }
  };

  // ===== Product-Category Assignment =====
  const openAssignModal = async (product: Product) => {
    setAssigningProduct(product);
    try {
      const res = await categoriesApi.getProductCategories(product.id);
      const data = res.data.list || res.data.data || res.data || [];
      setSelectedCatIds(Array.isArray(data) ? data.map((pc: any) => pc.categoryId || pc.category?.id) : []);
    } catch {
      setSelectedCatIds([]);
    }
    setAssignModalOpen(true);
  };

  const handleAssignCategories = async () => {
    if (!assigningProduct) return;
    try {
      await categoriesApi.setProductCategories(assigningProduct.id, selectedCatIds);
      message.success('Đã cập nhật danh mục cho sản phẩm');
      clearMenuCache();
      setAssignModalOpen(false);
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  // ===== Toggle Menu Public =====
  const handleTogglePublic = async (checked: boolean) => {
    await saveSettings({ isMenuPublic: checked });
  };

  // ===== Preview =====
  const handlePreview = () => {
    window.open('/menu?preview=true', '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  // =============================================
  // TAB 1: Thông tin cơ bản
  // =============================================
  const basicTab = (
    <div style={{ maxWidth: 700 }}>
      {/* Logo */}
      <Card size="small" title="Logo cửa hàng" style={{ marginBottom: 16 }}>
        <Space align="start" size={16}>
          {settings?.logoUrl ? (
            <Image
              src={getImageUrl(settings.logoUrl)}
              alt="Logo"
              width={100}
              height={100}
              style={{ borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 100, height: 100, borderRadius: 12,
              background: '#f5f5f5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#ccc', fontSize: 12,
            }}>
              Chưa có logo
            </div>
          )}
          <Upload beforeUpload={handleLogoUpload} showUploadList={false} accept="image/*">
            <Button icon={<UploadOutlined />}>Tải logo lên</Button>
          </Upload>
        </Space>
      </Card>

      {/* Banner */}
      <Card size="small" title="Ảnh banner / Slider" style={{ marginBottom: 16 }}>
        <Space wrap>
          {settings?.bannerUrls?.map((url, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <Image
                src={getImageUrl(url)}
                alt={`Banner ${idx + 1}`}
                width={160}
                height={90}
                style={{ borderRadius: 8, objectFit: 'cover' }}
              />
              <Popconfirm title="Xóa banner này?" onConfirm={() => removeBanner(idx)} okText="Xóa" cancelText="Hủy">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)' }}
                />
              </Popconfirm>
            </div>
          ))}
          <Upload beforeUpload={handleBannerUpload} showUploadList={false} accept="image/*">
            <div style={{
              width: 160, height: 90, borderRadius: 8, border: '1px dashed #d9d9d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#999',
            }}>
              <PlusOutlined style={{ marginRight: 4 }} /> Thêm banner
            </div>
          </Upload>
        </Space>
      </Card>

      {/* Info */}
      <Form form={basicForm} layout="vertical" onFinish={(v) => saveSettings(v)}>
        <Form.Item name="businessName" label="Tên cửa hàng" rules={[{ required: true, message: 'Nhập tên cửa hàng' }]}>
          <Input placeholder="VD: Double S Bakery" />
        </Form.Item>
        <Form.Item name="slogan" label="Slogan">
          <Input placeholder="VD: Tiệm bánh thủ công - Ngọt ngào từ tâm" />
        </Form.Item>
        <Form.Item name="description" label="Giới thiệu chi tiết">
          <TextArea rows={4} placeholder="Câu chuyện thương hiệu, triết lý kinh doanh..." />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}
          style={{ backgroundColor: '#8B6914' }}>
          Lưu thông tin
        </Button>
      </Form>
    </div>
  );

  // =============================================
  // TAB 2: Liên hệ & Mạng xã hội
  // =============================================
  const contactTab = (
    <div style={{ maxWidth: 700 }}>
      <Form form={contactForm} layout="vertical" onFinish={(v) => saveSettings(v)}>
        <Title level={5}>Thông tin liên hệ</Title>
        <Form.Item name="phone" label="Số điện thoại">
          <Input prefix={<PhoneOutlined />} placeholder="0901 234 567" />
        </Form.Item>
        <Form.Item name="zalo" label="Số Zalo">
          <Input placeholder="0901 234 567" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="contact@doublebakery.com" />
        </Form.Item>
        <Form.Item name="address" label="Địa chỉ">
          <TextArea rows={2} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" />
        </Form.Item>
        <Form.Item name="googleMapsUrl" label="Link Google Maps">
          <Input placeholder="https://maps.google.com/..." />
        </Form.Item>

        <Divider />
        <Title level={5}>Mạng xã hội</Title>

        <Form.Item name="facebookUrl" label="Facebook">
          <Input prefix={<FacebookOutlined />} placeholder="https://facebook.com/doublebakery" />
        </Form.Item>
        <Form.Item name="instagramUrl" label="Instagram">
          <Input prefix={<InstagramOutlined />} placeholder="https://instagram.com/doublebakery" />
        </Form.Item>
        <Form.Item name="tiktokUrl" label="TikTok">
          <Input prefix={<LinkOutlined />} placeholder="https://tiktok.com/@doublebakery" />
        </Form.Item>

        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}
          style={{ backgroundColor: '#8B6914' }}>
          Lưu liên hệ
        </Button>
      </Form>
    </div>
  );

  // =============================================
  // TAB 3: Giờ hoạt động
  // =============================================
  const hoursTab = (
    <div style={{ maxWidth: 700 }}>
      <Title level={5}>Giờ mở cửa hàng ngày</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dayKeys.map((day) => {
          const h = settings?.openingHours?.[day as keyof typeof settings.openingHours];
          return (
            <Card key={day} size="small" style={{ background: h?.closed ? '#fafafa' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, width: 80 }}>{dayLabels[day]}</span>
                <Switch
                  checkedChildren="Mở"
                  unCheckedChildren="Nghỉ"
                  checked={!h?.closed}
                  onChange={(checked) => handleHoursChange(day, 'closed', !checked)}
                />
                {!h?.closed && (
                  <>
                    <TimePicker
                      format="HH:mm"
                      value={h?.open ? dayjs(h.open, 'HH:mm') : null}
                      onChange={(_, timeStr) => handleHoursChange(day, 'open', timeStr)}
                      placeholder="Giờ mở"
                      style={{ width: 100 }}
                      needConfirm={false}
                    />
                    <span>-</span>
                    <TimePicker
                      format="HH:mm"
                      value={h?.close ? dayjs(h.close, 'HH:mm') : null}
                      onChange={(_, timeStr) => handleHoursChange(day, 'close', timeStr)}
                      placeholder="Giờ đóng"
                      style={{ width: 100 }}
                      needConfirm={false}
                    />
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Divider />
      <Title level={5}>Thông báo đặc biệt</Title>
      <TextArea
        rows={3}
        placeholder="VD: Nghỉ Tết từ 28/1 - 5/2/2025. Chúc quý khách năm mới an khang!"
        value={settings?.specialNotice || ''}
        onChange={(e) => setSettings((s) => s ? { ...s, specialNotice: e.target.value } : s)}
      />
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        style={{ backgroundColor: '#8B6914', marginTop: 12 }}
        onClick={() => saveSettings({ specialNotice: settings?.specialNotice })}
      >
        Lưu thông báo
      </Button>
    </div>
  );

  // =============================================
  // TAB 4: Danh mục & Sản phẩm
  // =============================================
  const categoryTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={5} style={{ margin: 0 }}>Danh mục sản phẩm</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#8B6914' }}
          onClick={() => {
            setEditingCategory(null);
            catForm.resetFields();
            setCatModalOpen(true);
          }}
        >
          Thêm danh mục
        </Button>
      </div>

      {categories.length === 0 ? (
        <Empty description="Chưa có danh mục nào. Hãy thêm danh mục đầu tiên!" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((cat, idx) => (
            <Card key={cat.id} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <HolderOutlined style={{ color: '#ccc', cursor: 'grab' }} />
                <Tag color={cat.isActive ? 'green' : 'default'}>{cat.isActive ? 'Hiện' : 'Ẩn'}</Tag>
                <span style={{ fontWeight: 600, flex: 1, minWidth: 120 }}>{cat.name}</span>
                {cat.description && (
                  <Text type="secondary" style={{ flex: 2, minWidth: 150 }}>{cat.description}</Text>
                )}
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingCategory(cat);
                      catForm.setFieldsValue(cat);
                      setCatModalOpen(true);
                    }}
                  />
                  <Popconfirm title="Xóa danh mục này?" onConfirm={() => handleDeleteCategory(cat.id)} okText="Xóa" cancelText="Hủy">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Divider />
      <Title level={5}>Gán sản phẩm vào danh mục</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Chọn sản phẩm để gán vào danh mục hiển thị trên menu công khai
      </Text>

      <Table
        dataSource={products}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'Sản phẩm',
            dataIndex: 'name',
            render: (name: string, record: Product) => (
              <Space>
                {record.imageUrl && (
                  <Image
                    src={getImageUrl(record.imageUrl)}
                    width={36}
                    height={36}
                    style={{ borderRadius: 6, objectFit: 'cover' }}
                    preview={false}
                  />
                )}
                <span>{name}</span>
              </Space>
            ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => (
              <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? 'Hoạt động' : 'Ẩn'}</Tag>
            ),
          },
          {
            title: '',
            width: 120,
            render: (_: any, record: Product) => (
              <Button size="small" icon={<AppstoreOutlined />} onClick={() => openAssignModal(record)}>
                Danh mục
              </Button>
            ),
          },
        ]}
      />

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={catModalOpen}
        onOk={handleSaveCategory}
        onCancel={() => { setCatModalOpen(false); setEditingCategory(null); catForm.resetFields(); }}
        okText={editingCategory ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form form={catForm} layout="vertical">
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
            <Input placeholder="VD: Bánh sinh nhật" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Mô tả ngắn cho danh mục" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị"
            extra="Số nhỏ hiển thị trước. Đặt tên danh mục chứa chữ «mới» hoặc «new» để tự động hiển thị nổi bật trên trang menu.">
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Hiển thị" valuePropName="checked">
            <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" defaultChecked />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Product Modal */}
      <Modal
        title={`Danh mục cho: ${assigningProduct?.name}`}
        open={assignModalOpen}
        onOk={handleAssignCategories}
        onCancel={() => setAssignModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Select
          mode="multiple"
          placeholder="Chọn danh mục"
          value={selectedCatIds}
          onChange={setSelectedCatIds}
          style={{ width: '100%' }}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
      </Modal>
    </div>
  );

  // =============================================
  // TAB 5: Đặt hàng
  // =============================================
  const orderTab = (
    <div style={{ maxWidth: 700 }}>
      <Form form={orderForm} layout="vertical" onFinish={(v) => saveSettings(v)}>
        <Form.Item name="isOrderingEnabled" label="Cho phép đặt hàng online" valuePropName="checked">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>

        <Form.Item name="minOrderAmount" label="Đơn hàng tối thiểu (VNĐ)">
          <InputNumber
            min={0}
            step={10000}
            style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            placeholder="100000"
          />
        </Form.Item>

        <Form.Item name="preparationTime" label="Thời gian chuẩn bị">
          <Input placeholder="VD: Đặt trước 24 giờ" />
        </Form.Item>

        <Form.Item name="deliveryFeeNote" label="Phí giao hàng">
          <Input placeholder="VD: Miễn phí đơn từ 500k, ship nội thành 20k" />
        </Form.Item>

        <Form.Item name="deliveryArea" label="Khu vực giao hàng">
          <Input placeholder="VD: Nội thành TP.HCM" />
        </Form.Item>

        <Form.Item name="orderNote" label="Ghi chú cho khách hàng">
          <TextArea rows={3} placeholder="VD: Bánh sinh nhật vui lòng đặt trước 2 ngày" />
        </Form.Item>

        <Divider />
        <Title level={5}>Phương thức thanh toán</Title>

        <Form.Item name="paymentMethods" label="Chấp nhận thanh toán">
          <Select
            mode="multiple"
            placeholder="Chọn phương thức thanh toán"
            options={paymentOptions.map((p) => ({ label: p, value: p }))}
          />
        </Form.Item>

        <Form.Item name="bankName" label="Ngân hàng">
          <Input placeholder="VD: Vietcombank" />
        </Form.Item>

        <Form.Item name="bankAccountNumber" label="Số tài khoản">
          <Input placeholder="VD: 1234567890" />
        </Form.Item>

        <Form.Item name="bankAccountName" label="Chủ tài khoản">
          <Input placeholder="VD: NGUYEN VAN A" />
        </Form.Item>

        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}
          style={{ backgroundColor: '#8B6914' }}>
          Lưu cài đặt đặt hàng
        </Button>
      </Form>
    </div>
  );

  // =============================================
  // TAB 6: Giao diện
  // =============================================
  const designTab = (
    <div style={{ maxWidth: 700 }}>
      <Form form={designForm} layout="vertical" onFinish={(v) => {
        // Convert color objects to hex strings
        const data: any = { ...v };
        saveSettings(data);
      }}>
        <Title level={5}>Màu sắc</Title>
        <Space size={24} wrap>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Màu chủ đạo</Text>
            <ColorPicker
              value={settings?.primaryColor || '#8B6914'}
              onChange={(_, hex) => saveSettings({ primaryColor: hex })}
            />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Màu nền</Text>
            <ColorPicker
              value={settings?.secondaryColor || '#FFF8F0'}
              onChange={(_, hex) => saveSettings({ secondaryColor: hex })}
            />
          </div>
        </Space>

        <Divider />
        <Title level={5}>Bố cục menu</Title>

        <Form.Item name="menuLayout" label="Kiểu hiển thị sản phẩm">
          <Select
            options={[
              { label: 'Dạng lưới (Grid)', value: 'grid' },
              { label: 'Dạng danh sách (List)', value: 'list' },
            ]}
            style={{ width: 250 }}
            onChange={(v) => saveSettings({ menuLayout: v })}
          />
        </Form.Item>

        <Form.Item name="showPrices" label="Hiển thị giá" valuePropName="checked">
          <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" onChange={(v) => saveSettings({ showPrices: v })} />
        </Form.Item>

        <Form.Item name="showDescription" label="Hiển thị mô tả sản phẩm" valuePropName="checked">
          <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" onChange={(v) => saveSettings({ showDescription: v })} />
        </Form.Item>
      </Form>
    </div>
  );

  // =============================================
  // TAB 7: Chia sẻ & SEO
  // =============================================
  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu`
    : '/menu';

  const shareTab = (
    <div style={{ maxWidth: 700 }}>
      <Card size="small" style={{ marginBottom: 16, background: settings?.isMenuPublic ? '#f6ffed' : '#fff7e6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Text strong>Trạng thái menu: </Text>
            <Tag color={settings?.isMenuPublic ? 'green' : 'orange'}>
              {settings?.isMenuPublic ? 'Công khai' : 'Chưa công khai'}
            </Tag>
          </div>
          <Switch
            checkedChildren="Công khai"
            unCheckedChildren="Riêng tư"
            checked={settings?.isMenuPublic}
            onChange={handleTogglePublic}
          />
        </div>
      </Card>

      <Card size="small" title="Đường link menu" style={{ marginBottom: 16 }}>
        <Space>
          <Input value={menuUrl} readOnly style={{ width: 350 }} />
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(menuUrl);
              message.success('Đã sao chép link!');
            }}
          >
            Sao chép
          </Button>
          <Button icon={<EyeOutlined />} onClick={handlePreview}>
            Xem trước
          </Button>
        </Space>
      </Card>

      <Divider />
      <Title level={5}>SEO - Tối ưu tìm kiếm</Title>

      <Form form={seoForm} layout="vertical" onFinish={(v) => saveSettings(v)}>
        <Form.Item name="seoTitle" label="Tiêu đề trang (Title Tag)">
          <Input placeholder="Double S Bakery - Tiệm bánh thủ công TP.HCM" />
        </Form.Item>
        <Form.Item name="seoDescription" label="Mô tả trang (Meta Description)">
          <TextArea rows={2} placeholder="Tiệm bánh thủ công Double S Bakery - Bánh sinh nhật, bánh mì, bánh ngọt tươi ngon mỗi ngày" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}
          style={{ backgroundColor: '#8B6914' }}>
          Lưu SEO
        </Button>
      </Form>
    </div>
  );

  // =============================================
  // RENDER
  // =============================================
  const tabItems = [
    { key: 'basic', label: 'Thông tin cơ bản', icon: <ShopOutlined />, children: basicTab },
    { key: 'contact', label: 'Liên hệ', icon: <PhoneOutlined />, children: contactTab },
    { key: 'hours', label: 'Giờ mở cửa', icon: <ClockCircleOutlined />, children: hoursTab },
    { key: 'categories', label: 'Danh mục & SP', icon: <AppstoreOutlined />, children: categoryTab },
    { key: 'order', label: 'Đặt hàng', icon: <ShoppingCartOutlined />, children: orderTab },
    { key: 'design', label: 'Giao diện', icon: <BgColorsOutlined />, children: designTab },
    { key: 'share', label: 'Chia sẻ & SEO', icon: <ShareAltOutlined />, children: shareTab },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0, color: '#8B6914' }}>
          <ShopOutlined style={{ marginRight: 8 }} />
          Cài đặt cửa hàng
        </Title>
        <Space>
          <Button icon={<EyeOutlined />} onClick={handlePreview}>
            Xem trước
          </Button>
          <Tag color={settings?.isMenuPublic ? 'green' : 'orange'}>
            {settings?.isMenuPublic ? 'Menu đang công khai' : 'Menu chưa công khai'}
          </Tag>
        </Space>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems.map((t) => ({
            key: t.key,
            label: (
              <span>
                {t.icon} {t.label}
              </span>
            ),
            children: t.children,
          }))}
          tabPosition="left"
          style={{ minHeight: 500 }}
        />
      </Card>
    </div>
  );
}

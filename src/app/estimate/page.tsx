'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Form,
  InputNumber,
  Select,
  Table,
  Tag,
  message,
  Typography,
  Divider,
  Alert,
  Statistic,
  Row,
  Col,
  Result,
  Modal,
  Spin,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  CalculatorOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { productsApi, productionApi, recipesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Product, EstimateResult, Recipe } from '@/types';

const { Title, Text } = Typography;

export default function EstimatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Recipe modal state
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeModalLoading, setRecipeModalLoading] = useState(false);
  const [recipeModalData, setRecipeModalData] = useState<{
    productName: string;
    sizeName?: string;
    selectedSizeId?: string;
    recipes: Recipe[];
  } | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    productsApi
      .getAll({ limit: 100, status: 'active' })
      .then((res) => {
        setProducts(res.data.list || []);
      })
      .catch(() => {});
  }, []);

  const handleEstimate = async (values: any) => {
    if (!values.items || values.items.length === 0) {
      message.warning('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    setLoading(true);
    try {
      const res = await productionApi.estimate(
        values.items.map((item: any) => ({
          productId: item.productId,
          sizeId: item.sizeId || undefined,
          quantity: item.quantity,
        })),
      );
      setResult(res.data.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipe = async (productId: string, sizeId?: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const sizeName = sizeId
      ? product.sizes?.find((s) => s.id === sizeId)?.name
      : undefined;

    setRecipeModalOpen(true);
    setRecipeModalLoading(true);
    setRecipeModalData(null);

    try {
      const res = await recipesApi.getByProduct(productId);
      const recipes: Recipe[] = res.data.data || res.data.list || res.data || [];
      setRecipeModalData({
        productName: product.name,
        sizeName,
        selectedSizeId: sizeId,
        recipes: Array.isArray(recipes) ? recipes : [],
      });
    } catch {
      message.error('Không thể tải công thức sản phẩm');
      setRecipeModalOpen(false);
    } finally {
      setRecipeModalLoading(false);
    }
  };

  const recipeColumns = [
    {
      title: 'Nguyên liệu',
      dataIndex: ['ingredient', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Định lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      align: 'right' as const,
      render: (val: number, record: any) => (
        <span>
          <strong>{Number(val).toLocaleString()}</strong>
          <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
            {record.ingredient?.unit}
          </Text>
        </span>
      ),
    },
    {
      title: 'Đơn giá',
      key: 'costPerUnit',
      width: 90,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Text type="secondary">
          {formatCurrency(Number(record.ingredient?.costPerUnit ?? 0))}
        </Text>
      ),
    },
    {
      title: 'Thành tiền',
      key: 'costPerProduct',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <strong>
          {formatCurrency(
            Number(record.quantity) * Number(record.ingredient?.costPerUnit ?? 0),
          )}
        </strong>
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
      render: (val: number) => (
        <strong>{Number(val).toLocaleString()}</strong>
      ),
    },
    {
      title: 'Tồn kho hiện tại',
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
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Chi phí ước tính',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      render: (val: number) => formatCurrency(val),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        <CalculatorOutlined /> Ước tính nguyên liệu sản xuất
      </Title>

      <Alert
        message="Chức năng này chỉ ước tính, KHÔNG trừ tồn kho"
        description="Tính toán nguyên liệu chỉ giúp bạn xem trước lượng nguyên liệu cần dùng và chi phí. Tồn kho chỉ bị trừ khi bạn xác nhận đơn hàng trong trang Quản lý đơn hàng."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={24}>
        {/* Form nhap lieu */}
        <Col xs={24} lg={10}>
          <Card title="Chọn sản phẩm và số lượng">
            <Form form={form} layout="vertical" onFinish={handleEstimate}>
              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <>
                    {/* Header bảng */}
                    {fields.length > 0 && (
                      <div className="estimate-item-header" style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 110px 70px 68px',
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
                        <span>SL</span>
                        <span />
                      </div>
                    )}

                    {fields.map(({ key, name, ...rest }) => {
                      const items = form.getFieldValue('items') || [];
                      const currentItem = items[name] || {};
                      const selectedProductId = currentItem.productId;
                      const selectedProduct = products.find((p) => p.id === selectedProductId);

                      // Size đã chọn ở dòng khác cùng SP
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
                          className="estimate-item-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 110px 70px 68px',
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
                              placeholder="Chọn sản phẩm"
                              showSearch
                              optionFilterProp="label"
                              onChange={() => {
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

                          <Form.Item
                            {...rest}
                            name={[name, 'sizeId']}
                            style={{ marginBottom: 0 }}
                          >
                            {hasSizes ? (
                              <Select
                                placeholder="Size"
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
                            name={[name, 'quantity']}
                            rules={[{ required: true, message: 'SL' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber
                              placeholder="SL"
                              min={1}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>

                          <div style={{ display: 'flex', gap: 2 }}>
                            {selectedProductId && (
                              <Tooltip title="Xem công thức">
                                <Button
                                  type="text"
                                  icon={<FileTextOutlined />}
                                  onClick={() => handleViewRecipe(selectedProductId, currentItem.sizeId)}
                                  style={{ height: 32, color: '#8B6914' }}
                                />
                              </Tooltip>
                            )}
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              style={{ height: 32 }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16, marginTop: 4 }}
                    >
                      Thêm sản phẩm
                    </Button>
                  </>
                )}
              </Form.List>

              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                icon={<CalculatorOutlined />}
                style={{ backgroundColor: '#8B6914' }}
              >
                Tính toán nguyên liệu
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Ket qua */}
        <Col xs={24} lg={14}>
          {result ? (
            <Card title="Kết quả ước tính">
              {/* Tong quan */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Tổng chi phí NL"
                    value={result.totalEstimatedCost}
                    formatter={(val) => formatCurrency(Number(val))}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Số nguyên liệu"
                    value={result.ingredients.length}
                    suffix="loại"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Trạng thái"
                    valueRender={() =>
                      result.hasShortage ? (
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

              {result.hasShortage && (
                <Alert
                  message="Không đủ nguyên liệu"
                  description="Một số nguyên liệu không đủ để sản xuất. Vui lòng nhập thêm trước khi bắt đầu."
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* San pham */}
              <Divider orientation="left">Sản phẩm cần sản xuất</Divider>
              <div style={{ marginBottom: 16 }}>
                {result.products.map((p, i) => (
                  <Tag key={i} style={{ marginBottom: 4, padding: '4px 12px' }}>
                    {p.productName}{p.sizeName ? ` (${p.sizeName})` : ''} x {p.quantity}
                  </Tag>
                ))}
              </div>

              {/* Bang nguyen lieu chi tiet */}
              <Divider orientation="left">Chi tiết nguyên liệu</Divider>
              {isMobile ? (
                /* Mobile: Card list */
                <>
                  {result.ingredients.map((ing: any) => (
                    <div key={ing.ingredientId} style={{
                      background: ing.shortage > 0 ? '#fff2f0' : '#fafafa',
                      border: `1px solid ${ing.shortage > 0 ? '#ffccc7' : '#f0f0f0'}`,
                      borderRadius: 8,
                      padding: '8px 12px',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #f0f0f0', marginTop: 4 }}>
                    <strong>Tổng chi phí nguyên liệu</strong>
                    <strong style={{ color: '#8B6914' }}>{formatCurrency(result.totalEstimatedCost)}</strong>
                  </div>
                </>
              ) : (
                <Table
                  columns={ingredientColumns}
                  dataSource={result.ingredients}
                  rowKey="ingredientId"
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
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
                          {formatCurrency(result.totalEstimatedCost)}
                        </strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )}
            </Card>
          ) : (
            <Card>
              <Result
                icon={<CalculatorOutlined style={{ color: '#8B6914' }} />}
                title="Ước tính nguyên liệu"
                subTitle="Chọn sản phẩm và số lượng cần sản xuất, hệ thống sẽ tự động tính toán nguyên liệu cần thiết."
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* Modal xem công thức */}
      <Modal
        title={null}
        open={recipeModalOpen}
        onCancel={() => setRecipeModalOpen(false)}
        footer={null}
        width={700}
        styles={{ body: { padding: 0 } }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(135deg, #faf6ed 0%, #fff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ fontSize: 22, color: '#8B6914' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {recipeModalData?.productName || 'Công thức sản phẩm'}
                {recipeModalData?.sizeName && (
                  <Tag color="#8B6914" style={{ marginLeft: 8, verticalAlign: 'middle', fontSize: 13 }}>
                    {recipeModalData.sizeName}
                  </Tag>
                )}
              </Title>
              {recipeModalData && !recipeModalData.selectedSizeId && recipeModalData.recipes.length > 0 && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {recipeModalData.recipes.length} công thức
                </Text>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 20px', maxHeight: '65vh', overflowY: 'auto' }}>
          {recipeModalLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Đang tải công thức...</Text>
              </div>
            </div>
          ) : recipeModalData && recipeModalData.recipes.length > 0 ? (
            (() => {
              const selectedSizeId = recipeModalData.selectedSizeId;
              const allRecipes = [...recipeModalData.recipes].sort((a, b) => {
                const orderA = a.size?.sortOrder ?? -1;
                const orderB = b.size?.sortOrder ?? -1;
                return orderA - orderB;
              });

              // Nếu đã chọn size → chỉ hiển thị công thức của size đó
              // Nếu chưa chọn size → hiển thị tất cả, highlight công thức mặc định
              const displayRecipes = selectedSizeId
                ? allRecipes.filter((r) => r.sizeId === selectedSizeId)
                : allRecipes;

              if (displayRecipes.length === 0) {
                return (
                  <Empty
                    description={`Size "${recipeModalData.sizeName}" chưa có công thức riêng`}
                    style={{ padding: 32 }}
                  />
                );
              }

              return displayRecipes.map((recipe, idx) => {
                const sizeName = recipe.size?.name;
                const label = sizeName || 'Mặc định';
                const totalCost = recipe.items.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity) *
                      Number(item.ingredient?.costPerUnit ?? 0),
                  0,
                );
                const itemCount = recipe.items.length;

                // Khi không chọn size → highlight công thức mặc định (sizeId = null)
                const isHighlighted = !selectedSizeId && !recipe.sizeId;

                return (
                  <Card
                    key={recipe.id}
                    size="small"
                    style={{
                      marginBottom: idx < displayRecipes.length - 1 ? 16 : 0,
                      borderRadius: 8,
                      border: isHighlighted
                        ? '2px solid #8B6914'
                        : '1px solid #e8e0d0',
                      opacity: !selectedSizeId && recipe.sizeId ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Tag
                            color={isHighlighted || selectedSizeId ? '#8B6914' : 'default'}
                            style={{
                              borderRadius: 4,
                              fontWeight: 600,
                              fontSize: 13,
                              padding: '2px 10px',
                              margin: 0,
                            }}
                          >
                            {label}
                          </Tag>
                          {isHighlighted && (
                            <Tag
                              color="green"
                              style={{ borderRadius: 4, fontSize: 11, margin: 0 }}
                            >
                              Đang dùng
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {itemCount} nguyên liệu
                          </Text>
                        </div>
                        <Text strong style={{ color: '#8B6914', fontSize: 14 }}>
                          {formatCurrency(totalCost)}
                        </Text>
                      </div>
                    }
                  >
                    {recipe.notes && (
                      <div style={{
                        padding: '6px 10px',
                        background: '#fafafa',
                        borderRadius: 4,
                        marginBottom: 12,
                        fontSize: 13,
                      }}>
                        <Text type="secondary">
                          <InfoCircleOutlined style={{ marginRight: 6 }} />
                          {recipe.notes}
                        </Text>
                      </div>
                    )}
                    {isMobile ? (
                      /* Mobile: Card list */
                      <>
                        {[...recipe.items].sort((a, b) =>
                          a.ingredient?.name?.localeCompare(b.ingredient?.name || '') || 0,
                        ).map((item: any) => (
                          <div key={item.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: '1px solid #f5f5f5',
                            fontSize: 13,
                          }}>
                            <div>
                              <strong>{item.ingredient?.name}</strong>
                              <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>
                                {Number(item.quantity).toLocaleString()} {item.ingredient?.unit}
                              </span>
                            </div>
                            <strong style={{ color: '#8B6914' }}>
                              {formatCurrency(Number(item.quantity) * Number(item.ingredient?.costPerUnit ?? 0))}
                            </strong>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #f0f0f0', marginTop: 4 }}>
                          <strong style={{ fontSize: 13 }}>Tổng / 1 SP</strong>
                          <strong style={{ color: '#8B6914', fontSize: 14 }}>{formatCurrency(totalCost)}</strong>
                        </div>
                      </>
                    ) : (
                      <Table
                        columns={recipeColumns}
                        dataSource={[...recipe.items].sort((a, b) =>
                          a.ingredient?.name?.localeCompare(b.ingredient?.name || '') || 0,
                        )}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 450 }}
                        style={{ fontSize: 13 }}
                        summary={() => (
                          <Table.Summary.Row
                            style={{ background: '#faf8f3' }}
                          >
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <strong>Tổng chi phí / 1 sản phẩm</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <strong style={{ color: '#8B6914', fontSize: 14 }}>
                                {formatCurrency(totalCost)}
                              </strong>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )}
                      />
                    )}
                  </Card>
                );
              });
            })()
          ) : (
            <Empty
              description="Sản phẩm này chưa có công thức nào"
              style={{ padding: 32 }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

// ========== User Types ==========
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ========== Product Types ==========
export interface ProductSize {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  sizes?: ProductSize[];
  recipe?: Recipe;
  createdAt: string;
  updatedAt: string;
}

// ========== Ingredient Types ==========
export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

// ========== Recipe Types ==========
export interface RecipeItem {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
}

export interface Recipe {
  id: string;
  productId: string;
  product?: Product;
  sizeId?: string | null;
  size?: ProductSize | null;
  notes?: string;
  items: RecipeItem[];
}

// ========== Order Types ==========
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone?: string;
  address?: string;
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ========== Supplier Types ==========
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

// ========== Purchase Order Types ==========
export interface PurchaseOrderItem {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string;
  supplier?: Supplier;
  status: 'draft' | 'confirmed' | 'received' | 'cancelled';
  totalCost: number;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
}

// ========== Inventory Types ==========
export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: 'ORDER' | 'PURCHASE' | 'ADJUSTMENT' | 'WASTE';
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

// ========== Production Estimate ==========
export interface EstimateIngredient {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalNeeded: number;
  currentStock: number;
  shortage: number;
  costPerUnit: number;
  estimatedCost: number;
}

export interface EstimateResult {
  products: { productId: string; productName: string; sizeName?: string; quantity: number }[];
  ingredients: EstimateIngredient[];
  totalEstimatedCost: number;
  hasShortage: boolean;
}

// ========== Estimate History Types ==========
export type EstimateType = 'ESTIMATE' | 'ORDER';

export interface EstimateHistoryItem {
  id: string;
  type: EstimateType;
  orderId?: string;
  orderNumber?: string;
  products: {
    productId: string;
    productName: string;
    sizeName?: string;
    quantity: number;
  }[];
  ingredients: EstimateIngredient[];
  totalEstimatedCost: number;
  hasShortage: boolean;
  notes?: string;
  createdBy?: string;
  creator?: { id: string; name: string };
  createdAt: string;
}

// ========== Report Types ==========
export interface DashboardData {
  totalOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  lowStockCount: number;
}

export interface RevenueReport {
  period: { startDate: string; endDate: string };
  totalRevenue: number;
  totalOrders: number;
  dailyRevenue: { date: string; revenue: number; order_count: number }[];
}

export interface ProfitReport {
  period: { startDate: string; endDate: string };
  revenue: number;
  cost: number;
  actualIngredientCost: number;
  profit: number;
  margin: number;
  totalOrders: number;
}

export interface ComparisonReport {
  current: ProfitReport;
  previous: ProfitReport;
  changes: {
    revenue: number;
    cost: number;
    actualIngredientCost: number;
    profit: number;
    totalOrders: number;
  };
}

export interface TopProduct {
  productId: string;
  productName: string;
  sizeId?: string;
  sizeName?: string;
  totalQuantity: number;
  totalRevenue: number;
}

// ========== Store Settings Types ==========
export interface OpeningHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  monday: OpeningHoursDay;
  tuesday: OpeningHoursDay;
  wednesday: OpeningHoursDay;
  thursday: OpeningHoursDay;
  friday: OpeningHoursDay;
  saturday: OpeningHoursDay;
  sunday: OpeningHoursDay;
}

export interface StoreSettings {
  id: string;
  businessName: string;
  slogan?: string;
  description?: string;
  logoUrl?: string;
  bannerUrls: string[];
  phone?: string;
  zalo?: string;
  email?: string;
  address?: string;
  googleMapsUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  openingHours: OpeningHours;
  specialNotice?: string;
  isOrderingEnabled: boolean;
  minOrderAmount: number;
  preparationTime?: string;
  deliveryFeeNote?: string;
  deliveryArea?: string;
  orderNote?: string;
  paymentMethods: string[];
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  primaryColor: string;
  secondaryColor: string;
  menuLayout: 'grid' | 'list';
  seoTitle?: string;
  seoDescription?: string;
  faviconUrl?: string;
  isMenuPublic: boolean;
  showPrices: boolean;
  showDescription: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== Category Types ==========
export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

// ========== Standardized API Response ==========
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiDataResponse<T> {
  message: string;
  status: number;
  data: T;
}

export interface ApiListResponse<T> {
  message: string;
  status: number;
  list: T[];
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  errors?: any;
}

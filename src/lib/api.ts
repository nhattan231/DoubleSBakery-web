import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
// Backend trả chuẩn: { message, status, data|list, pagination? }
// Frontend dùng: res.data.data (object) hoặc res.data.list (array) + res.data.pagination
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ========== Auth API ==========
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ========== Products API ==========
export const productsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/products', { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// ========== Ingredients API ==========
export const ingredientsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/ingredients', { params }),
  getOne: (id: string) => api.get(`/ingredients/${id}`),
  create: (data: any) => api.post('/ingredients', data),
  update: (id: string, data: any) => api.patch(`/ingredients/${id}`, data),
  delete: (id: string) => api.delete(`/ingredients/${id}`),
  getLowStock: () => api.get('/ingredients/low-stock'),
};

// ========== Supplies API (Vật tư tiêu hao) ==========
export const suppliesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/supplies', { params }),
  getOne: (id: string) => api.get(`/supplies/${id}`),
  create: (data: any) => api.post('/supplies', data),
  update: (id: string, data: any) => api.patch(`/supplies/${id}`, data),
  delete: (id: string) => api.delete(`/supplies/${id}`),
  getLowStock: () => api.get('/supplies/low-stock'),
};

// ========== Equipment API (Dụng cụ) ==========
export const equipmentApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/equipment', { params }),
  getOne: (id: string) => api.get(`/equipment/${id}`),
  create: (data: any) => api.post('/equipment', data),
  update: (id: string, data: any) => api.patch(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
};

// ========== Recipes API ==========
export const recipesApi = {
  getAll: () => api.get('/recipes'),
  getOne: (id: string) => api.get(`/recipes/${id}`),
  getByProduct: (productId: string) => api.get(`/recipes/product/${productId}`),
  create: (data: any) => api.post('/recipes', data),
  update: (id: string, data: any) => api.patch(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
};

// ========== Orders API ==========
export const ordersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
};

// ========== Inventory API ==========
export const inventoryApi = {
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    ingredientId?: string;
    type?: string;
    reason?: string;
  }) => api.get('/inventory/transactions', { params }),
};

// ========== Purchase Orders API ==========
export const purchaseOrdersApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/purchase-orders', { params }),
  getOne: (id: string) => api.get(`/purchase-orders/${id}`),
  create: (data: any) => api.post('/purchase-orders', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/purchase-orders/${id}/status`, { status }),
};

// ========== Suppliers API ==========
export const suppliersApi = {
  getAll: (params?: { activeOnly?: boolean }) => api.get('/suppliers', { params }),
  getOne: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

// ========== Production API ==========
export const productionApi = {
  estimate: (items: { productId: string; sizeId?: string; quantity: number }[]) =>
    api.post('/production/estimate', { items }),
  getEstimateHistory: (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: 'ESTIMATE' | 'ORDER';
    search?: string;
  }) => api.get('/production/estimate-history', { params }),
  getEstimateDetail: (id: string) =>
    api.get(`/production/estimate-history/${id}`),
  getEstimateByOrder: (orderId: string) =>
    api.get(`/production/estimate-history/order/${orderId}`),
};

// ========== Upload API ==========
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ========== Store Settings API ==========
export const storeSettingsApi = {
  get: () => api.get('/store-settings'),
  update: (data: any) => api.patch('/store-settings', data),
  getPublic: () => api.get('/store-settings/public'),
};

// ========== Categories API ==========
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getOne: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) =>
    api.post('/categories/reorder', { items }),
  getProductCategories: (productId: string) =>
    api.get(`/categories/product/${productId}`),
  setProductCategories: (productId: string, categoryIds: string[]) =>
    api.post(`/categories/product/${productId}`, { categoryIds }),
  getPublicMenu: () => api.get('/store-settings/public/menu'),
};

// ========== Reports API ==========
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  revenue: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/revenue', { params }),
  costs: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/costs', { params }),
  profit: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/profit', { params }),
  topProducts: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/top-products', { params }),
  comparison: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/comparison', { params }),
};

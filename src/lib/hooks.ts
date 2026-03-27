import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportsApi,
  ordersApi,
  ingredientsApi,
  productsApi,
  suppliersApi,
  purchaseOrdersApi,
  recipesApi,
  productionApi,
  inventoryApi,
} from '@/lib/api';
import type {
  DashboardData,
  Order,
  Product,
  Ingredient,
  Supplier,
  PurchaseOrder,
  InventoryTransaction,
  ComparisonReport,
  TopProduct,
  EstimateHistoryItem,
} from '@/types';

// ========== Query Keys ==========
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  recentOrders: ['recentOrders'] as const,
  lowStock: ['lowStock'] as const,
  orders: (params?: any) => ['orders', params] as const,
  orderDetail: (id: string) => ['orders', id] as const,
  orderEstimate: (orderId: string) => ['orders', orderId, 'estimate'] as const,
  products: (params?: any) => ['products', params] as const,
  activeProducts: ['products', { limit: 100, status: 'active' }] as const,
  ingredients: (params?: any) => ['ingredients', params] as const,
  allIngredients: ['ingredients', { limit: 100 }] as const,
  ingredientHistory: (ingredientId: string, page: number) =>
    ['ingredients', ingredientId, 'history', page] as const,
  suppliers: (params?: any) => ['suppliers', params] as const,
  activeSuppliers: ['suppliers', { activeOnly: true }] as const,
  purchaseOrders: (params?: any) => ['purchaseOrders', params] as const,
  purchaseOrderDetail: (id: string) => ['purchaseOrders', id] as const,
  recipesByProduct: (productId: string) => ['recipes', 'product', productId] as const,
  reports: {
    comparison: (params: any) => ['reports', 'comparison', params] as const,
    topProducts: (params: any) => ['reports', 'topProducts', params] as const,
    revenue: (params: any) => ['reports', 'revenue', params] as const,
  },
  estimateHistory: (params?: any) => ['estimateHistory', params] as const,
  estimateDetail: (id: string) => ['estimateHistory', id] as const,
};

// ========== Dashboard ==========
export function useDashboardQuery() {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const res = await reportsApi.dashboard();
      return res.data.data;
    },
  });
}

export function useRecentOrdersQuery() {
  return useQuery<Order[]>({
    queryKey: queryKeys.recentOrders,
    queryFn: async () => {
      const res = await ordersApi.getAll({ limit: 5 });
      return res.data.list || [];
    },
  });
}

export function useLowStockQuery() {
  return useQuery<Ingredient[]>({
    queryKey: queryKeys.lowStock,
    queryFn: async () => {
      const res = await ingredientsApi.getLowStock();
      return res.data.list || [];
    },
  });
}

// ========== Orders ==========
export function useOrdersQuery(params: {
  page: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: async () => {
      const res = await ordersApi.getAll(params);
      return { list: res.data.list || [], pagination: res.data.pagination };
    },
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentOrders });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentOrders });
      queryClient.invalidateQueries({ queryKey: queryKeys.lowStock });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

// ========== Products ==========
export function useProductsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: async () => {
      const res = await productsApi.getAll(params);
      return { list: res.data.list || [], pagination: res.data.pagination };
    },
  });
}

export function useActiveProductsQuery() {
  return useQuery<Product[]>({
    queryKey: queryKeys.activeProducts,
    queryFn: async () => {
      const res = await productsApi.getAll({ limit: 100, status: 'active' });
      return res.data.list || [];
    },
    staleTime: 1000 * 60 * 5, // 5 phút
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ========== Ingredients ==========
export function useIngredientsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.ingredients(params),
    queryFn: async () => {
      const res = await ingredientsApi.getAll(params);
      return { list: res.data.list || [], pagination: res.data.pagination };
    },
  });
}

export function useAllIngredientsQuery() {
  return useQuery<Ingredient[]>({
    queryKey: queryKeys.allIngredients,
    queryFn: async () => {
      const res = await ingredientsApi.getAll({ limit: 100 });
      return res.data.list || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useIngredientHistoryQuery(
  ingredientId: string | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: queryKeys.ingredientHistory(ingredientId || '', page),
    queryFn: async () => {
      const res = await inventoryApi.getTransactions({
        ingredientId,
        limit: pageSize,
        page,
      });
      return { list: res.data.list || [], pagination: res.data.pagination };
    },
    enabled: !!ingredientId,
  });
}

export function useCreateIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ingredientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lowStock });
    },
  });
}

export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ingredientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lowStock });
    },
  });
}

export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ingredientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lowStock });
    },
  });
}

// ========== Suppliers ==========
export function useSuppliersQuery(params?: { activeOnly?: boolean }) {
  return useQuery<Supplier[]>({
    queryKey: queryKeys.suppliers(params),
    queryFn: async () => {
      const res = await suppliersApi.getAll(params);
      return res.data.list || [];
    },
  });
}

export function useActiveSuppliersQuery() {
  return useQuery<Supplier[]>({
    queryKey: queryKeys.activeSuppliers,
    queryFn: async () => {
      const res = await suppliersApi.getAll({ activeOnly: true });
      return res.data.list || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

// ========== Purchase Orders ==========
export function usePurchaseOrdersQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders(params),
    queryFn: async () => {
      const res = await purchaseOrdersApi.getAll(params);
      return { list: res.data.list || [], pagination: res.data.pagination };
    },
  });
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });
}

export function useUpdatePurchaseOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      purchaseOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lowStock });
    },
  });
}

// ========== Recipes ==========
export function useRecipesByProductQuery(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recipesByProduct(productId || ''),
    queryFn: async () => {
      const res = await recipesApi.getByProduct(productId!);
      return res.data.list || res.data.data || res.data || [];
    },
    enabled: !!productId,
  });
}

export function useCreateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => recipesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      recipesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ========== Reports ==========
export function useComparisonReport(params: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: queryKeys.reports.comparison(params),
    queryFn: async () => {
      const res = await reportsApi.comparison(params);
      return res.data.data;
    },
  });
}

export function useTopProductsReport(params: { startDate: string; endDate: string }) {
  return useQuery<TopProduct[]>({
    queryKey: queryKeys.reports.topProducts(params),
    queryFn: async () => {
      const res = await reportsApi.topProducts(params);
      return res.data.list || [];
    },
  });
}

export function useRevenueReport(params: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: queryKeys.reports.revenue(params),
    queryFn: async () => {
      const res = await reportsApi.revenue(params);
      const daily = res.data.data?.dailyRevenue || [];
      return [...daily].sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    },
  });
}

// ========== Estimate History ==========
export function useEstimateHistoryQuery(params: {
  page: number;
  limit: number;
  type: 'ESTIMATE' | 'ORDER';
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.estimateHistory(params),
    queryFn: async () => {
      const res = await productionApi.getEstimateHistory(params);
      return {
        list: res.data.list || [],
        pagination: res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    },
  });
}

export function useEstimateDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.estimateDetail(id || ''),
    queryFn: async () => {
      const res = await productionApi.getEstimateDetail(id!);
      return res.data.data;
    },
    enabled: !!id,
  });
}

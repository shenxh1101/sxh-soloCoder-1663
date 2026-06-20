import type {
  Order,
  Supplier,
  QualityInspection,
  DefectType,
  SupplierPerformance,
  QualityTrendPoint,
  DashboardStats,
} from '@/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const orderApi = {
  getList: (params: {
    status?: string;
    supplierId?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.append(key, String(value));
      }
    });
    return request<PaginatedResponse<Order>>(`/orders?${query.toString()}`);
  },

  getDetail: (id: string) => request<Order>(`/orders/${id}`),

  create: (data: Partial<Order> & { drawings?: Array<{ name: string; type: string; size: number; data: string }> }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Order>) =>
    request<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string, actualDeliveryDate?: string) =>
    request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, actualDeliveryDate }),
    }),

  deleteDrawing: (orderId: string, drawingId: string) =>
    request<Order>(`/orders/${orderId}/drawings/${drawingId}`, {
      method: 'DELETE',
    }),

  uploadDrawings: (orderId: string, drawings: Array<{ name: string; type: string; size: number; data: string }>) =>
    request<Order>(`/orders/${orderId}/drawings`, {
      method: 'POST',
      body: JSON.stringify({ drawings }),
    }),

  remove: (id: string) =>
    request(`/orders/${id}`, {
      method: 'DELETE',
    }),
};

export const supplierApi = {
  getList: (params: { status?: string; keyword?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.append(key, String(value));
      }
    });
    return request<Supplier[]>(`/suppliers?${query.toString()}`);
  },

  getDetail: (id: string) => request<Supplier>(`/suppliers/${id}`),

  create: (data: Partial<Supplier>) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPerformance: (month?: string) => {
    const query = month ? `?month=${month}` : '';
    return request<SupplierPerformance[]>(`/suppliers/performance${query}`);
  },

  getPerformanceRange: (startMonth: string, endMonth: string) => {
    return request<{ months: string[]; suppliers: Array<{
      supplierId: string;
      supplierName: string;
      totalOrders: number;
      avgPassRate: number;
      avgOnTimeRate: number;
      score: number;
      monthlyData: Array<{
        month: string;
        totalOrders: number;
        passRate: number;
        onTimeDeliveryRate: number;
      }>;
    }> }>(`/suppliers/performance/range?startMonth=${startMonth}&endMonth=${endMonth}`);
  },
};

export const qualityApi = {
  getList: (params: {
    orderNo?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.append(key, String(value));
      }
    });
    return request<PaginatedResponse<QualityInspection>>(`/quality?${query.toString()}`);
  },

  getByOrderId: (orderId: string) =>
    request<QualityInspection[]>(`/quality/order/${orderId}`),

  create: (data: {
    orderId: string;
    orderNo: string;
    inspector: string;
    qualifiedQuantity: number;
    unqualifiedQuantity: number;
    defects: Array<{ type: string; description: string; quantity: number }>;
    remark?: string;
  }) =>
    request<QualityInspection>('/quality', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDefectTypes: () => request<DefectType[]>('/quality/defect-types'),

  getTrends: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return request<QualityTrendPoint[]>(`/quality/stats/trends${query}`);
  },

  getSummary: () => request<DashboardStats>('/quality/stats/summary'),
};

export const exportApi = {
  exportOrders: () => {
    window.open('/api/export/orders', '_blank');
  },

  exportSupplierRanking: (month?: string) => {
    const query = month ? `?month=${month}` : '';
    window.open(`/api/export/suppliers/ranking${query}`, '_blank');
  },

  exportSupplierRankingRange: (startMonth: string, endMonth: string) => {
    window.open(`/api/export/suppliers/ranking-range?startMonth=${startMonth}&endMonth=${endMonth}`, '_blank');
  },
};

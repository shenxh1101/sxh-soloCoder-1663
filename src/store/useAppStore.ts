import { create } from 'zustand';
import type { DashboardStats, QualityTrendPoint, Supplier, Order } from '@/types';
import { qualityApi, supplierApi, orderApi } from '../services/api';

interface AppState {
  sidebarCollapsed: boolean;
  stats: DashboardStats | null;
  qualityTrends: QualityTrendPoint[];
  suppliers: Supplier[];
  orders: Order[];
  loading: Record<string, boolean>;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  fetchStats: () => Promise<void>;
  fetchQualityTrends: (days?: number) => Promise<void>;
  fetchSuppliers: (params?: { status?: string; keyword?: string }) => Promise<void>;
}

const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  stats: null,
  qualityTrends: [],
  suppliers: [],
  orders: [],
  loading: {},

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  fetchStats: async () => {
    set({ loading: { ...get().loading, stats: true } });
    try {
      const data = await qualityApi.getSummary();
      set({ stats: data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      set({ loading: { ...get().loading, stats: false } });
    }
  },

  fetchQualityTrends: async (days = 30) => {
    set({ loading: { ...get().loading, trends: true } });
    try {
      const data = await qualityApi.getTrends(days);
      set({ qualityTrends: data });
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      set({ loading: { ...get().loading, trends: false } });
    }
  },

  fetchSuppliers: async (params = {}) => {
    set({ loading: { ...get().loading, suppliers: true } });
    try {
      const data = await supplierApi.getList(params);
      set({ suppliers: data });
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      set({ loading: { ...get().loading, suppliers: false } });
    }
  },
}));

export default useAppStore;

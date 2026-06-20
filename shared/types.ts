export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  status: 'active' | 'inactive';
  cooperationDate: string;
  remark: string;
}

export interface DrawingFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export type OperationType = 'create' | 'dispatch' | 'process_complete' | 'inspect_submit' | 'inspect_pass' | 'reject' | 'reinspect' | 'drawing_upload' | 'drawing_delete';

export interface OperationLog {
  id: string;
  type: OperationType;
  title: string;
  description: string;
  operator: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'inspecting' | 'completed' | 'rejected';

export interface Order {
  id: string;
  orderNo: string;
  partName: string;
  partNo: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  actualDeliveryDate?: string;
  supplierId: string;
  supplierName: string;
  drawings: DrawingFile[];
  status: OrderStatus;
  remark: string;
  operationLogs: OperationLog[];
  createdAt: string;
  updatedAt: string;
}

export interface DefectRecord {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

export interface QualityInspection {
  id: string;
  orderId: string;
  orderNo: string;
  inspector: string;
  qualifiedQuantity: number;
  unqualifiedQuantity: number;
  passRate: number;
  defects: DefectRecord[];
  remark: string;
  inspectedAt: string;
  inspectionRound: number;
}

export interface DefectType {
  id: string;
  name: string;
  category: string;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  month: string;
  totalOrders: number;
  totalQuantity: number;
  passRate: number;
  onTimeDeliveryRate: number;
  score: number;
  rank: number;
  defectDistribution: { type: string; count: number }[];
}

export interface QualityTrendPoint {
  date: string;
  passRate: number;
  totalOrders: number;
}

export interface DashboardStats {
  totalOrders: number;
  processingOrders: number;
  pendingInspection: number;
  averagePassRate: number;
  onTimeDeliveryRate: number;
  totalSuppliers: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待接单',
  processing: '加工中',
  inspecting: '待质检',
  completed: '已完成',
  rejected: '已退回',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  inspecting: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

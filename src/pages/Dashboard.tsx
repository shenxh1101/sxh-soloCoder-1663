import { useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Building2,
  AlertTriangle,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import StatCard from '../components/StatCard';
import useAppStore from '../store/useAppStore';
import { orderApi } from '../services/api';
import type { Order } from '@/types';
import StatusBadge from '../components/StatusBadge';
import { useState } from 'react';

export default function Dashboard() {
  const { stats, qualityTrends, fetchStats, fetchQualityTrends, loading } = useAppStore();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchStats();
    fetchQualityTrends(30);
    loadRecentOrders();
  }, [fetchStats, fetchQualityTrends]);

  const loadRecentOrders = async () => {
    try {
      const data = await orderApi.getList({ pageSize: 5 });
      setRecentOrders(data.list);
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  const todoItems = [
    { id: 1, title: '待质检订单', count: stats?.pendingInspection || 0, icon: CheckCircle2, color: 'text-purple-600 bg-purple-100' },
    { id: 2, title: '加工中订单', count: stats?.processingOrders || 0, icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { id: 3, title: '即将逾期', count: 2, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="订单总数"
          value={stats?.totalOrders || 0}
          icon={<ClipboardList className="h-6 w-6" />}
          trend={12.5}
          color="blue"
        />
        <StatCard
          title="平均合格率"
          value={`${stats?.averagePassRate || 0}%`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          trend={2.3}
          color="green"
        />
        <StatCard
          title="按时交付率"
          value={`${stats?.onTimeDeliveryRate || 0}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          trend={-1.2}
          color="orange"
        />
        <StatCard
          title="活跃供应商"
          value={stats?.totalSuppliers || 0}
          icon={<Building2 className="h-6 w-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">质量趋势</h3>
            <span className="text-sm text-gray-500">近30天</span>
          </div>
          <div className="h-72">
            {loading.trends ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityTrends}>
                  <defs>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickFormatter={(value) => value.slice(5)}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: number) => [`${value}%`, '合格率']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="passRate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorPass)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">待办事项</h3>
          <div className="space-y-3">
            {todoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-gray-700">{item.title}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-800">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">最新订单</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">查看全部 →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">订单编号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">零件名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">供应商</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">交付日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{order.orderNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{order.partName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.deliveryDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { orderApi, supplierApi } from '../services/api';
import type { Order, OrderStatus } from '@/types';
import StatusBadge from '../components/StatusBadge';
import { exportApi } from '../services/api';

export default function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, status, supplierId]);

  const loadSuppliers = async () => {
    try {
      const data = await supplierApi.getList({ status: 'active' });
      setSuppliers(data.map(s => ({ id: s.id, name: s.name })));
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await orderApi.getList({
        status,
        supplierId,
        keyword,
        page,
        pageSize,
      });
      setOrders(data.list);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatMoney = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">外协订单管理</h2>
          <p className="mt-1 text-sm text-gray-500">管理所有外协加工订单，跟踪生产和质检进度</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportApi.exportOrders()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            导出
          </button>
          <button
            onClick={() => navigate('/orders/new')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            新建订单
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="订单号、零件名称、图号..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">状态</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全部状态</option>
              <option value="pending">待接单</option>
              <option value="processing">加工中</option>
              <option value="inspecting">待质检</option>
              <option value="completed">已完成</option>
              <option value="rejected">已退回</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">供应商</label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全部供应商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Filter className="h-4 w-4" />
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  订单编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  零件信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  供应商
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数量/金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  交付日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
                    <p className="mt-2 text-sm">加载中...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无订单数据
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">{order.orderNo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{order.partName}</p>
                      <p className="text-xs text-gray-500">{order.partNo}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.supplierName}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">{order.quantity} 件</p>
                      <p className="text-xs text-gray-500">{formatMoney(order.totalPrice)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.deliveryDate)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-700">{total}</span> 条记录
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              第 {page} / {totalPages || 1} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

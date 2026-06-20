import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  X,
  Clock,
  RefreshCw,
  Eye,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { qualityApi, orderApi } from '../services/api';
import type { QualityInspection, Order, DefectType } from '@/types';
import StatusBadge from '../components/StatusBadge';

export default function QualityInspectionPage() {
  const [records, setRecords] = useState<QualityInspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [inspectingOrders, setInspectingOrders] = useState<Order[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOrderNo, setHistoryOrderNo] = useState('');
  const [historyRecords, setHistoryRecords] = useState<QualityInspection[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');

  type OrderSummary = {
    orderId: string;
    orderNo: string;
    partName: string;
    partNo: string;
    supplierName: string;
    quantity: number;
    totalInspections: number;
    latestInspectionRound: number;
    latestPassRate: number;
    latestQualifiedQuantity: number;
    latestUnqualifiedQuantity: number;
    isPassed: boolean;
    latestInspectedAt: string;
    latestInspector: string;
    orderStatus: string;
  };

  const [orderSummaries, setOrderSummaries] = useState<OrderSummary[]>([]);
  const [formData, setFormData] = useState({
    qualifiedQuantity: '',
    unqualifiedQuantity: '',
    inspector: '',
    remark: '',
  });
  const [defects, setDefects] = useState<Array<{ type: string; description: string; quantity: number }>>([]);
  const [newDefect, setNewDefect] = useState({ type: '', description: '', quantity: 1 });

  useEffect(() => {
    if (viewMode === 'details') {
      loadRecords();
    } else {
      loadOrderSummaries();
    }
    loadRecordsForStats();
    loadDefectTypes();
    loadInspectingOrders();
  }, [page, status, searchKeyword, viewMode]);

  const loadRecordsForStats = async () => {
    try {
      const data = await qualityApi.getList({
        status: 'completed',
        pageSize: 100,
      });
      setRecords(data.list);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load records for stats:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const data = await qualityApi.getList({
        orderNo: searchKeyword || undefined,
        status,
        page,
        pageSize: 10,
      });
      setRecords(data.list);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const loadOrderSummaries = async () => {
    try {
      const data = await qualityApi.getByOrderSummary();
      let filtered = data;
      
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        filtered = filtered.filter(s => 
          s.orderNo.toLowerCase().includes(kw) ||
          s.partName.toLowerCase().includes(kw) ||
          s.partNo.toLowerCase().includes(kw)
        );
      }
      
      if (status === 'pending') {
        filtered = filtered.filter(s => !s.isPassed && s.orderStatus === 'inspecting');
      } else if (status === 'completed') {
        filtered = filtered.filter(s => s.isPassed);
      }
      
      setOrderSummaries(filtered);
      setTotal(filtered.length);
    } catch (error) {
      console.error('Failed to load order summaries:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword.trim());
  };

  const handleClear = () => {
    setKeyword('');
    setPage(1);
    setSearchKeyword('');
  };

  const loadDefectTypes = async () => {
    try {
      const data = await qualityApi.getDefectTypes();
      setDefectTypes(data);
    } catch (error) {
      console.error('Failed to load defect types:', error);
    }
  };

  const loadInspectingOrders = async () => {
    try {
      const data = await orderApi.getList({ status: 'inspecting', pageSize: 100 });
      setInspectingOrders(data.list);
    } catch (error) {
      console.error('Failed to load inspecting orders:', error);
    }
  };

  const openInspectModal = (order: Order) => {
    setSelectedOrder(order);
    setFormData({
      qualifiedQuantity: String(order.quantity),
      unqualifiedQuantity: '0',
      inspector: '系统',
      remark: '',
    });
    setDefects([]);
    setNewDefect({ type: '', description: '', quantity: 1 });
    setShowModal(true);
  };

  const addDefect = () => {
    if (!newDefect.type) return;
    setDefects([...defects, { ...newDefect }]);
    setNewDefect({ type: '', description: '', quantity: 1 });
  };

  const removeDefect = (index: number) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const qualifiedQuantity = parseInt(formData.qualifiedQuantity) || 0;
      const unqualifiedQuantity = parseInt(formData.unqualifiedQuantity) || 0;

      if (qualifiedQuantity + unqualifiedQuantity !== selectedOrder.quantity) {
        alert(`合格数量(${qualifiedQuantity}) + 不良数量(${unqualifiedQuantity}) 必须等于订单加工数量(${selectedOrder.quantity})，请检查后再提交`);
        return;
      }

      await qualityApi.create({
        orderId: selectedOrder.id,
        orderNo: selectedOrder.orderNo,
        inspector: formData.inspector,
        qualifiedQuantity,
        unqualifiedQuantity,
        defects,
        remark: formData.remark,
      });

      setShowModal(false);
      loadRecords();
      loadInspectingOrders();
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      alert('提交质检记录失败，请重试');
    }
  };

  const handleReinspect = async (orderId: string, orderNo: string) => {
    if (!confirm(`确定要将订单「${orderNo}」退回重检吗？退回后供应商需要重新加工并再次提交质检。`)) return;
    
    try {
      await orderApi.updateStatus(orderId, 'processing');
      loadRecords();
      loadInspectingOrders();
    } catch (error) {
      console.error('Failed to reinspect:', error);
      alert('退回重检失败，请重试');
    }
  };

  const viewHistory = async (orderId: string, orderNo: string) => {
    try {
      const data = await qualityApi.getByOrderId(orderId);
      setHistoryRecords(data.sort((a, b) => 
        new Date(a.inspectedAt).getTime() - new Date(b.inspectedAt).getTime()
      ));
      setHistoryOrderNo(orderNo);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to load history:', error);
      alert('加载质检历史失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">质量检验</h2>
          <p className="mt-1 text-sm text-gray-500">管理外协订单的质量检验记录和不良分析</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white">
          <p className="text-sm opacity-90">待质检订单</p>
          <p className="mt-2 text-3xl font-bold">{inspectingOrders.length}</p>
          <p className="mt-1 text-xs opacity-75">需要及时处理</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white">
          <p className="text-sm opacity-90">本月已检验</p>
          <p className="mt-2 text-3xl font-bold">{records.filter(r => r.inspectedAt).length}</p>
          <p className="mt-1 text-xs opacity-75">质检完成的订单</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white">
          <p className="text-sm opacity-90">平均合格率</p>
          <p className="mt-2 text-3xl font-bold">
            {records.filter(r => r.inspectedAt).length > 0
              ? (
                  records.filter(r => r.inspectedAt).reduce((sum, r) => sum + r.passRate, 0) /
                  records.filter(r => r.inspectedAt).length
                ).toFixed(1)
              : 0}
            %
          </p>
          <p className="mt-1 text-xs opacity-75">整体质量水平</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">搜索</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="订单编号..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                onClick={handleSearch}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                查询
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                清空
              </button>
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
              <option value="all">全部</option>
              <option value="pending">待检验</option>
              <option value="completed">已检验</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => {
              setViewMode('summary');
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'summary' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            按订单汇总
          </button>
          <button
            onClick={() => {
              setViewMode('details');
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'details' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            按记录查看
          </button>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-base font-semibold text-gray-800">质检汇总</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">订单编号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">零件信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">供应商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">质检次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">最终结果</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">合格率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">最终检验时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">暂无质检记录</td>
                  </tr>
                ) : (
                  orderSummaries.map((summary) => (
                    <tr key={summary.orderId} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewHistory(summary.orderId, summary.orderNo)}
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {summary.orderNo}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{summary.partName}</p>
                        <p className="text-xs text-gray-500">{summary.partNo} · {summary.quantity}件</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{summary.supplierName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          summary.totalInspections > 1 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {summary.totalInspections} 次
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {summary.isPassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            合格
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            不合格
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${summary.latestPassRate >= 95 ? 'text-green-600' : summary.latestPassRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {summary.latestPassRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(summary.latestInspectedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => viewHistory(summary.orderId, summary.orderNo)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                            追溯详情
                          </button>
                          {!summary.isPassed && summary.orderStatus === 'inspecting' && (
                            <button
                              onClick={() => handleReinspect(summary.orderId, summary.orderNo)}
                              className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                            >
                              <RefreshCw className="h-4 w-4" />
                              退回重检
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {status === 'all' || status === 'pending' ? (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-base font-semibold text-gray-800">待质检订单</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {inspectingOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">暂无待质检订单</div>
            ) : (
              inspectingOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{order.orderNo}</p>
                      <p className="text-sm text-gray-500">
                        {order.partName} · {order.supplierName} · {order.quantity}件
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openInspectModal(order)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    录入质检
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {(status === 'all' || status === 'completed') && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-base font-semibold text-gray-800">质检记录</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    质检轮次
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    检验结果
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    检验员
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    合格率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    合格/不良数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    检验时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records
                  .filter((r) => r.inspectedAt)
                  .map((record) => {
                    const isPassed = record.unqualifiedQuantity === 0;
                    const order = inspectingOrders.find(o => o.id === record.orderId);
                    const canReinspect = !isPassed && !!order;
                    
                    return (
                      <tr key={record.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => viewHistory(record.orderId, record.orderNo)}
                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {record.orderNo}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            第 {record.inspectionRound || 1} 次
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                              合格
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                              <XCircle className="h-3 w-3" />
                              不合格
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{record.inspector}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-medium ${
                              record.passRate >= 98
                                ? 'text-green-600'
                                : record.passRate >= 95
                                ? 'text-blue-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {record.passRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="text-green-600">{record.qualifiedQuantity}</span>
                          <span className="mx-1 text-gray-400">/</span>
                          <span className="text-red-500">{record.unqualifiedQuantity}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(record.inspectedAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button
                              onClick={() => viewHistory(record.orderId, record.orderNo)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                              详情
                            </button>
                            {canReinspect && (
                              <button
                                onClick={() => handleReinspect(record.orderId, record.orderNo)}
                                className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                              >
                                <RefreshCw className="h-4 w-4" />
                                退回重检
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      )}

      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">录入质检结果</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">{selectedOrder.orderNo}</p>
                <p className="text-sm text-blue-600">
                  {selectedOrder.partName} · 共 {selectedOrder.quantity} 件
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    合格数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.qualifiedQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, qualifiedQuantity: e.target.value })
                    }
                    min="0"
                    required
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    不良数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.unqualifiedQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, unqualifiedQuantity: e.target.value })
                    }
                    min="0"
                    required
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">不良原因记录</label>
                <div className="space-y-2">
                  {defects.map((defect, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-red-700">{defect.type}</span>
                        <span className="text-xs text-red-600">{defect.description}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-red-700">{defect.quantity} 件</span>
                        <button
                          type="button"
                          onClick={() => removeDefect(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <select
                    value={newDefect.type}
                    onChange={(e) => setNewDefect({ ...newDefect, type: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">选择不良原因</option>
                    {defectTypes.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newDefect.description}
                    onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                    placeholder="详细描述"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    type="number"
                    value={newDefect.quantity}
                    onChange={(e) =>
                      setNewDefect({ ...newDefect, quantity: parseInt(e.target.value) || 1 })
                    }
                    min="1"
                    placeholder="数量"
                    className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={addDefect}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">检验员</label>
                <input
                  type="text"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  提交质检
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">质检历史详情</h3>
                <p className="text-sm text-gray-500 mt-0.5">订单号：{historyOrderNo}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {historyRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-500">暂无质检记录</div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-sm text-blue-700">
                      共 <span className="font-semibold">{historyRecords.length}</span> 次质检记录，
                      最终结果：
                      {(() => {
                        const latest = historyRecords[historyRecords.length - 1];
                        return latest.unqualifiedQuantity === 0 ? (
                          <span className="ml-1 font-semibold text-green-600">质检通过</span>
                        ) : (
                          <span className="ml-1 font-semibold text-orange-600">未通过（可退回重检）</span>
                        );
                      })()}
                    </p>
                  </div>

                  <div className="relative">
                    {historyRecords.map((record, idx) => {
                      const isPassed = record.unqualifiedQuantity === 0;
                      const isLatest = idx === historyRecords.length - 1;
                      const isFirst = idx === 0;
                      return (
                        <div key={record.id} className="relative flex gap-4 pb-8 last:pb-0">
                          {idx < historyRecords.length - 1 && (
                            <div className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 bg-gray-200"></div>
                          )}
                          <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                            isPassed ? 'bg-green-500' : 'bg-orange-500'
                          } text-white`}>
                            {isPassed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <AlertTriangle className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-medium text-gray-800">
                                第 {record.inspectionRound || 1} 次质检
                              </h4>
                              {isLatest && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  当前结果
                                </span>
                              )}
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                isPassed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {isPassed ? '合格' : '不合格'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatDate(record.inspectedAt)} · 检验员：{record.inspector}
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                              <div className={`rounded-lg p-3 ${isPassed ? 'bg-green-50' : 'bg-orange-50'}`}>
                                <p className={`text-lg font-semibold ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>
                                  {record.qualifiedQuantity}
                                </p>
                                <p className="text-xs text-gray-500">合格</p>
                              </div>
                              <div className="rounded-lg bg-red-50 p-3">
                                <p className="text-lg font-semibold text-red-600">{record.unqualifiedQuantity}</p>
                                <p className="text-xs text-gray-500">不良</p>
                              </div>
                              <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-lg font-semibold text-gray-600">{record.passRate}%</p>
                                <p className="text-xs text-gray-500">合格率</p>
                              </div>
                            </div>
                            {record.defects.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-2 text-xs font-medium text-gray-600">不良详情</p>
                                <div className="space-y-1.5">
                                  {record.defects.map((defect, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-md bg-red-50 px-3 py-1.5">
                                      <div>
                                        <span className="text-xs font-medium text-red-700">{defect.type}</span>
                                        {defect.description && (
                                          <span className="ml-2 text-xs text-red-600">{defect.description}</span>
                                        )}
                                      </div>
                                      <span className="text-xs font-medium text-red-700">{defect.quantity} 件</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {record.remark && (
                              <div className="mt-3 rounded-md bg-gray-50 px-3 py-2">
                                <p className="text-xs text-gray-500">备注</p>
                                <p className="text-sm text-gray-700">{record.remark}</p>
                              </div>
                            )}
                            {!isLatest && !isPassed && (
                              <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                <RefreshCw className="h-3 w-3" />
                                本次不合格，已退回重检
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

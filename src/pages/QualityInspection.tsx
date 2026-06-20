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
  const [formData, setFormData] = useState({
    qualifiedQuantity: '',
    unqualifiedQuantity: '',
    inspector: '',
    remark: '',
  });
  const [defects, setDefects] = useState<Array<{ type: string; description: string; quantity: number }>>([]);
  const [newDefect, setNewDefect] = useState({ type: '', description: '', quantity: 1 });

  useEffect(() => {
    loadRecords();
    loadDefectTypes();
    loadInspectingOrders();
  }, [page, status, searchKeyword]);

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
          <p className="mt-2 text-3xl font-bold">{records.filter(r => r.qualifiedQuantity > 0).length}</p>
          <p className="mt-1 text-xs opacity-75">质检完成的订单</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white">
          <p className="text-sm opacity-90">平均合格率</p>
          <p className="mt-2 text-3xl font-bold">
            {records.filter(r => r.qualifiedQuantity > 0).length > 0
              ? (
                  records.filter(r => r.qualifiedQuantity > 0).reduce((sum, r) => sum + r.passRate, 0) /
                  records.filter(r => r.qualifiedQuantity > 0).length
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
                  .filter((r) => r.qualifiedQuantity > 0)
                  .map((record) => {
                    const isPassed = record.unqualifiedQuantity === 0;
                    const order = inspectingOrders.find(o => o.id === record.orderId);
                    const canReinspect = !isPassed && !!order;
                    
                    return (
                      <tr key={record.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-blue-600">{record.orderNo}</span>
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
                          {canReinspect && (
                            <button
                              onClick={() => handleReinspect(record.orderId, record.orderNo)}
                              className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                            >
                              <RefreshCw className="h-4 w-4" />
                              退回重检
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  CheckCircle2,
  Clock,
  LineChart as LineChartIcon,
  Calendar,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supplierApi, exportApi } from '../services/api';
import type { SupplierPerformance } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface RangeSupplierData {
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
}

export default function SupplierPerformance() {
  const [performances, setPerformances] = useState<SupplierPerformance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);
  
  const [viewMode, setViewMode] = useState<'single' | 'range'>('single');
  const [startMonth, setStartMonth] = useState('2026-04');
  const [endMonth, setEndMonth] = useState('2026-06');
  const [rangeData, setRangeData] = useState<{ months: string[]; suppliers: RangeSupplierData[] } | null>(null);
  const [selectedRangeSupplier, setSelectedRangeSupplier] = useState<RangeSupplierData | null>(null);

  useEffect(() => {
    if (viewMode === 'single') {
      loadPerformance();
    } else {
      loadRangePerformance();
    }
  }, [viewMode, selectedMonth, startMonth, endMonth]);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const data = await supplierApi.getPerformance(selectedMonth);
      setPerformances(data);
      if (data.length > 0) {
        setSelectedSupplier(data[0]);
      }
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRangePerformance = async () => {
    setLoading(true);
    try {
      const data = await supplierApi.getPerformanceRange(startMonth, endMonth);
      setRangeData(data);
      if (data.suppliers.length > 0) {
        setSelectedRangeSupplier(data.suppliers[0]);
      }
    } catch (error) {
      console.error('Failed to load range performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
      case 3:
        return 'bg-gradient-to-r from-orange-300 to-orange-400 text-white';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value >= 95) return 'bg-green-500';
    if (value >= 85) return 'bg-blue-500';
    if (value >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${month}月`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">供应商绩效评价</h2>
          <p className="mt-1 text-sm text-gray-500">按月度统计供应商质量和交付绩效排名</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('single')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                单月统计
              </span>
            </button>
            <button
              onClick={() => setViewMode('range')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'range'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-1">
                <LineChartIcon className="h-4 w-4" />
                区间对比
              </span>
            </button>
          </div>

          {viewMode === 'single' ? (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="2026-06">2026年6月</option>
                <option value="2026-05">2026年5月</option>
                <option value="2026-04">2026年4月</option>
              </select>
              <button
                onClick={() => exportApi.exportSupplierRanking(selectedMonth)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                导出排行榜
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="2026-04">2026年4月</option>
                  <option value="2026-05">2026年5月</option>
                  <option value="2026-06">2026年6月</option>
                </select>
                <span className="text-gray-400">至</span>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="2026-04">2026年4月</option>
                  <option value="2026-05">2026年5月</option>
                  <option value="2026-06">2026年6月</option>
                </select>
              </div>
              <button
                onClick={() => exportApi.exportSupplierRankingRange(startMonth, endMonth)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                导出区间数据
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-800">综合排名</h3>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {performances.map((perf) => (
                  <div
                    key={perf.supplierId}
                    onClick={() => setSelectedSupplier(perf)}
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-all cursor-pointer ${
                      selectedSupplier?.supplierId === perf.supplierId
                        ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${getRankStyle(
                        perf.rank
                      )}`}
                    >
                      {perf.rank}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">{perf.supplierName}</h4>
                        <span className={`text-lg font-bold ${getScoreColor(perf.score)}`}>
                          {perf.score} 分
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              合格率
                            </span>
                            <span className="font-medium text-gray-700">{perf.passRate}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(perf.passRate)}`}
                              style={{ width: `${perf.passRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              准时交付
                            </span>
                            <span className="font-medium text-gray-700">{perf.onTimeDeliveryRate}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(perf.onTimeDeliveryRate)}`}
                              style={{ width: `${perf.onTimeDeliveryRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">订单数</p>
                          <p className="text-sm font-medium text-gray-700">{perf.totalOrders}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">不良原因分布</h3>
              {selectedSupplier && selectedSupplier.defectDistribution.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={selectedSupplier.defectDistribution.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {selectedSupplier.defectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-gray-400">
                  暂无不良数据
                </div>
              )}
              {selectedSupplier && (
                <p className="mt-2 text-center text-sm text-gray-500">
                  {selectedSupplier.supplierName}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm opacity-90">本月平均合格率</p>
                  <p className="text-2xl font-bold">
                    {performances.length > 0
                      ? (
                          performances.reduce((sum, p) => sum + p.passRate, 0) / performances.length
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>较上月提升 2.3%</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold text-gray-800">区间综合排名</h3>
                <span className="text-sm text-gray-500">
                  ({startMonth} 至 {endMonth})
                </span>
              </div>

              {loading || !rangeData ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {rangeData.suppliers.map((perf, index) => (
                    <div
                      key={perf.supplierId}
                      onClick={() => setSelectedRangeSupplier(perf)}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-all cursor-pointer ${
                        selectedRangeSupplier?.supplierId === perf.supplierId
                          ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${getRankStyle(
                          index + 1
                        )}`}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800">{perf.supplierName}</h4>
                          <span className={`text-lg font-bold ${getScoreColor(perf.score)}`}>
                            {perf.score} 分
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                平均合格率
                              </span>
                              <span className="font-medium text-gray-700">{perf.avgPassRate}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getProgressColor(perf.avgPassRate)}`}
                                style={{ width: `${perf.avgPassRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                平均准时率
                              </span>
                              <span className="font-medium text-gray-700">{perf.avgOnTimeRate}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getProgressColor(perf.avgOnTimeRate)}`}
                                style={{ width: `${perf.avgOnTimeRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">总订单数</p>
                            <p className="text-sm font-medium text-gray-700">{perf.totalOrders}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">区间平均合格率</p>
                    <p className="text-2xl font-bold">
                      {rangeData && rangeData.suppliers.length > 0
                        ? (
                            rangeData.suppliers.reduce((sum, p) => sum + p.avgPassRate, 0) / rangeData.suppliers.length
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm">
                  <LineChartIcon className="h-4 w-4" />
                  <span>{rangeData?.months.length || 0} 个月走势分析</span>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-800">选中供应商</h3>
                {selectedRangeSupplier ? (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-800">{selectedRangeSupplier.supplierName}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-blue-50 p-3 text-center">
                        <p className="text-lg font-semibold text-blue-600">{selectedRangeSupplier.avgPassRate}%</p>
                        <p className="text-xs text-blue-600">平均合格率</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-lg font-semibold text-green-600">{selectedRangeSupplier.avgOnTimeRate}%</p>
                        <p className="text-xs text-green-600">平均准时率</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                      <p className="text-lg font-semibold text-amber-600">{selectedRangeSupplier.score} 分</p>
                      <p className="text-xs text-amber-600">综合评分</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-gray-400">
                    请选择供应商
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedRangeSupplier && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-800">
                  {selectedRangeSupplier.supplierName} - 绩效走势
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedRangeSupplier.monthlyData.map(d => ({
                    ...d,
                    monthLabel: formatMonthLabel(d.month),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="passRate"
                      name="合格率"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="onTimeDeliveryRate"
                      name="准时交付率"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">评级标准说明</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="font-medium text-green-800">优秀</span>
            </div>
            <p className="mt-2 text-xs text-green-600">综合评分 ≥ 90分</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="font-medium text-blue-800">良好</span>
            </div>
            <p className="mt-2 text-xs text-blue-600">综合评分 80-89分</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="font-medium text-amber-800">合格</span>
            </div>
            <p className="mt-2 text-xs text-amber-600">综合评分 70-79分</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="font-medium text-red-800">待改进</span>
            </div>
            <p className="mt-2 text-xs text-red-600">综合评分 {'<'} 70分</p>
          </div>
        </div>
      </div>
    </div>
  );
}

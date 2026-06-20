import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Package,
  DollarSign,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  Edit3,
  Play,
} from 'lucide-react';
import { orderApi, qualityApi } from '../services/api';
import type { Order, QualityInspection, OrderStatus } from '@/types';
import StatusBadge from '../components/StatusBadge';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrderDetail();
      loadQualityRecords();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      const data = await orderApi.getDetail(id!);
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQualityRecords = async () => {
    try {
      const data = await qualityApi.getByOrderId(id!);
      setInspections(data);
    } catch (error) {
      console.error('Failed to load quality records:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getTimelineData = () => {
    if (!order) return [];

    const timeline = [
      {
        title: '订单创建',
        time: order.createdAt,
        status: 'completed' as const,
        icon: FileText,
        description: `技术部创建订单 ${order.orderNo}`,
      },
      {
        title: '供应商接单',
        time: order.status !== 'pending' ? order.createdAt : undefined,
        status: order.status !== 'pending' ? ('completed' as const) : ('pending' as const),
        icon: Building2,
        description: `${order.supplierName} 接收订单`,
      },
      {
        title: '生产加工',
        time: order.status === 'processing' || order.status === 'inspecting' || order.status === 'completed'
          ? order.updatedAt
          : undefined,
        status: order.status !== 'pending' && order.status !== 'processing'
          ? ('completed' as const)
          : order.status === 'processing'
          ? ('current' as const)
          : ('pending' as const),
        icon: Package,
        description: '供应商进行生产加工',
      },
      {
        title: '质量检验',
        time: inspections.length > 0 && inspections[0].qualifiedQuantity > 0
          ? inspections[0].inspectedAt
          : order.status === 'inspecting'
          ? order.updatedAt
          : undefined,
        status: order.status === 'completed'
          ? ('completed' as const)
          : order.status === 'inspecting'
          ? ('current' as const)
          : ('pending' as const),
        icon: CheckCircle2,
        description: '质检员进行质量检验',
      },
      {
        title: '订单完成',
        time: order.status === 'completed' ? order.updatedAt : undefined,
        status: order.status === 'completed' ? ('completed' as const) : ('pending' as const),
        icon: CheckCircle2,
        description: '订单完成入库',
      },
    ];

    return timeline;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">订单不存在</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          返回订单列表
        </button>
      </div>
    );
  }

  const timeline = getTimelineData();
  const hasInspection = inspections.length > 0 && inspections[0].qualifiedQuantity > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">{order.orderNo}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{order.partName} · {order.partNo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <Play className="h-4 w-4" />
              下发订单
            </button>
          )}
          {order.status === 'inspecting' && (
            <button
              onClick={() => navigate('/quality')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              去质检
            </button>
          )}
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <Edit3 className="h-4 w-4" />
            编辑
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">基本信息</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">零件名称</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{order.partName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">零件图号</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{order.partNo}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">加工数量</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{order.quantity} 件</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">加工金额</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{formatMoney(order.totalPrice)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">供应商</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{order.supplierName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">要求交付日期</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{formatDate(order.deliveryDate)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">全生命周期时间线</h3>
            <div className="relative">
              {timeline.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === timeline.length - 1;
                return (
                  <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <div
                        className={`absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 ${
                          item.status === 'completed' ? 'bg-blue-200' : 'bg-gray-200'
                        }`}
                      ></div>
                    )}
                    <div
                      className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        item.status === 'completed'
                          ? 'bg-blue-500 text-white'
                          : item.status === 'current'
                          ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-medium ${
                            item.status === 'pending' ? 'text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.status === 'current' && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            进行中
                          </span>
                        )}
                      </div>
                      {item.time ? (
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.time)}</p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">待处理</p>
                      )}
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasInspection && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">质检记录</h3>
              {inspections.map((inspection) => (
                <div key={inspection.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-gray-800">
                        合格率 {inspection.passRate}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      检验员：{inspection.inspector}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-lg font-semibold text-green-600">{inspection.qualifiedQuantity}</p>
                      <p className="text-xs text-green-600">合格数量</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-lg font-semibold text-red-600">{inspection.unqualifiedQuantity}</p>
                      <p className="text-xs text-red-600">不良数量</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-lg font-semibold text-gray-600">
                        {inspection.qualifiedQuantity + inspection.unqualifiedQuantity}
                      </p>
                      <p className="text-xs text-gray-600">送检总数</p>
                    </div>
                  </div>
                  {inspection.defects.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-gray-700">不良详情</p>
                      <div className="space-y-2">
                        {inspection.defects.map((defect, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2"
                          >
                            <div>
                              <span className="text-sm font-medium text-red-700">{defect.type}</span>
                              <span className="ml-2 text-xs text-red-600">{defect.description}</span>
                            </div>
                            <span className="text-sm font-medium text-red-700">{defect.quantity} 件</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {inspection.remark && (
                    <div className="mt-4 rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">备注</p>
                      <p className="text-sm text-gray-700">{inspection.remark}</p>
                    </div>
                  )}
                  <p className="mt-3 text-right text-xs text-gray-500">
                    检验时间：{formatDateTime(inspection.inspectedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {order.remark && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-gray-800">备注说明</h3>
              <p className="text-sm text-gray-600">{order.remark}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">图纸文件</h3>
            {order.drawings.length === 0 ? (
              <p className="text-sm text-gray-400">暂无图纸</p>
            ) : (
              <div className="space-y-3">
                {order.drawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                          {drawing.name}
                        </p>
                        <p className="text-xs text-gray-400">{formatFileSize(drawing.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">订单信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">创建时间</span>
                <span className="text-gray-700">{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">更新时间</span>
                <span className="text-gray-700">{formatDateTime(order.updatedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">单价</span>
                <span className="text-gray-700">{formatMoney(order.unitPrice)}/件</span>
              </div>
              {order.actualDeliveryDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">实际交付</span>
                  <span className="text-gray-700">{formatDate(order.actualDeliveryDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

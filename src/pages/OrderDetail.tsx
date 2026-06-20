import { useState, useEffect, useRef } from 'react';
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
  Upload,
  Trash2,
  RefreshCw,
  ClipboardList,
  RotateCcw,
  History,
} from 'lucide-react';
import { orderApi, qualityApi } from '../services/api';
import type { Order, QualityInspection, OrderStatus, DrawingFile } from '@/types';
import StatusBadge from '../components/StatusBadge';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDrawing, setPreviewDrawing] = useState<DrawingFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replaceDrawingId, setReplaceDrawingId] = useState<string | null>(null);
  const [expandedDrawingNames, setExpandedDrawingNames] = useState<Set<string>>(new Set());

  const toggleDrawingExpand = (groupId: string) => {
    const newSet = new Set(expandedDrawingNames);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setExpandedDrawingNames(newSet);
  };

  const getDrawingsGroupedByName = () => {
    if (!order?.drawings) return [];
    const map = new Map<string, DrawingFile[]>();
    order.drawings.forEach(d => {
      const list = map.get(d.groupId) || [];
      list.push(d);
      map.set(d.groupId, list);
    });
    return Array.from(map.entries()).map(([groupId, versions]) => ({
      name: versions.find(v => v.isCurrent)?.name || versions[0].name,
      groupId,
      versions: versions.sort((a, b) => (b.version || 1) - (a.version || 1)),
      current: versions.find(v => v.isCurrent) || versions[0],
    }));
  };

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

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await orderApi.updateStatus(id!, newStatus);
      setOrder(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('状态更新失败');
    }
  };

  const handleDeleteDrawing = async (drawingId: string, drawingName: string) => {
    if (!confirm(`确定要删除图纸「${drawingName}」吗？`)) return;
    
    try {
      const updated = await orderApi.deleteDrawing(id!, drawingId);
      setOrder(updated);
    } catch (error) {
      console.error('Failed to delete drawing:', error);
      alert('删除失败');
    }
  };

  const handlePreview = (drawing: DrawingFile) => {
    if (drawing.name.toLowerCase().endsWith('.pdf')) {
      const previewUrl = drawing.url.includes('?') 
        ? `${drawing.url}&inline=true` 
        : `${drawing.url}?inline=true`;
      setPreviewDrawing(drawing);
      setShowPreview(true);
    } else {
      alert('仅支持 PDF 格式在线预览');
    }
  };

  const handleReplaceClick = (drawingId: string) => {
    setReplaceDrawingId(drawingId);
    fileInputRef.current?.click();
  };

  const handleUploadClick = () => {
    setReplaceDrawingId(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      const fileList = Array.from(files);
      const drawingsToUpload = await Promise.all(
        fileList.map((file) => {
          return new Promise<{ name: string; type: string; size: number; data: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: reader.result as string,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      const updated = await orderApi.uploadDrawings(id!, drawingsToUpload, replaceDrawingId || undefined);
      setOrder(updated);
      setReplaceDrawingId(null);
    } catch (error) {
      console.error('Failed to upload drawing:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRollbackDrawing = async (drawingId: string, version: number, drawingName: string) => {
    if (!confirm(`确定要将「${drawingName}」回退到 v${version} 版本吗？`)) return;
    
    try {
      const updated = await orderApi.rollbackDrawing(id!, drawingId);
      setOrder(updated);
    } catch (error) {
      console.error('Failed to rollback drawing:', error);
      alert('回退失败');
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
    if (!order || !order.operationLogs) return [];

    const iconMap: Record<string, any> = {
      create: FileText,
      dispatch: Building2,
      process_complete: Package,
      inspect_submit: ClipboardList,
      inspect_pass: CheckCircle2,
      inspect_fail: XCircle,
      reject: XCircle,
      reinspect: RefreshCw,
      drawing_upload: Upload,
      drawing_replace: RefreshCw,
      drawing_delete: Trash2,
      drawing_rollback: RotateCcw,
    };

    const sortedLogs = [...order.operationLogs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sortedLogs.map((log) => ({
      title: log.title,
      time: log.createdAt,
      status: 'completed' as const,
      icon: iconMap[log.type] || FileText,
      description: log.description,
      operator: log.operator,
    }));
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
  const hasInspection = inspections.length > 0;

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
            <button
              onClick={() => handleStatusChange('processing')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              下发订单
            </button>
          )}
          {order.status === 'processing' && (
            <button
              onClick={() => handleStatusChange('inspecting')}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Package className="h-4 w-4" />
              加工完成
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
            <h3 className="mb-4 text-base font-semibold text-gray-800">操作记录时间线</h3>
            <div className="relative">
              {timeline.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === timeline.length - 1;
                return (
                  <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <div className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 bg-blue-200"></div>
                    )}
                    <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.time)}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                      {item.operator && (
                        <p className="mt-1 text-xs text-gray-400">操作人：{item.operator}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasInspection && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">质检记录</h3>
              <div className="space-y-4">
                {inspections
                  .sort((a, b) => new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime())
                  .map((inspection) => {
                    const isPassed = inspection.unqualifiedQuantity === 0;
                    return (
                      <div key={inspection.id} className={`rounded-lg border p-4 ${
                        isPassed ? 'border-green-100' : 'border-orange-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              isPassed ? 'bg-green-100' : 'bg-orange-100'
                            }`}>
                              {isPassed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-orange-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">
                                  第 {inspection.inspectionRound || 1} 次质检
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isPassed 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {isPassed ? '合格' : '不合格'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                合格率 {inspection.passRate}%
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            检验员：{inspection.inspector}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                          <div className={`rounded-lg p-3 ${isPassed ? 'bg-green-50' : 'bg-orange-50'}`}>
                            <p className={`text-lg font-semibold ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>
                              {inspection.qualifiedQuantity}
                            </p>
                            <p className={`text-xs ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>
                              合格数量
                            </p>
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
                    );
                  })}
              </div>
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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">图纸文件</h3>
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                上传
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.dwg,.dxf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {order.drawings.length === 0 ? (
              <p className="text-sm text-gray-400">暂无图纸</p>
            ) : (
              <div className="space-y-3">
                {getDrawingsGroupedByName().map((group) => {
                  const isExpanded = expandedDrawingNames.has(group.groupId);
                  const current = group.current;
                  return (
                    <div key={group.groupId} className="rounded-lg border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {current.name}
                              </p>
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                v{current.version || 1} 当前
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {formatFileSize(current.size)} · 上传人：{current.uploader || '系统'} · {formatDate(current.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {group.versions.length > 1 && (
                            <button
                              onClick={() => toggleDrawingExpand(group.groupId)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                              title="历史版本"
                            >
                              <History className="h-4 w-4" />
                            </button>
                          )}
                          {current.name.toLowerCase().endsWith('.pdf') && (
                            <button
                              onClick={() => handlePreview(current)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                              title="预览"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleReplaceClick(current.id)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                            title="替换"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDrawing(current.id, current.name)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(current.url, '_blank')}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="下载"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && group.versions.length > 1 && (
                        <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500 mb-2">历史版本</p>
                          {group.versions.filter(v => !v.isCurrent).map((v) => (
                            <div key={v.id} className="flex items-center justify-between rounded-md bg-white p-2 border border-gray-200">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                  v{v.version || 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600 truncate">
                                    {formatFileSize(v.size)} · {v.uploader || '系统'} · {formatDate(v.uploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {v.name.toLowerCase().endsWith('.pdf') && (
                                  <button
                                    onClick={() => handlePreview(v)}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                    title="预览"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRollbackDrawing(v.id, v.version || 1, v.name)}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-amber-600"
                                  title="回退到此版本"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => window.open(v.url, '_blank')}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  title="下载此版本"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {showPreview && previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex h-[90vh] w-[90vw] flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{previewDrawing.name}</h3>
                <p className="text-sm text-gray-500">{formatFileSize(previewDrawing.size)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(previewDrawing.url, '_blank')}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  下载
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={previewDrawing.url.includes('?') ? `${previewDrawing.url}&inline=true` : `${previewDrawing.url}?inline=true`}
                className="h-full w-full"
                title={previewDrawing.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

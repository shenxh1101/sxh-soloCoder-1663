import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';
import { orderApi, supplierApi } from '../services/api';
import type { Supplier } from '@/types';

export default function OrderCreate() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    orderNo: '',
    partName: '',
    partNo: '',
    quantity: '',
    unitPrice: '',
    deliveryDate: '',
    supplierId: '',
    supplierName: '',
    remark: '',
  });
  const [files, setFiles] = useState<Array<{ id: string; name: string; size: number; type: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
    generateOrderNo();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await supplierApi.getList({ status: 'active' });
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const generateOrderNo = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNo = `WX${year}${month}${random}`;
    setFormData((prev) => ({ ...prev, orderNo }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'supplierId') {
      const supplier = suppliers.find((s) => s.id === value);
      setFormData((prev) => ({ ...prev, supplierName: supplier?.name || '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const newFiles = Array.from(fileList).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const quantity = parseInt(formData.quantity) || 0;
      const unitPrice = parseFloat(formData.unitPrice) || 0;

      await orderApi.create({
        ...formData,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        drawings: files.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          url: '/drawings/' + f.name,
          uploadedAt: new Date().toISOString(),
        })),
      });

      navigate('/orders');
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('创建订单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const totalPrice = (parseInt(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">新建外协订单</h2>
          <p className="mt-1 text-sm text-gray-500">填写订单信息，上传图纸文件</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">基本信息</h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                订单编号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="orderNo"
                value={formData.orderNo}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                零件名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="partName"
                value={formData.partName}
                onChange={handleInputChange}
                required
                placeholder="请输入零件名称"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                零件图号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="partNo"
                value={formData.partNo}
                onChange={handleInputChange}
                required
                placeholder="请输入零件图号"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                外协供应商 <span className="text-red-500">*</span>
              </label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="">请选择供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                加工数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="请输入加工数量"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                单价 (元) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                placeholder="请输入单价"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                要求交付日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">总金额 (元)</label>
              <input
                type="text"
                value={totalPrice.toLocaleString()}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">图纸上传</h3>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/30">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.dwg,.dxf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">点击或拖拽文件到此处上传</p>
              <p className="mt-1 text-xs text-gray-400">支持 PDF、DWG、DXF 格式</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">备注说明</h3>
          <textarea
            name="remark"
            value={formData.remark}
            onChange={handleInputChange}
            rows={4}
            placeholder="请输入加工要求、注意事项等备注信息..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '提交中...' : '创建订单'}
          </button>
        </div>
      </form>
    </div>
  );
}

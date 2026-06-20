import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Star, Building2 } from 'lucide-react';
import { supplierApi } from '../services/api';
import type { Supplier } from '@/types';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [status]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierApi.getList({
        status: status === 'all' ? undefined : status,
        keyword,
      });
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSuppliers();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium text-gray-600">{rating}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">供应商管理</h2>
          <p className="mt-1 text-sm text-gray-500">管理外协供应商信息和合作状态</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md">
          <Plus className="h-4 w-4" />
          新增供应商
        </button>
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
                placeholder="供应商名称、联系人..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全部状态</option>
              <option value="active">合作中</option>
              <option value="inactive">已暂停</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl bg-white shadow-sm"
            ></div>
          ))
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            暂无供应商数据
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="group rounded-xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {supplier.name}
                    </h3>
                    <div className="mt-0.5">{renderStars(supplier.rating)}</div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    supplier.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {supplier.status === 'active' ? '合作中' : '已暂停'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{supplier.contactPerson}</span>
                  <span className="text-gray-400">·</span>
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="line-clamp-1">{supplier.address}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <span className="text-xs text-gray-500">
                  合作时间：{formatDate(supplier.cooperationDate)}
                </span>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  查看详情 →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

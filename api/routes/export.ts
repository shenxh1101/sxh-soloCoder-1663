import { Router, type Request, type Response } from 'express';
import { readDataFile } from '../utils/db.js';
import * as XLSX from 'xlsx';
import type { Order, SupplierPerformance } from '../../shared/types.js';

const router = Router();

router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    
    const exportData = orders.map(o => ({
      '订单编号': o.orderNo,
      '零件名称': o.partName,
      '零件图号': o.partNo,
      '供应商': o.supplierName,
      '数量': o.quantity,
      '单价(元)': o.unitPrice,
      '总金额(元)': o.totalPrice,
      '要求交付日期': o.deliveryDate,
      '实际交付日期': o.actualDeliveryDate || '-',
      '状态': getStatusLabel(o.status),
      '备注': o.remark,
      '创建时间': o.createdAt,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '外协订单明细');
    
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 22 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 30 },
      { wch: 20 },
    ];
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const excelBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    
    const fileName = encodeURIComponent('外协订单明细.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export orders',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/suppliers/ranking', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.query;
    const targetMonth = (month as string) || '2026-06';
    const suppliers = await readDataFile<any[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<any[]>('quality.json');
    
    const isInMonth = (dateStr: string) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
      return year === targetYear && monthNum === targetMonthNum;
    };
    
    const getLatestByOrder = (records: any[]) => {
      const map = new Map<string, any>();
      records.forEach(r => {
        const existing = map.get(r.orderId);
        if (!existing || new Date(r.inspectedAt) > new Date(existing.inspectedAt)) {
          map.set(r.orderId, r);
        }
      });
      return Array.from(map.values());
    };
    
    const performances: SupplierPerformance[] = [];
    
    suppliers.filter(s => s.status === 'active').forEach(supplier => {
      const supplierOrders = orders.filter(o => o.supplierId === supplier.id);
      const monthCompletedOrders = supplierOrders.filter(o => 
        o.status === 'completed' && o.actualDeliveryDate && isInMonth(o.actualDeliveryDate)
      );
      const totalQuantity = monthCompletedOrders.reduce((sum, o) => sum + o.quantity, 0);
      
      const monthAllInspections = qualityRecords.filter(
        q => supplierOrders.some(o => o.id === q.orderId) 
          && q.qualifiedQuantity > 0 
          && isInMonth(q.inspectedAt)
      );
      const monthInspections = getLatestByOrder(monthAllInspections);
      
      const totalQualified = monthInspections.reduce((sum, q) => sum + q.qualifiedQuantity, 0);
      const totalInspected = monthInspections.reduce(
        (sum, q) => sum + q.qualifiedQuantity + q.unqualifiedQuantity,
        0
      );
      const passRate = totalInspected > 0 
        ? parseFloat(((totalQualified / totalInspected) * 100).toFixed(2)) 
        : 0;
      
      const onTimeCount = monthCompletedOrders.filter(o => {
        if (!o.actualDeliveryDate) return false;
        return new Date(o.actualDeliveryDate) <= new Date(o.deliveryDate);
      }).length;
      
      const onTimeDeliveryRate = monthCompletedOrders.length > 0
        ? parseFloat(((onTimeCount / monthCompletedOrders.length) * 100).toFixed(2))
        : 0;
      
      const score = parseFloat((passRate * 0.6 + onTimeDeliveryRate * 0.4).toFixed(2));
      
      performances.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        month: targetMonth,
        totalOrders: monthCompletedOrders.length,
        totalQuantity,
        passRate,
        onTimeDeliveryRate,
        score,
        rank: 0,
        defectDistribution: [],
      });
    });
    
    performances.sort((a, b) => b.score - a.score);
    performances.forEach((p, i) => {
      p.rank = i + 1;
    });
    
    const exportData = performances.map(p => ({
      '排名': p.rank,
      '供应商名称': p.supplierName,
      '订单总数': p.totalOrders,
      '加工总数': p.totalQuantity,
      '合格率(%)': p.passRate,
      '按时交付率(%)': p.onTimeDeliveryRate,
      '综合评分': p.score,
      '统计月份': p.month,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '供应商质量排行榜');
    
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
    ];
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const excelBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    
    const fileName = encodeURIComponent('供应商质量排行榜.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export ranking error:', error);
    res.status(500).json({ success: false, error: 'Failed to export ranking' });
  }
});

router.get('/suppliers/ranking-range', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startMonth, endMonth } = req.query;
    const start = (startMonth as string) || '2026-04';
    const end = (endMonth as string) || '2026-06';
    
    const suppliers = await readDataFile<any[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<any[]>('quality.json');
    
    const getMonthList = (start: string, end: string) => {
      const months: string[] = [];
      const [startYear, startMonthNum] = start.split('-').map(Number);
      const [endYear, endMonthNum] = end.split('-').map(Number);
      
      let currentYear = startYear;
      let currentMonth = startMonthNum;
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
        months.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
        if (currentMonth === 12) {
          currentYear++;
          currentMonth = 1;
        } else {
          currentMonth++;
        }
      }
      
      return months;
    };
    
    const monthList = getMonthList(start, end);
    
    const getLatestByOrder = (records: any[]) => {
      const map = new Map<string, any>();
      records.forEach(r => {
        const existing = map.get(r.orderId);
        if (!existing || new Date(r.inspectedAt) > new Date(existing.inspectedAt)) {
          map.set(r.orderId, r);
        }
      });
      return Array.from(map.values());
    };
    
    const activeSuppliers = suppliers.filter(s => s.status === 'active');
    
    const summaryData: any[] = [];
    const detailData: any[] = [];
    
    activeSuppliers.forEach(supplier => {
      const supplierOrders = orders.filter(o => o.supplierId === supplier.id);
      
      let totalOrders = 0;
      let totalQuantity = 0;
      let totalPassRate = 0;
      let totalOnTimeRate = 0;
      let monthCount = 0;
      
      monthList.forEach(month => {
        const [targetYear, targetMonthNum] = month.split('-').map(Number);
        
        const isInMonth = (dateStr: string) => {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          return date.getFullYear() === targetYear && (date.getMonth() + 1) === targetMonthNum;
        };
        
        const monthCompletedOrders = supplierOrders.filter(o => 
          o.status === 'completed' && o.actualDeliveryDate && isInMonth(o.actualDeliveryDate)
        );
        const monthQuantity = monthCompletedOrders.reduce((sum, o) => sum + o.quantity, 0);
        
        const monthAllInspections = qualityRecords.filter(
          q => supplierOrders.some(o => o.id === q.orderId) 
            && q.qualifiedQuantity > 0 
            && isInMonth(q.inspectedAt)
        );
        const monthInspections = getLatestByOrder(monthAllInspections);
        
        const totalQualified = monthInspections.reduce((sum, q) => sum + q.qualifiedQuantity, 0);
        const totalInspected = monthInspections.reduce(
          (sum, q) => sum + q.qualifiedQuantity + q.unqualifiedQuantity,
          0
        );
        const passRate = totalInspected > 0 
          ? parseFloat(((totalQualified / totalInspected) * 100).toFixed(2)) 
          : 0;
        
        const onTimeCount = monthCompletedOrders.filter(o => {
          if (!o.actualDeliveryDate) return false;
          return new Date(o.actualDeliveryDate) <= new Date(o.deliveryDate);
        }).length;
        
        const onTimeDeliveryRate = monthCompletedOrders.length > 0
          ? parseFloat(((onTimeCount / monthCompletedOrders.length) * 100).toFixed(2))
          : 0;
        
        detailData.push({
          '供应商名称': supplier.name,
          '月份': month,
          '订单数': monthCompletedOrders.length,
          '加工数量': monthQuantity,
          '合格率(%)': passRate,
          '按时交付率(%)': onTimeDeliveryRate,
        });
        
        if (monthCompletedOrders.length > 0) {
          totalOrders += monthCompletedOrders.length;
          totalQuantity += monthQuantity;
          totalPassRate += passRate;
          totalOnTimeRate += onTimeDeliveryRate;
          monthCount++;
        }
      });
      
      const avgPassRate = monthCount > 0 ? parseFloat((totalPassRate / monthCount).toFixed(2)) : 0;
      const avgOnTimeRate = monthCount > 0 ? parseFloat((totalOnTimeRate / monthCount).toFixed(2)) : 0;
      const score = parseFloat((avgPassRate * 0.6 + avgOnTimeRate * 0.4).toFixed(2));
      
      summaryData.push({
        '供应商名称': supplier.name,
        '总订单数': totalOrders,
        '总加工数量': totalQuantity,
        '平均合格率(%)': avgPassRate,
        '平均按时交付率(%)': avgOnTimeRate,
        '综合评分': score,
      });
    });
    
    summaryData.sort((a, b) => b['综合评分'] - a['综合评分']);
    summaryData.forEach((item, i) => {
      item['排名'] = i + 1;
    });
    
    const workbook = XLSX.utils.book_new();
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData.map((item, i) => ({
      '排名': i + 1,
      '供应商名称': item['供应商名称'],
      '总订单数': item['总订单数'],
      '总加工数量': item['总加工数量'],
      '平均合格率(%)': item['平均合格率(%)'],
      '平均按时交付率(%)': item['平均按时交付率(%)'],
      '综合评分': item['综合评分'],
    })));
    XLSX.utils.book_append_sheet(workbook, summarySheet, '区间汇总');
    
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, '月度明细');
    
    summarySheet['!cols'] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
    ];
    
    detailSheet['!cols'] = [
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
    ];
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const excelBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    
    const fileName = encodeURIComponent(`供应商绩效区间对比_${start}_${end}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Export ranking range error:', error);
    res.status(500).json({ success: false, error: 'Failed to export ranking range' });
  }
});

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待接单',
    processing: '加工中',
    inspecting: '待质检',
    completed: '已完成',
    rejected: '已退回',
  };
  return labels[status] || status;
}

export default router;

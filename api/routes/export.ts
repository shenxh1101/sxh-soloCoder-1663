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
    const suppliers = await readDataFile<any[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<any[]>('quality.json');
    
    const performances: SupplierPerformance[] = [];
    
    suppliers.filter(s => s.status === 'active').forEach(supplier => {
      const supplierOrders = orders.filter(o => o.supplierId === supplier.id);
      const completedOrders = supplierOrders.filter(o => o.status === 'completed');
      const totalQuantity = completedOrders.reduce((sum, o) => sum + o.quantity, 0);
      
      const inspections = qualityRecords.filter(
        q => supplierOrders.some(o => o.id === q.orderId) && q.qualifiedQuantity > 0
      );
      
      const totalQualified = inspections.reduce((sum, q) => sum + q.qualifiedQuantity, 0);
      const totalInspected = inspections.reduce(
        (sum, q) => sum + q.qualifiedQuantity + q.unqualifiedQuantity,
        0
      );
      const passRate = totalInspected > 0 
        ? parseFloat(((totalQualified / totalInspected) * 100).toFixed(2)) 
        : 0;
      
      const onTimeCount = completedOrders.filter(o => {
        if (!o.actualDeliveryDate) return false;
        return new Date(o.actualDeliveryDate) <= new Date(o.deliveryDate);
      }).length;
      
      const onTimeDeliveryRate = completedOrders.length > 0
        ? parseFloat(((onTimeCount / completedOrders.length) * 100).toFixed(2))
        : 0;
      
      const score = parseFloat((passRate * 0.6 + onTimeDeliveryRate * 0.4).toFixed(2));
      
      performances.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        month: (month as string) || '2026-06',
        totalOrders: supplierOrders.length,
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

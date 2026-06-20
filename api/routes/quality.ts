import { Router, type Request, type Response } from 'express';
import { readDataFile, writeDataFile, generateId } from '../utils/db.js';
import type { QualityInspection, DefectType, QualityTrendPoint, Order, Supplier } from '../../shared/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await readDataFile<QualityInspection[]>('quality.json');
    
    const { orderNo, status, page = 1, pageSize = 10 } = req.query;
    
    let filtered = [...records];
    
    if (orderNo) {
      const no = (orderNo as string).toLowerCase();
      filtered = filtered.filter(r => r.orderNo.toLowerCase().includes(no));
    }
    
    if (status === 'pending') {
      filtered = filtered.filter(r => r.qualifiedQuantity === 0);
    } else if (status === 'completed') {
      filtered = filtered.filter(r => r.qualifiedQuantity > 0);
    }
    
    filtered.sort((a, b) => new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime());
    
    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 10;
    const start = (pageNum - 1) * size;
    const paginated = filtered.slice(start, start + size);
    
    res.json({
      success: true,
      data: {
        list: paginated,
        total: filtered.length,
        page: pageNum,
        pageSize: size,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quality records' });
  }
});

router.get('/defect-types', async (req: Request, res: Response): Promise<void> => {
  try {
    const defectTypes = await readDataFile<DefectType[]>('defectTypes.json');
    res.json({ success: true, data: defectTypes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch defect types' });
  }
});

router.get('/stats/trends', async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.query;
    const dayCount = parseInt(days as string) || 30;
    
    const records = await readDataFile<QualityInspection[]>('quality.json');
    const completedRecords = records.filter(r => r.qualifiedQuantity > 0);
    
    const trends: QualityTrendPoint[] = [];
    const today = new Date();
    
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = completedRecords.filter(r => 
        r.inspectedAt.split('T')[0] === dateStr
      );
      
      const totalQualified = dayRecords.reduce((sum, r) => sum + r.qualifiedQuantity, 0);
      const totalDefects = dayRecords.reduce((sum, r) => sum + r.unqualifiedQuantity, 0);
      const total = totalQualified + totalDefects;
      
      const passRate = total > 0 
        ? parseFloat(((totalQualified / total) * 100).toFixed(1)) 
        : 0;
      
      trends.push({
        date: dateStr,
        passRate,
        totalOrders: dayRecords.length,
      });
    }
    
    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quality trends' });
  }
});

router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<QualityInspection[]>('quality.json');
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    
    const totalOrders = orders.length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const pendingInspection = orders.filter(o => o.status === 'inspecting').length;
    
    const completedRecords = qualityRecords.filter(r => r.qualifiedQuantity > 0);
    const totalQualified = completedRecords.reduce((sum, r) => sum + r.qualifiedQuantity, 0);
    const totalDefects = completedRecords.reduce((sum, r) => sum + r.unqualifiedQuantity, 0);
    const totalInspected = totalQualified + totalDefects;
    const averagePassRate = totalInspected > 0 
      ? parseFloat(((totalQualified / totalInspected) * 100).toFixed(1)) 
      : 0;
    
    const completedOrders = orders.filter(o => o.status === 'completed');
    const onTimeCount = completedOrders.filter(o => {
      if (!o.actualDeliveryDate) return false;
      return new Date(o.actualDeliveryDate) <= new Date(o.deliveryDate);
    }).length;
    const onTimeDeliveryRate = completedOrders.length > 0
      ? parseFloat(((onTimeCount / completedOrders.length) * 100).toFixed(1))
      : 0;
    
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    
    res.json({
      success: true,
      data: {
        totalOrders,
        processingOrders,
        pendingInspection,
        averagePassRate,
        onTimeDeliveryRate,
        totalSuppliers: activeSuppliers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch summary stats' });
  }
});

router.get('/order/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await readDataFile<QualityInspection[]>('quality.json');
    const orderRecords = records.filter(r => r.orderId === req.params.orderId);
    
    res.json({ success: true, data: orderRecords });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quality records' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await readDataFile<QualityInspection[]>('quality.json');
    const record = records.find(r => r.id === req.params.id);
    
    if (!record) {
      res.status(404).json({ success: false, error: 'Quality record not found' });
      return;
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quality record' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await readDataFile<QualityInspection[]>('quality.json');
    const orders = await readDataFile<Order[]>('orders.json');
    
    const order = orders.find(o => o.id === req.body.orderId);
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }
    
    const { qualifiedQuantity, unqualifiedQuantity } = req.body;
    const total = qualifiedQuantity + unqualifiedQuantity;
    
    if (total !== order.quantity) {
      res.status(400).json({ 
        success: false, 
        error: `合格数量(${qualifiedQuantity}) + 不良数量(${unqualifiedQuantity}) 必须等于订单加工数量(${order.quantity})` 
      });
      return;
    }
    
    const passRate = total > 0 
      ? parseFloat(((qualifiedQuantity / total) * 100).toFixed(2)) 
      : 0;
    
    const newRecord: QualityInspection = {
      id: generateId('q'),
      orderId: req.body.orderId,
      orderNo: req.body.orderNo,
      inspector: req.body.inspector || '系统',
      qualifiedQuantity,
      unqualifiedQuantity,
      passRate,
      defects: req.body.defects || [],
      remark: req.body.remark || '',
      inspectedAt: new Date().toISOString(),
    };
    
    const existingIndex = records.findIndex(r => r.orderId === req.body.orderId);
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.unshift(newRecord);
    }
    
    await writeDataFile('quality.json', records);
    
    const orderIndex = orders.findIndex(o => o.id === req.body.orderId);
    if (orderIndex >= 0) {
      orders[orderIndex].status = 'completed';
      orders[orderIndex].actualDeliveryDate = new Date().toISOString().split('T')[0];
      orders[orderIndex].updatedAt = new Date().toISOString();
      await writeDataFile('orders.json', orders);
    }
    
    res.json({ success: true, data: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create quality record' });
  }
});

export default router;

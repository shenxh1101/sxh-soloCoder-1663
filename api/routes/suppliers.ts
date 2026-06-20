import { Router, type Request, type Response } from 'express';
import { readDataFile, writeDataFile, generateId } from '../utils/db.js';
import type { Supplier, SupplierPerformance, Order, QualityInspection } from '../../shared/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    
    const { status, keyword } = req.query;
    
    let filtered = [...suppliers];
    
    if (status && status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }
    
    if (keyword) {
      const kw = (keyword as string).toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(kw) ||
        s.contactPerson.toLowerCase().includes(kw)
      );
    }
    
    filtered.sort((a, b) => b.rating - a.rating);
    
    res.json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
});

router.get('/performance', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.query;
    const targetMonth = (month as string) || '2026-06';
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<QualityInspection[]>('quality.json');
    
    const isInMonth = (dateStr: string) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
      return year === targetYear && monthNum === targetMonthNum;
    };
    
    const getLatestInspectionsByOrder = (records: QualityInspection[]) => {
      const map = new Map<string, QualityInspection>();
      records.forEach(r => {
        const existing = map.get(r.orderId);
        if (!existing || new Date(r.inspectedAt) > new Date(existing.inspectedAt)) {
          map.set(r.orderId, r);
        }
      });
      return Array.from(map.values());
    };
    
    const performances: SupplierPerformance[] = suppliers
      .filter(s => s.status === 'active')
      .map(supplier => {
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
        const monthInspections = getLatestInspectionsByOrder(monthAllInspections);
        
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
        
        const defectDistribution: { type: string; count: number }[] = [];
        const defectMap = new Map<string, number>();
        monthInspections.forEach(q => {
          q.defects.forEach(d => {
            defectMap.set(d.type, (defectMap.get(d.type) || 0) + d.quantity);
          });
        });
        defectMap.forEach((count, type) => {
          defectDistribution.push({ type, count });
        });
        defectDistribution.sort((a, b) => b.count - a.count);
        
        const score = parseFloat((passRate * 0.6 + onTimeDeliveryRate * 0.4).toFixed(2));
        
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          month: targetMonth,
          totalOrders: monthCompletedOrders.length,
          totalQuantity,
          passRate,
          onTimeDeliveryRate,
          score,
          rank: 0,
          defectDistribution,
        };
      });
    
    performances.sort((a, b) => b.score - a.score);
    performances.forEach((p, i) => {
      p.rank = i + 1;
    });
    
    res.json({ success: true, data: performances });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance data' });
  }
});

router.get('/performance/range', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startMonth, endMonth } = req.query;
    const start = (startMonth as string) || '2026-04';
    const end = (endMonth as string) || '2026-06';
    
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<QualityInspection[]>('quality.json');
    
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
    
    const getLatestInspectionsByOrder = (records: QualityInspection[]) => {
      const map = new Map<string, QualityInspection>();
      records.forEach(r => {
        const existing = map.get(r.orderId);
        if (!existing || new Date(r.inspectedAt) > new Date(existing.inspectedAt)) {
          map.set(r.orderId, r);
        }
      });
      return Array.from(map.values());
    };
    
    const activeSuppliers = suppliers.filter(s => s.status === 'active');
    
    const result = activeSuppliers.map(supplier => {
      const supplierOrders = orders.filter(o => o.supplierId === supplier.id);
      
      const monthlyData = monthList.map(month => {
        const [targetYear, targetMonthNum] = month.split('-').map(Number);
        
        const isInMonth = (dateStr: string) => {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          return date.getFullYear() === targetYear && (date.getMonth() + 1) === targetMonthNum;
        };
        
        const monthCompletedOrders = supplierOrders.filter(o => 
          o.status === 'completed' && o.actualDeliveryDate && isInMonth(o.actualDeliveryDate)
        );
        
        const monthAllInspections = qualityRecords.filter(
          q => supplierOrders.some(o => o.id === q.orderId) 
            && q.qualifiedQuantity > 0 
            && isInMonth(q.inspectedAt)
        );
        const monthInspections = getLatestInspectionsByOrder(monthAllInspections);
        
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
        
        return {
          month,
          totalOrders: monthCompletedOrders.length,
          passRate,
          onTimeDeliveryRate,
        };
      });
      
      const totalOrders = monthlyData.reduce((sum, m) => sum + m.totalOrders, 0);
      const avgPassRate = monthlyData.length > 0
        ? parseFloat((monthlyData.reduce((sum, m) => sum + m.passRate, 0) / monthlyData.length).toFixed(2))
        : 0;
      const avgOnTimeRate = monthlyData.length > 0
        ? parseFloat((monthlyData.reduce((sum, m) => sum + m.onTimeDeliveryRate, 0) / monthlyData.length).toFixed(2))
        : 0;
      const score = parseFloat((avgPassRate * 0.6 + avgOnTimeRate * 0.4).toFixed(2));
      
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalOrders,
        avgPassRate,
        avgOnTimeRate,
        score,
        monthlyData,
      };
    });
    
    result.sort((a, b) => b.score - a.score);
    
    res.json({ 
      success: true, 
      data: {
        months: monthList,
        suppliers: result,
      }
    });
  } catch (error) {
    console.error('Performance range error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance range data' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    const supplier = suppliers.find(s => s.id === req.params.id);
    
    if (!supplier) {
      res.status(404).json({ success: false, error: 'Supplier not found' });
      return;
    }
    
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch supplier' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    
    const newSupplier: Supplier = {
      id: generateId('s'),
      name: req.body.name,
      contactPerson: req.body.contactPerson,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      rating: req.body.rating || 3.0,
      status: req.body.status || 'active',
      cooperationDate: req.body.cooperationDate || new Date().toISOString().split('T')[0],
      remark: req.body.remark || '',
    };
    
    suppliers.unshift(newSupplier);
    await writeDataFile('suppliers.json', suppliers);
    
    res.json({ success: true, data: newSupplier });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create supplier' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    const index = suppliers.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Supplier not found' });
      return;
    }
    
    suppliers[index] = {
      ...suppliers[index],
      ...req.body,
      id: suppliers[index].id,
    };
    
    await writeDataFile('suppliers.json', suppliers);
    
    res.json({ success: true, data: suppliers[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update supplier' });
  }
});

export default router;

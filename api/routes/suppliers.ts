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
    const suppliers = await readDataFile<Supplier[]>('suppliers.json');
    const orders = await readDataFile<Order[]>('orders.json');
    const qualityRecords = await readDataFile<QualityInspection[]>('quality.json');
    
    const performances: SupplierPerformance[] = suppliers
      .filter(s => s.status === 'active')
      .map(supplier => {
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
        
        const defectDistribution: { type: string; count: number }[] = [];
        const defectMap = new Map<string, number>();
        inspections.forEach(q => {
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
          month: (month as string) || '2026-06',
          totalOrders: supplierOrders.length,
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
    res.status(500).json({ success: false, error: 'Failed to fetch performance data' });
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

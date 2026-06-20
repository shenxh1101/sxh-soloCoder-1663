import { Router, type Request, type Response } from 'express';
import { readDataFile, writeDataFile, generateId } from '../utils/db.js';
import type { Order } from '../../shared/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    
    const { status, supplierId, keyword, page = 1, pageSize = 10 } = req.query;
    
    let filtered = [...orders];
    
    if (status && status !== 'all') {
      filtered = filtered.filter(o => o.status === status);
    }
    
    if (supplierId && supplierId !== 'all') {
      filtered = filtered.filter(o => o.supplierId === supplierId);
    }
    
    if (keyword) {
      const kw = (keyword as string).toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNo.toLowerCase().includes(kw) ||
        o.partName.toLowerCase().includes(kw) ||
        o.partNo.toLowerCase().includes(kw)
      );
    }
    
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
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
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    const order = orders.find(o => o.id === req.params.id);
    
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    
    const newOrder: Order = {
      id: generateId('o'),
      orderNo: req.body.orderNo,
      partName: req.body.partName,
      partNo: req.body.partNo,
      quantity: req.body.quantity,
      unitPrice: req.body.unitPrice,
      totalPrice: req.body.totalPrice,
      deliveryDate: req.body.deliveryDate,
      supplierId: req.body.supplierId,
      supplierName: req.body.supplierName,
      drawings: req.body.drawings || [],
      status: 'pending',
      remark: req.body.remark || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    orders.unshift(newOrder);
    await writeDataFile('orders.json', orders);
    
    res.json({ success: true, data: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    const index = orders.findIndex(o => o.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    
    orders[index] = {
      ...orders[index],
      ...req.body,
      id: orders[index].id,
      createdAt: orders[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    await writeDataFile('orders.json', orders);
    
    res.json({ success: true, data: orders[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    const filtered = orders.filter(o => o.id !== req.params.id);
    
    if (filtered.length === orders.length) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    
    await writeDataFile('orders.json', filtered);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await readDataFile<Order[]>('orders.json');
    const index = orders.findIndex(o => o.id === req.params.id);
    
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    
    orders[index].status = req.body.status;
    orders[index].updatedAt = new Date().toISOString();
    
    if (req.body.status === 'completed' && req.body.actualDeliveryDate) {
      orders[index].actualDeliveryDate = req.body.actualDeliveryDate;
    }
    
    await writeDataFile('orders.json', orders);
    
    res.json({ success: true, data: orders[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

export default router;

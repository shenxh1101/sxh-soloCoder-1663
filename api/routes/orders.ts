import { Router, type Request, type Response } from 'express';
import { readDataFile, writeDataFile, generateId } from '../utils/db.js';
import type { Order, DrawingFile } from '../../shared/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

router.get('/drawings/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    const files = fs.readdirSync(uploadsDir);
    const matchedFile = files.find(f => f.startsWith(fileId + '.'));
    
    if (!matchedFile) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }
    
    const filePath = path.join(uploadsDir, matchedFile);
    const orders = await readDataFile<Order[]>('orders.json');
    
    let fileName = matchedFile;
    for (const order of orders) {
      const drawing = order.drawings.find(d => d.id === fileId);
      if (drawing) {
        fileName = drawing.name;
        break;
      }
    }
    
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download drawing error:', error);
    res.status(500).json({ success: false, error: 'Failed to download file' });
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
    
    const drawings: DrawingFile[] = [];
    
    if (req.body.drawings && Array.isArray(req.body.drawings)) {
      for (const drawing of req.body.drawings) {
        if (drawing.data && drawing.name) {
          const fileId = generateId('dr');
          const ext = path.extname(drawing.name) || '.pdf';
          const fileName = `${fileId}${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          
          const base64Data = drawing.data.replace(/^data:[^,]+,/, '');
          fs.writeFileSync(filePath, base64Data, 'base64');
          
          const stats = fs.statSync(filePath);
          
          drawings.push({
            id: fileId,
            name: drawing.name,
            type: drawing.type || 'application/octet-stream',
            size: stats.size,
            url: `/api/orders/drawings/${fileId}`,
            uploadedAt: new Date().toISOString(),
          });
        }
      }
    }
    
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
      drawings,
      status: 'pending',
      remark: req.body.remark || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    orders.unshift(newOrder);
    await writeDataFile('orders.json', orders);
    
    res.json({ success: true, data: newOrder });
  } catch (error) {
    console.error('Create order error:', error);
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

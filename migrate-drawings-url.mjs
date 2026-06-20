import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.join(__dirname, 'api', 'data', 'orders.json');

try {
  const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));
  
  let updatedCount = 0;
  
  for (const order of orders) {
    if (!order.drawings) continue;
    
    order.drawings = order.drawings.map(drawing => {
      if (!drawing.url || !drawing.url.startsWith('/api/')) {
        updatedCount++;
        return {
          ...drawing,
          url: `/api/orders/drawings/${drawing.id}`,
        };
      }
      return drawing;
    });
  }
  
  writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf-8');
  console.log(`✅ 迁移完成，共更新 ${updatedCount} 个图纸的 URL`);
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  process.exit(1);
}

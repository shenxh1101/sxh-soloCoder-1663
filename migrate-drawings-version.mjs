import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.join(__dirname, 'api', 'data', 'orders.json');

try {
  const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));
  
  let updatedCount = 0;
  const drawingNamesMap = new Map();
  
  for (const order of orders) {
    if (!order.drawings) continue;
    
    order.drawings = order.drawings.map(drawing => {
      if (!drawingNamesMap.has(`${order.id}-${drawing.name}`)) {
        drawingNamesMap.set(`${order.id}-${drawing.name}`, 0);
      }
      const count = drawingNamesMap.get(`${order.id}-${drawing.name}`) + 1;
      drawingNamesMap.set(`${order.id}-${drawing.name}`, count);
      
      const hasVersionFields = 'uploader' in drawing && 'version' in drawing && 'isCurrent' in drawing;
      if (!hasVersionFields) {
        updatedCount++;
        return {
          ...drawing,
          uploader: '系统',
          version: count,
          isCurrent: true,
        };
      }
      return drawing;
    });
  }
  
  writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf-8');
  console.log(`✅ 迁移完成，共更新 ${updatedCount} 个图纸的版本信息`);
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  process.exit(1);
}

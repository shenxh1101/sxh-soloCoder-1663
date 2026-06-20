import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.join(__dirname, 'api', 'data', 'orders.json');

function generateId(prefix) {
  return prefix + Math.random().toString(36).substring(2, 10);
}

try {
  const orders = JSON.parse(readFileSync(ordersPath, 'utf-8'));
  
  let updatedCount = 0;
  
  for (const order of orders) {
    if (!order.drawings) continue;
    
    const nameToGroupId = new Map();
    
    order.drawings = order.drawings.map(drawing => {
      const hasGroupId = 'groupId' in drawing;
      
      if (!hasGroupId) {
        updatedCount++;
        let groupId = nameToGroupId.get(drawing.name);
        if (!groupId) {
          groupId = generateId('grp');
          nameToGroupId.set(drawing.name, groupId);
        }
        return {
          ...drawing,
          groupId,
        };
      }
      return drawing;
    });
  }
  
  writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf-8');
  console.log(`✅ 迁移完成，共更新 ${updatedCount} 个图纸的 groupId`);
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  process.exit(1);
}

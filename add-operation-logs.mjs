import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.join(__dirname, 'api', 'data', 'orders.json');
let orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));

function generateId(prefix) {
  return prefix + Math.random().toString(36).substring(2, 15);
}

function addLog(order, type, title, description, operator, timeOffset = 0) {
  const baseTime = new Date(order.createdAt).getTime();
  const log = {
    id: generateId('log'),
    type,
    title,
    description,
    operator,
    createdAt: new Date(baseTime + timeOffset * 60 * 60 * 1000).toISOString(),
  };
  order.operationLogs.push(log);
}

for (const order of orders) {
  order.operationLogs = [];
  
  addLog(order, 'create', '订单创建', `技术部创建订单 ${order.orderNo}`, '系统', 0);
  
  if (order.drawings && order.drawings.length > 0) {
    const drawingNames = order.drawings.map(d => d.name).join('、');
    addLog(order, 'drawing_upload', '图纸上传', `上传图纸：${drawingNames}`, '系统', 0.5);
  }
  
  if (order.status === 'pending') {
    continue;
  }
  
  addLog(order, 'dispatch', '供应商接单', `${order.supplierName} 接收订单`, order.supplierName, 2);
  
  if (order.status === 'processing') {
    continue;
  }
  
  addLog(order, 'process_complete', '加工完成', '供应商完成生产加工', order.supplierName, 48);
  
  if (order.status === 'inspecting') {
    continue;
  }
  
  if (order.status === 'completed') {
    const passRate = order.quantity > 0 ? Math.round((order.quantity - 5) / order.quantity * 100) : 100;
    addLog(order, 'inspect_pass', '质检通过', '订单质检合格，已完成入库', '质检员', 50);
  } else if (order.status === 'rejected') {
    addLog(order, 'reject', '订单退回', '订单已退回供应商', '质检员', 50);
  }
}

fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');

console.log('✅ 已为所有订单添加操作记录');
console.log('订单数:', orders.length);
for (const order of orders.slice(0, 3)) {
  console.log(`\n${order.orderNo} (${order.status}):`);
  for (const log of order.operationLogs) {
    console.log(`  - ${log.title} (${log.createdAt})`);
  }
}

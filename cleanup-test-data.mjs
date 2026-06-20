import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.join(__dirname, 'api', 'data', 'orders.json');
const qualityPath = path.join(__dirname, 'api', 'data', 'quality.json');
const uploadsDir = path.join(__dirname, 'api', 'uploads');

let orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
let qualityRecords = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));

console.log('=== 清理前统计 ===');
console.log('订单总数:', orders.length);
console.log('质检记录总数:', qualityRecords.length);

const testOrders = orders.filter(o => o.orderNo.startsWith('TEST-'));
console.log('\n测试订单:', testOrders.map(o => o.id + ' - ' + o.orderNo));

const testQuality = qualityRecords.filter(q => q.id.startsWith('qmqmv'));
console.log('测试质检记录:', testQuality.map(q => q.id + ' - ' + q.orderNo));

orders = orders.filter(o => !o.orderNo.startsWith('TEST-'));
qualityRecords = qualityRecords.filter(q => !q.id.startsWith('qmqmv'));

const o016 = orders.find(o => o.id === 'o016');
if (o016) {
  console.log('\n=== 恢复 o016 订单状态 ===');
  console.log('当前状态:', o016.status);
  console.log('当前 actualDeliveryDate:', o016.actualDeliveryDate);
  
  o016.status = 'pending';
  delete o016.actualDeliveryDate;
  o016.updatedAt = o016.createdAt;
  
  console.log('恢复后状态:', o016.status);
  console.log('恢复后 updatedAt:', o016.updatedAt);
}

fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
fs.writeFileSync(qualityPath, JSON.stringify(qualityRecords, null, 2), 'utf8');

console.log('\n=== 清理后统计 ===');
console.log('订单总数:', orders.length);
console.log('质检记录总数:', qualityRecords.length);

if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  const testFiles = files.filter(f => f.startsWith('drmqmv'));
  console.log('\n上传目录文件数:', files.length);
  console.log('测试上传文件:', testFiles.length);
  
  testFiles.forEach(f => {
    fs.unlinkSync(path.join(uploadsDir, f));
    console.log('已删除:', f);
  });
}

console.log('\n✅ 自测数据清理完成！');

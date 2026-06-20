import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const qualityFile = join(__dirname, 'api', 'data', 'quality.json');

const qualityData = JSON.parse(readFileSync(qualityFile, 'utf-8'));

const orderInspections = {};

qualityData.forEach(record => {
  if (!orderInspections[record.orderId]) {
    orderInspections[record.orderId] = [];
  }
  orderInspections[record.orderId].push(record);
});

Object.values(orderInspections).forEach(records => {
  records.sort((a, b) => new Date(a.inspectedAt) - new Date(b.inspectedAt));
  records.forEach((record, index) => {
    record.inspectionRound = index + 1;
  });
});

writeFileSync(qualityFile, JSON.stringify(qualityData, null, 2), 'utf-8');

console.log('✅ 已为所有质检记录添加 inspectionRound 字段');
console.log(`   共处理 ${qualityData.length} 条质检记录`);
console.log(`   涉及 ${Object.keys(orderInspections).length} 个订单`);

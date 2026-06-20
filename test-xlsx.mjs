import * as XLSX from 'xlsx';
import fs from 'fs';

const log = [];
log.push('XLSX version: ' + XLSX.version);
log.push('XLSX utils: ' + typeof XLSX.utils);

const testData = [
  { name: '测试', value: 123 },
  { name: '测试2', value: 456 },
];

try {
  const worksheet = XLSX.utils.json_to_sheet(testData);
  log.push('worksheet created: ' + typeof worksheet);
  
  const workbook = XLSX.utils.book_new();
  log.push('workbook created: ' + typeof workbook);
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试');
  log.push('sheet appended');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  log.push('buffer type: ' + typeof buffer);
  log.push('buffer is Buffer: ' + (buffer instanceof Buffer));
  log.push('buffer is Uint8Array: ' + (buffer instanceof Uint8Array));
  log.push('buffer size: ' + buffer.length + ' bytes');
  
  fs.writeFileSync('test-output.xlsx', buffer);
  log.push('File written successfully');
  log.push('SUCCESS');
} catch (error) {
  log.push('ERROR: ' + error.message);
  log.push(error.stack);
}

fs.writeFileSync('test-xlsx-result.txt', log.join('\n'));
console.log('Test done, result written to test-xlsx-result.txt');

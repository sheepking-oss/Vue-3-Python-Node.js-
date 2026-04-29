const fs = require('fs');
const path = require('path');

function filterSpecialChars(text) {
  if (typeof text !== 'string') return text;
  
  let filtered = text;
  
  filtered = filtered.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  filtered = filtered.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '');
  
  filtered = filtered.replace(/[\u0300-\u036F]/g, '');
  
  const safePattern = /[^\u4e00-\u9fa5\u3400-\u4DBF\u20000-\u2A6DF\s0-9a-zA-Z\-_.,:;!?'"()\[\]{}<>+=@#$%^&*\/\\|~`￥¥€£$₽₹฿₩₫₪₴₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g;
  filtered = filtered.replace(safePattern, '');
  
  filtered = filtered.replace(/\s+/g, ' ');
  
  filtered = filtered.trim();
  
  return filtered;
}

function filterPriceValue(text) {
  if (typeof text === 'number') {
    return text;
  }
  
  if (typeof text !== 'string') {
    return text;
  }
  
  let cleaned = text.trim();
  
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '');
  
  cleaned = cleaned.replace(/[￥¥€£$₽₹฿₩₫₪₴₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g, '');
  
  cleaned = cleaned.replace(/[元块\\\/]/g, '');
  
  cleaned = cleaned.replace(/[^\d.\-]/g, '');
  
  const priceMatch = cleaned.match(/-?\d+\.?\d*/);
  if (priceMatch) {
    const priceStr = priceMatch[0];
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 0) {
      return price;
    }
  }
  
  return 0;
}

function normalizePriceText(text) {
  if (typeof text === 'number') {
    return text;
  }
  
  if (typeof text !== 'string') {
    return text;
  }
  
  let normalized = text;
  
  normalized = normalized.replace(/[０-９]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
  });
  
  normalized = normalized.replace(/[．。]/g, '.');
  
  normalized = normalized.replace(/[，]/g, ',');
  
  return normalized;
}

console.log('========================================');
console.log('Node.js 数据清洗规则测试');
console.log('========================================\n');

const testCases = [
  {
    name: '价格格式化测试',
    tests: [
      { input: '￥299.00', expected: 299.00 },
      { input: '¥199.50', expected: 199.50 },
      { input: '399元', expected: 399.00 },
      { input: '￥ 499 . 99', expected: 499.99 },
      { input: 'price: 599.00元', expected: 599.00 },
      { input: '1299.00', expected: 1299.00 },
      { input: '0.01', expected: 0.01 },
      { input: '9999.99', expected: 9999.99 },
    ]
  },
  {
    name: '全角字符转换测试',
    tests: [
      { input: '１２３．４５', expected: 123.45 },
      { input: '￥９９９．００', expected: 999.00 },
      { input: '０．０１', expected: 0.01 },
    ]
  },
  {
    name: '特殊字符过滤测试',
    tests: [
      { input: '￥299\u200B.00', expected: 299.00 },
      { input: '¥\uFEFF199.50', expected: 199.50 },
      { input: '399\u200C.00元', expected: 399.00 },
    ]
  },
  {
    name: '通用字符串过滤测试',
    tests: [
      { input: '雷蛇 BlackWidow 机械键盘 🎮', expected: '雷蛇 BlackWidow 机械键盘' },
      { input: '罗技 G Pro X 键盘 ⌨️ 好评!', expected: '罗技 G Pro X 键盘 好评!' },
      { input: '樱桃 Cherry MX-Board 3.0', expected: '樱桃 Cherry MX-Board 3.0' },
      { input: '价格: ¥299.00 (优惠中)', expected: '价格: ¥299.00 (优惠中)' },
    ]
  }
];

let allPassed = true;

testCases.forEach((testGroup) => {
  console.log(`【${testGroup.name}】`);
  console.log('-'.repeat(50));
  
  testGroup.tests.forEach((test, index) => {
    let result;
    let passed;
    
    if (testGroup.name === '通用字符串过滤测试') {
      result = filterSpecialChars(test.input);
      passed = result === test.expected;
    } else {
      const normalized = normalizePriceText(test.input);
      result = filterPriceValue(normalized);
      passed = Math.abs(result - test.expected) < 0.0001;
    }
    
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = passed ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    if (!passed) {
      allPassed = false;
    }
    
    console.log(`${index + 1}. 输入: "${test.input}"`);
    console.log(`   期望: ${test.expected}`);
    console.log(`   结果: ${result}`);
    console.log(`   状态: ${statusColor}${status}${resetColor}`);
    console.log();
  });
});

console.log('='.repeat(50));
if (allPassed) {
  console.log('\x1b[32m✓ 所有测试通过!\x1b[0m');
} else {
  console.log('\x1b[31m✗ 部分测试失败，请检查代码\x1b[0m');
}
console.log('='.repeat(50));

console.log('\n\n验证价格清洗后的输出效果:');
console.log('-'.repeat(50));

const sampleProducts = [
  { id: 'test_1', name: '雷蛇 BlackWidow 机械键盘 🎮', price: '￥299.00', original_price: '¥399.00', brand: '雷蛇' },
  { id: 'test_2', name: '罗技 G Pro X 键盘 ⌨️', price: '１２３．４５', original_price: '￥５９９．００', brand: '罗技' },
  { id: 'test_3', name: '樱桃 Cherry MX-Board', price: '899元', original_price: '999元', brand: '樱桃' },
  { id: 'test_4', name: '阿米洛 Varmilo 键盘', price: 499.00, original_price: 599.00, brand: '阿米洛' },
];

const priceFields = ['price', 'original_price'];
const numericFields = ['sales_count', 'comment_count', 'rating', 'key_count'];

function cleanProductData(product) {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(product)) {
    if (priceFields.includes(key)) {
      if (typeof value === 'string') {
        const normalized = normalizePriceText(value);
        cleaned[key] = filterPriceValue(normalized);
      } else if (typeof value === 'number') {
        cleaned[key] = value;
      } else {
        cleaned[key] = filterPriceValue(value);
      }
    }
    else if (numericFields.includes(key)) {
      if (typeof value === 'number') {
        cleaned[key] = value;
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        cleaned[key] = isNaN(parsed) ? value : parsed;
      } else {
        cleaned[key] = value;
      }
    }
    else if (typeof value === 'string') {
      cleaned[key] = filterSpecialChars(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

sampleProducts.forEach((product, index) => {
  console.log(`\n商品 ${index + 1}:`);
  console.log(`  原始数据:`);
  console.log(`    name: "${product.name}"`);
  console.log(`    price: "${product.price}" (${typeof product.price})`);
  console.log(`    original_price: "${product.original_price}" (${typeof product.original_price})`);
  
  const cleaned = cleanProductData(product);
  
  console.log(`  清洗后数据:`);
  console.log(`    name: "${cleaned.name}"`);
  console.log(`    price: ${cleaned.price} (${typeof cleaned.price})`);
  console.log(`    original_price: ${cleaned.original_price} (${typeof cleaned.original_price})`);
  console.log(`    brand: "${cleaned.brand}"`);
  
  const priceValid = typeof cleaned.price === 'number' && !isNaN(cleaned.price) && cleaned.price > 0;
  const nameValid = cleaned.name.length > 0 && !cleaned.name.includes('🎮') && !cleaned.name.includes('⌨️');
  
  console.log(`  验证: ${priceValid && nameValid ? '✓ 通过' : '✗ 失败'}`);
});

console.log('\n\n' + '='.repeat(50));
console.log('测试完成！');
console.log('='.repeat(50));

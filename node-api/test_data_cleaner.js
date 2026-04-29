const dataCleaner = require('./data_cleaner');
const { DataCleaner, CONSTANTS } = dataCleaner;

console.log('='.repeat(80));
console.log('Node.js 数据清洗模块完整测试');
console.log('='.repeat(80));
console.log('\n');

const cleaner = new DataCleaner({
    strictMode: false,
    logErrors: true
});

const testResults = {
    total: 0,
    passed: 0,
    failed: 0
};

function runTest(category, testName, actual, expected) {
    testResults.total++;
    
    let passed = false;
    
    if (typeof expected === 'number') {
        passed = Math.abs(actual - expected) < 0.0001;
    } else {
        passed = JSON.stringify(actual) === JSON.stringify(expected);
    }
    
    if (passed) {
        testResults.passed++;
        console.log(`  ✓ [${category}] ${testName}`);
        console.log(`    期望: ${JSON.stringify(expected)}`);
        console.log(`    结果: ${JSON.stringify(actual)}`);
    } else {
        testResults.failed++;
        console.log(`  ✗ [${category}] ${testName}`);
        console.log(`    期望: ${JSON.stringify(expected)}`);
        console.log(`    结果: ${JSON.stringify(actual)}`);
    }
    console.log('');
}

console.log('【第一部分：价格字段精准提取测试】');
console.log('-'.repeat(80));
console.log('\n');

const priceTests = [
    { name: '标准格式：￥299.00', input: '￥299.00', expected: 299.00 },
    { name: '标准格式：¥199.50', input: '¥199.50', expected: 199.50 },
    { name: '小数点保留两位：￥99.99', input: '￥99.99', expected: 99.99 },
    { name: '小数点保留一位：￥99.9', input: '￥99.9', expected: 99.9 },
    { name: '整数价格：￥999', input: '￥999', expected: 999 },
    { name: '最小价格：￥0.01', input: '￥0.01', expected: 0.01 },
    { name: '最大价格：￥9999.99', input: '￥9999.99', expected: 9999.99 },
    { name: '美元符号：$299.00', input: '$299.00', expected: 299.00 },
    { name: '欧元符号：€299.00', input: '€299.00', expected: 299.00 },
    { name: '英镑符号：£299.00', input: '£299.00', expected: 299.00 },
    { name: '元单位：299元', input: '299元', expected: 299 },
    { name: '带单位：￥299.00元', input: '￥299.00元', expected: 299.00 },
    { name: '空格分隔：￥ 299 . 00', input: '￥ 299 . 00', expected: 299.00 },
];

priceTests.forEach(test => {
    const result = cleaner.parsePrice(test.input);
    runTest('价格提取', test.name, result, test.expected);
});

console.log('【第二部分：全角字符转换测试】');
console.log('-'.repeat(80));
console.log('\n');

const fullwidthTests = [
    { name: '全角数字：￥１２３．４５', input: '￥１２３．４５', expected: 123.45 },
    { name: '全角整数：￥９９９', input: '￥９９９', expected: 999 },
    { name: '全角小数点：￥１００．００', input: '￥１００．００', expected: 100.00 },
    { name: '全角混合：￥１２３.４５', input: '￥１２３.４５', expected: 123.45 },
];

fullwidthTests.forEach(test => {
    const result = cleaner.parsePrice(test.input);
    runTest('全角转换', test.name, result, test.expected);
});

console.log('【第三部分：不可见字符过滤测试】');
console.log('-'.repeat(80));
console.log('\n');

const invisibleTests = [
    { name: '包含零宽空格：￥299\u200B.00', input: '￥299\u200B.00', expected: 299.00 },
    { name: '包含BOM：\uFEFF￥299.00', input: '\uFEFF￥299.00', expected: 299.00 },
    { name: '包含零宽连接符：￥299\u200C.00', input: '￥299\u200C.00', expected: 299.00 },
    { name: '包含控制字符：￥299\x08.00', input: '￥299\x08.00', expected: 299.00 },
    { name: '多种不可见字符混合：\u200B￥\uFEFF299\u200C.\u200D00', input: '\u200B￥\uFEFF299\u200C.\u200D00', expected: 299.00 },
];

invisibleTests.forEach(test => {
    const result = cleaner.parsePrice(test.input);
    runTest('不可见字符', test.name, result, test.expected);
});

console.log('【第四部分：价格格式边界测试】');
console.log('-'.repeat(80));
console.log('\n');

const boundaryTests = [
    { name: '三位小数自动四舍五入：￥100.123', input: '￥100.123', expected: 100.12 },
    { name: '四位小数自动四舍五入：￥100.1236', input: '￥100.1236', expected: 100.12 },
    { name: '负数价格返回0：￥-100', input: '￥-100', expected: 0 },
    { name: '空字符串返回0', input: '', expected: 0 },
    { name: 'null返回0', input: null, expected: 0 },
    { name: '已经是数字：299.00', input: 299.00, expected: 299.00 },
    { name: '数字0：0', input: 0, expected: 0 },
];

boundaryTests.forEach(test => {
    const result = cleaner.parsePrice(test.input);
    runTest('边界情况', test.name, result, test.expected);
});

console.log('【第五部分：价格提取详细信息测试】');
console.log('-'.repeat(80));
console.log('\n');

const extractTests = [
    { 
        name: '标准提取信息', 
        input: '￥299.00', 
        expected: { success: true, value: 299.00, method: 'extracted' }
    },
    { 
        name: '已经是数字', 
        input: 199.50, 
        expected: { success: true, value: 199.50, method: 'already_number' }
    },
    { 
        name: '四舍五入', 
        input: '￥100.125', 
        expected: { success: true, value: 100.13, method: 'rounded' }
    },
    { 
        name: '无效价格', 
        input: 'abc', 
        expected: { success: false, value: 0, method: 'no_match' }
    },
];

extractTests.forEach(test => {
    const result = cleaner.extractPriceValue(test.input);
    const simplified = {
        success: result.success,
        value: result.value,
        method: result.method
    };
    const simplifiedExpected = {
        success: test.expected.success,
        value: test.expected.value,
        method: test.expected.method
    };
    
    testResults.total++;
    const passed = simplified.success === simplifiedExpected.success &&
                   Math.abs(simplified.value - simplifiedExpected.value) < 0.0001 &&
                   simplified.method === simplifiedExpected.method;
    
    if (passed) {
        testResults.passed++;
        console.log(`  ✓ [详细信息] ${test.name}`);
    } else {
        testResults.failed++;
        console.log(`  ✗ [详细信息] ${test.name}`);
    }
    console.log(`    期望: success=${simplifiedExpected.success}, value=${simplifiedExpected.value}, method=${simplifiedExpected.method}`);
    console.log(`    结果: success=${simplified.success}, value=${simplified.value}, method=${simplified.method}`);
    console.log('');
});

console.log('【第六部分：完整商品数据清洗测试】');
console.log('-'.repeat(80));
console.log('\n');

const sampleProduct = {
    id: 'test_001',
    name: '雷蛇 BlackWidow 机械键盘 🎮\u200B',
    price: '￥299.00',
    original_price: '￥３９９．００',
    brand: '雷蛇',
    model: 'BlackWidow',
    axis_type: '红轴',
    key_count: '87',
    sales_count: '1000',
    rating: '4.8',
    shop: '雷蛇官方旗舰店',
    image_url: 'https://example.com/image.jpg',
    description: '这是一款高质量的机械键盘，手感舒适，适合游戏和办公使用。\n支持多种轴体选择。'
};

const cleanedProduct = cleaner.cleanProduct(sampleProduct);

console.log('原始商品数据:');
console.log(JSON.stringify(sampleProduct, null, 2));
console.log('\n');
console.log('清洗后商品数据:');
console.log(JSON.stringify(cleanedProduct, null, 2));
console.log('\n');

const productValidation = [
    { 
        name: '价格字段类型和值', 
        test: typeof cleanedProduct.price === 'number' && Math.abs(cleanedProduct.price - 299.00) < 0.0001,
        message: `price = ${cleanedProduct.price} (类型: ${typeof cleanedProduct.price})`
    },
    { 
        name: '原价字段类型和值（全角转换）', 
        test: typeof cleanedProduct.original_price === 'number' && Math.abs(cleanedProduct.original_price - 399.00) < 0.0001,
        message: `original_price = ${cleanedProduct.original_price} (类型: ${typeof cleanedProduct.original_price})`
    },
    { 
        name: '名称字段移除emoji和零宽字符', 
        test: !cleanedProduct.name.includes('🎮') && !cleanedProduct.name.includes('\u200B'),
        message: `name = "${cleanedProduct.name}"`
    },
    { 
        name: '销量字段转换为数字', 
        test: typeof cleanedProduct.sales_count === 'number' && cleanedProduct.sales_count === 1000,
        message: `sales_count = ${cleanedProduct.sales_count} (类型: ${typeof cleanedProduct.sales_count})`
    },
    { 
        name: '评分字段转换为数字', 
        test: typeof cleanedProduct.rating === 'number' && Math.abs(cleanedProduct.rating - 4.8) < 0.0001,
        message: `rating = ${cleanedProduct.rating} (类型: ${typeof cleanedProduct.rating})`
    },
    { 
        name: '包含更新时间', 
        test: cleanedProduct.updatedAt !== undefined,
        message: `updatedAt = ${cleanedProduct.updatedAt}`
    },
];

productValidation.forEach(validation => {
    testResults.total++;
    if (validation.test) {
        testResults.passed++;
        console.log(`  ✓ [商品清洗] ${validation.name}`);
    } else {
        testResults.failed++;
        console.log(`  ✗ [商品清洗] ${validation.name}`);
    }
    console.log(`    ${validation.message}`);
    console.log('');
});

console.log('【第七部分：价格验证和格式化工具测试】');
console.log('-'.repeat(80));
console.log('\n');

const validationTests = [
    { name: '有效价格验证：299.00', value: 299.00, expected: true },
    { name: '有效价格验证：0.01', value: 0.01, expected: true },
    { name: '无效价格验证：NaN', value: NaN, expected: false },
    { name: '无效价格验证：-100', value: -100, expected: false },
    { name: '无效价格验证：Infinity', value: Infinity, expected: false },
    { name: '无效价格验证：字符串', value: '299', expected: false },
];

validationTests.forEach(test => {
    const result = DataCleaner.validatePrice(test.value);
    runTest('价格验证', test.name, result, test.expected);
});

const formatTests = [
    { name: '价格格式化：299 → 299.00', value: 299, expected: '299.00' },
    { name: '价格格式化：199.5 → 199.50', value: 199.5, expected: '199.50' },
    { name: '价格格式化：99.99 → 99.99', value: 99.99, expected: '99.99' },
    { name: '无效价格格式化：NaN → 0.00', value: NaN, expected: '0.00' },
];

formatTests.forEach(test => {
    const result = DataCleaner.formatPrice(test.value);
    runTest('价格格式化', test.name, result, test.expected);
});

console.log('【第八部分：综合测试 - 完整数据流验证】');
console.log('-'.repeat(80));
console.log('\n');

const testProducts = [
    {
        id: 'jd_10001',
        name: '罗技 G Pro X 机械键盘 ⌨️\u200B',
        price: '￥899.00',
        original_price: '￥９９９．００',
        platform: '京东',
        brand: '罗技',
        sales_count: '5000',
        rating: '4.9'
    },
    {
        id: 'tmall_20002',
        name: '雷蛇 BlackWidow V3 键盘 🎮',
        price: '￥1299.99',
        original_price: '￥１５９９．００',
        platform: '天猫',
        brand: '雷蛇',
        sales_count: '3000',
        rating: '4.8'
    },
    {
        id: 'taobao_30003',
        name: '樱桃 Cherry MX-Board 3.0S',
        price: '$699.50',
        original_price: '¥799.00',
        platform: '淘宝',
        brand: '樱桃',
        sales_count: '1500',
        rating: '4.7'
    }
];

console.log('原始商品数据:');
testProducts.forEach((p, i) => {
    console.log(`\n商品 ${i + 1}:`);
    console.log(`  name: "${p.name}"`);
    console.log(`  price: "${p.price}" (类型: ${typeof p.price})`);
    console.log(`  original_price: "${p.original_price}" (类型: ${typeof p.original_price})`);
    console.log(`  sales_count: "${p.sales_count}" (类型: ${typeof p.sales_count})`);
    console.log(`  rating: "${p.rating}" (类型: ${typeof p.rating})`);
});

const cleanedProducts = testProducts.map(p => cleaner.cleanProduct(p));

console.log('\n\n清洗后商品数据:');
cleanedProducts.forEach((p, i) => {
    console.log(`\n商品 ${i + 1}:`);
    console.log(`  name: "${p.name}"`);
    console.log(`  price: ${p.price} (类型: ${typeof p.price})`);
    console.log(`  original_price: ${p.original_price} (类型: ${typeof p.original_price})`);
    console.log(`  sales_count: ${p.sales_count} (类型: ${typeof p.sales_count})`);
    console.log(`  rating: ${p.rating} (类型: ${typeof p.rating})`);
});

console.log('\n\n清洗结果验证:');

const comprehensiveTests = [
    { 
        name: '商品1 - price是数字且值正确', 
        test: typeof cleanedProducts[0].price === 'number' && Math.abs(cleanedProducts[0].price - 899.00) < 0.0001 
    },
    { 
        name: '商品1 - original_price全角转换正确', 
        test: typeof cleanedProducts[0].original_price === 'number' && Math.abs(cleanedProducts[0].original_price - 999.00) < 0.0001 
    },
    { 
        name: '商品1 - name移除emoji和零宽字符', 
        test: !cleanedProducts[0].name.includes('⌨️') && !cleanedProducts[0].name.includes('\u200B') 
    },
    { 
        name: '商品1 - sales_count转换为数字', 
        test: typeof cleanedProducts[0].sales_count === 'number' && cleanedProducts[0].sales_count === 5000 
    },
    { 
        name: '商品1 - rating转换为数字', 
        test: typeof cleanedProducts[0].rating === 'number' && Math.abs(cleanedProducts[0].rating - 4.9) < 0.0001 
    },
    { 
        name: '商品2 - price小数点保留两位', 
        test: typeof cleanedProducts[1].price === 'number' && Math.abs(cleanedProducts[1].price - 1299.99) < 0.0001 
    },
    { 
        name: '商品2 - name移除emoji', 
        test: !cleanedProducts[1].name.includes('🎮') 
    },
    { 
        name: '商品3 - 美元符号处理正确', 
        test: typeof cleanedProducts[2].price === 'number' && Math.abs(cleanedProducts[2].price - 699.50) < 0.0001 
    },
    { 
        name: '商品3 - 人民币符号处理正确', 
        test: typeof cleanedProducts[2].original_price === 'number' && Math.abs(cleanedProducts[2].original_price - 799.00) < 0.0001 
    },
];

comprehensiveTests.forEach(test => {
    testResults.total++;
    if (test.test) {
        testResults.passed++;
        console.log(`  ✓ [综合测试] ${test.name}`);
    } else {
        testResults.failed++;
        console.log(`  ✗ [综合测试] ${test.name}`);
    }
});

console.log('\n\n');
console.log('='.repeat(80));
console.log('测试结果汇总');
console.log('='.repeat(80));
console.log(`\n  总测试数: ${testResults.total}`);
console.log(`  通过测试: ${testResults.passed}`);
console.log(`  失败测试: ${testResults.failed}`);

const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
console.log(`  通过率: ${passRate}%`);

console.log('\n');
if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！数据清洗模块工作正常。');
    console.log('✅ 价格字段小数点正确保留');
    console.log('✅ ￥299.00 正确转换为 299.00');
    console.log('✅ 全角字符正确转换');
    console.log('✅ 不可见字符正确过滤');
    console.log('✅ 数值类型正确保留');
} else {
    console.log('⚠️  部分测试失败，请检查代码。');
}
console.log('='.repeat(80));

module.exports = {
    testResults,
    cleanedProducts
};

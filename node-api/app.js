const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const dataCleaner = require('./data_cleaner');
const { DataCleaner } = dataCleaner;

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DATA_FILES = {
  products: path.join(DATA_DIR, 'products.json'),
  priceHistory: path.join(DATA_DIR, 'price-history.json'),
  comments: path.join(DATA_DIR, 'comments.json')
};

app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

function loadData(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return [];
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    return false;
  }
}

function cleanProductData(product) {
  const cleaned = dataCleaner.cleanProduct(product);
  
  if (!cleaned.id) {
    cleaned.id = uuidv4();
  }
  
  return cleaned;
}

function cleanCommentData(comment) {
  const cleaned = dataCleaner.cleanComment(comment);
  
  if (!cleaned.id) {
    cleaned.id = uuidv4();
  }
  
  return cleaned;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'e-commerce-tracker-api'
  });
});

app.post('/api/products', (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid products data. Expected an array.'
      });
    }
    
    const existingProducts = loadData(DATA_FILES.products);
    const existingMap = new Map(existingProducts.map(p => [p.id, p]));
    
    const cleanedProducts = products.map(product => {
      const cleaned = cleanProductData(product);
      
      if (existingMap.has(cleaned.id)) {
        const existing = existingMap.get(cleaned.id);
        return { ...existing, ...cleaned };
      }
      
      return cleaned;
    });
    
    for (const product of cleanedProducts) {
      existingMap.set(product.id, product);
    }
    
    const allProducts = Array.from(existingMap.values());
    
    const saved = saveData(DATA_FILES.products, allProducts);
    
    res.json({
      success: saved,
      message: saved ? 'Products saved successfully' : 'Failed to save products',
      count: cleanedProducts.length,
      total: allProducts.length
    });
    
  } catch (error) {
    console.error('Error processing products:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/price-history', (req, res) => {
  try {
    const { price_history } = req.body;
    
    if (!price_history || !Array.isArray(price_history)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price history data. Expected an array.'
      });
    }
    
    const existingHistory = loadData(DATA_FILES.priceHistory);
    const existingMap = new Map(existingHistory.map(h => [`${h.product_id}_${h.date}`, h]));
    
    const cleanedHistory = price_history.map(history => {
      const cleaned = cleanProductData(history);
      const key = `${cleaned.product_id}_${cleaned.date}`;
      
      if (existingMap.has(key)) {
        const existing = existingMap.get(key);
        return { ...existing, ...cleaned };
      }
      
      return cleaned;
    });
    
    for (const history of cleanedHistory) {
      const key = `${history.product_id}_${history.date}`;
      existingMap.set(key, history);
    }
    
    const allHistory = Array.from(existingMap.values());
    
    const saved = saveData(DATA_FILES.priceHistory, allHistory);
    
    res.json({
      success: saved,
      message: saved ? 'Price history saved successfully' : 'Failed to save price history',
      count: cleanedHistory.length,
      total: allHistory.length
    });
    
  } catch (error) {
    console.error('Error processing price history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/comments', (req, res) => {
  try {
    const { comments } = req.body;
    
    if (!comments || !Array.isArray(comments)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comments data. Expected an array.'
      });
    }
    
    const existingComments = loadData(DATA_FILES.comments);
    const existingMap = new Map(existingComments.map(c => [c.id, c]));
    
    const cleanedComments = comments.map(comment => {
      const cleaned = cleanCommentData(comment);
      
      if (existingMap.has(cleaned.id)) {
        const existing = existingMap.get(cleaned.id);
        return { ...existing, ...cleaned };
      }
      
      return cleaned;
    });
    
    for (const comment of cleanedComments) {
      existingMap.set(comment.id, comment);
    }
    
    const allComments = Array.from(existingMap.values());
    
    const saved = saveData(DATA_FILES.comments, allComments);
    
    res.json({
      success: saved,
      message: saved ? 'Comments saved successfully' : 'Failed to save comments',
      count: cleanedComments.length,
      total: allComments.length
    });
    
  } catch (error) {
    console.error('Error processing comments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/products', (req, res) => {
  try {
    let products = loadData(DATA_FILES.products);
    
    const { 
      platform, 
      brand, 
      axis_type, 
      key_count, 
      min_price, 
      max_price,
      search,
      sort_by,
      sort_order,
      limit,
      offset
    } = req.query;
    
    if (platform) {
      products = products.filter(p => p.platform === platform);
    }
    
    if (brand) {
      const brands = Array.isArray(brand) ? brand : [brand];
      products = products.filter(p => brands.includes(p.brand));
    }
    
    if (axis_type) {
      const axisTypes = Array.isArray(axis_type) ? axis_type : [axis_type];
      products = products.filter(p => axisTypes.includes(p.axis_type));
    }
    
    if (key_count) {
      const keyCounts = (Array.isArray(key_count) ? key_count : [key_count])
        .map(k => parseInt(k)).filter(k => !isNaN(k));
      if (keyCounts.length > 0) {
        products = products.filter(p => keyCounts.includes(p.key_count));
      }
    }
    
    if (min_price !== undefined) {
      const minPrice = parseFloat(min_price);
      if (!isNaN(minPrice)) {
        products = products.filter(p => p.price >= minPrice);
      }
    }
    
    if (max_price !== undefined) {
      const maxPrice = parseFloat(max_price);
      if (!isNaN(maxPrice)) {
        products = products.filter(p => p.price <= maxPrice);
      }
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.model.toLowerCase().includes(searchTerm) ||
        p.shop.toLowerCase().includes(searchTerm)
      );
    }
    
    if (sort_by) {
      const order = sort_order === 'desc' ? -1 : 1;
      products = _.orderBy(products, [sort_by], [order === 1 ? 'asc' : 'desc']);
    }
    
    let paginatedProducts = products;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset) || 0;
    
    if (!isNaN(limitNum) && limitNum > 0) {
      paginatedProducts = products.slice(offsetNum, offsetNum + limitNum);
    }
    
    res.json({
      success: true,
      data: paginatedProducts,
      total: products.length,
      filtered: paginatedProducts.length,
      offset: offsetNum,
      limit: limitNum || null
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const products = loadData(DATA_FILES.products);
    
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/price-history', (req, res) => {
  try {
    let history = loadData(DATA_FILES.priceHistory);
    
    const { 
      product_id, 
      platform,
      start_date,
      end_date,
      sort_by,
      sort_order
    } = req.query;
    
    if (product_id) {
      const productIds = Array.isArray(product_id) ? product_id : [product_id];
      history = history.filter(h => productIds.includes(h.product_id));
    }
    
    if (platform) {
      history = history.filter(h => h.platform === platform);
    }
    
    if (start_date) {
      history = history.filter(h => h.date >= start_date);
    }
    
    if (end_date) {
      history = history.filter(h => h.date <= end_date);
    }
    
    if (sort_by) {
      const order = sort_order === 'desc' ? -1 : 1;
      history = _.orderBy(history, [sort_by], [order === 1 ? 'asc' : 'desc']);
    } else {
      history = _.orderBy(history, ['date'], ['asc']);
    }
    
    res.json({
      success: true,
      data: history,
      total: history.length
    });
    
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/comments', (req, res) => {
  try {
    let comments = loadData(DATA_FILES.comments);
    
    const { 
      product_id, 
      min_score,
      max_score,
      sort_by,
      sort_order,
      limit,
      offset
    } = req.query;
    
    if (product_id) {
      const productIds = Array.isArray(product_id) ? product_id : [product_id];
      comments = comments.filter(c => productIds.includes(c.product_id));
    }
    
    if (min_score !== undefined) {
      const minScore = parseInt(min_score);
      if (!isNaN(minScore)) {
        comments = comments.filter(c => c.score >= minScore);
      }
    }
    
    if (max_score !== undefined) {
      const maxScore = parseInt(max_score);
      if (!isNaN(maxScore)) {
        comments = comments.filter(c => c.score <= maxScore);
      }
    }
    
    if (sort_by) {
      const order = sort_order === 'desc' ? -1 : 1;
      comments = _.orderBy(comments, [sort_by], [order === 1 ? 'asc' : 'desc']);
    } else {
      comments = _.orderBy(comments, ['time'], ['desc']);
    }
    
    let paginatedComments = comments;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset) || 0;
    
    if (!isNaN(limitNum) && limitNum > 0) {
      paginatedComments = comments.slice(offsetNum, offsetNum + limitNum);
    }
    
    res.json({
      success: true,
      data: paginatedComments,
      total: comments.length,
      filtered: paginatedComments.length,
      offset: offsetNum,
      limit: limitNum || null
    });
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const products = loadData(DATA_FILES.products);
    const history = loadData(DATA_FILES.priceHistory);
    const comments = loadData(DATA_FILES.comments);
    
    const platforms = _.countBy(products, 'platform');
    const brands = _.countBy(products, 'brand');
    const axisTypes = _.countBy(products, 'axis_type');
    const keyCounts = _.countBy(products, 'key_count');
    
    const prices = products.map(p => p.price).filter(p => !isNaN(p));
    const avgPrice = prices.length > 0 ? (_.sum(prices) / prices.length).toFixed(2) : 0;
    const minPrice = prices.length > 0 ? _.min(prices) : 0;
    const maxPrice = prices.length > 0 ? _.max(prices) : 0;
    
    const avgScores = comments.length > 0 
      ? (_.sum(comments.map(c => c.score)) / comments.length).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      data: {
        totals: {
          products: products.length,
          priceHistory: history.length,
          comments: comments.length
        },
        prices: {
          average: parseFloat(avgPrice),
          min: minPrice,
          max: maxPrice
        },
        platforms,
        brands,
        axisTypes,
        keyCounts,
        avgRating: parseFloat(avgScores)
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    let products = loadData(DATA_FILES.products);
    
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    products.splice(index, 1);
    const saved = saveData(DATA_FILES.products, products);
    
    res.json({
      success: saved,
      message: saved ? 'Product deleted successfully' : 'Failed to delete product'
    });
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist.`
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`E-Commerce Tracker API Server`);
  console.log(`========================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /api/health          - Health check`);
  console.log(`  POST /api/products        - Upload products`);
  console.log(`  GET  /api/products        - List products`);
  console.log(`  GET  /api/products/:id    - Get product by ID`);
  console.log(`  DELETE /api/products/:id  - Delete product`);
  console.log(`  POST /api/price-history   - Upload price history`);
  console.log(`  GET  /api/price-history   - List price history`);
  console.log(`  POST /api/comments        - Upload comments`);
  console.log(`  GET  /api/comments        - List comments`);
  console.log(`  GET  /api/stats           - Get statistics`);
  console.log(`\n========================================\n`);
});

module.exports = app;

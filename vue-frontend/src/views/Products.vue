<template>
  <div class="products-page">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><Goods /></el-icon>
        商品列表
      </h1>
      <div class="page-actions">
        <el-button type="primary" @click="fetchProducts" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">平台:</span>
          <el-select
            v-model="filters.platform"
            placeholder="全部平台"
            clearable
            style="width: 150px"
            @change="applyFilters"
          >
            <el-option
              v-for="platform in availablePlatforms"
              :key="platform"
              :label="platform"
              :value="platform"
            />
          </el-select>
        </div>
        
        <div class="filter-item">
          <span class="filter-label">品牌:</span>
          <el-select
            v-model="selectedBrands"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择品牌"
            clearable
            style="width: 250px"
            @change="onBrandsChange"
          >
            <el-option
              v-for="brand in availableBrands"
              :key="brand"
              :label="brand"
              :value="brand"
            />
          </el-select>
        </div>
        
        <div class="filter-item">
          <span class="filter-label">轴体:</span>
          <el-select
            v-model="selectedAxisTypes"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择轴体"
            clearable
            style="width: 250px"
            @change="onAxisTypesChange"
          >
            <el-option
              v-for="axis in availableAxisTypes"
              :key="axis"
              :label="axis"
              :value="axis"
            />
          </el-select>
        </div>
      </div>
      
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">键数:</span>
          <el-select
            v-model="selectedKeyCounts"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择键数"
            clearable
            style="width: 200px"
            @change="onKeyCountsChange"
          >
            <el-option
              v-for="count in availableKeyCounts"
              :key="count"
              :label="`${count}键`"
              :value="count"
            />
          </el-select>
        </div>
        
        <div class="filter-item">
          <span class="filter-label">价格区间:</span>
          <el-slider
            v-model="priceRange"
            :min="priceRangeConfig.min"
            :max="priceRangeConfig.max"
            range
            show-input
            :disabled="priceRangeConfig.min === priceRangeConfig.max"
            style="width: 250px"
            @change="onPriceRangeChange"
          />
        </div>
        
        <div class="filter-item">
          <span class="filter-label">搜索:</span>
          <el-input
            v-model="filters.search"
            placeholder="搜索商品名称/品牌/店铺"
            clearable
            style="width: 200px"
            @clear="applyFilters"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
      
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">排序:</span>
          <el-select
            v-model="sortOption"
            placeholder="排序方式"
            style="width: 180px"
            @change="onSortChange"
          >
            <el-option label="价格从低到高" value="price_asc" />
            <el-option label="价格从高到低" value="price_desc" />
            <el-option label="销量最高" value="sales_desc" />
            <el-option label="评分最高" value="rating_desc" />
          </el-select>
        </div>
        
        <div class="filter-actions">
          <el-button @click="clearAllFilters">
            <el-icon><Delete /></el-icon>
            清除筛选
          </el-button>
          <el-button type="primary" @click="applyFilters">
            <el-icon><Search /></el-icon>
            应用筛选
          </el-button>
        </div>
      </div>
    </div>
    
    <div class="results-info">
      <span>共找到 <strong>{{ total }}</strong> 个商品，当前显示 <strong>{{ products.length }}</strong> 个</span>
      <div class="view-toggle">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button value="list">
            <el-icon><List /></el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" size="32"><Loading /></el-icon>
      <span style="margin-left: 12px; color: #64748b;">加载中...</span>
    </div>
    
    <div v-else-if="products.length === 0" class="empty-container">
      <el-icon><Empty /></el-icon>
      <span>暂无商品数据</span>
      <el-button type="primary" @click="fetchProducts" style="margin-top: 16px;">
        刷新数据
      </el-button>
    </div>
    
    <div v-else>
      <div v-if="viewMode === 'grid'" class="products-grid">
        <div
          v-for="product in products"
          :key="product.id"
          class="product-card"
          @click="viewProductDetail(product)"
        >
          <el-image
            class="product-image"
            :src="product.image_url"
            :preview-src-list="[product.image_url]"
            fit="cover"
            :lazy="true"
          >
            <template #placeholder>
              <div class="image-placeholder">
                <el-icon size="48"><Picture /></el-icon>
              </div>
            </template>
          </el-image>
          
          <div class="product-name" :title="product.name">
            {{ product.name }}
          </div>
          
          <div class="product-price">
            <span class="current-price">¥{{ product.price }}</span>
            <span v-if="product.original_price > product.price" class="original-price">
              ¥{{ product.original_price }}
            </span>
          </div>
          
          <div class="product-info">
            <span class="info-tag platform-tag">{{ product.platform }}</span>
            <span class="info-tag brand-tag">{{ product.brand }}</span>
            <span v-if="product.axis_type" class="info-tag">{{ product.axis_type }}</span>
            <span v-if="product.key_count" class="info-tag">{{ product.key_count }}键</span>
          </div>
          
          <div class="product-footer">
            <span class="shop-name">
              <el-icon><Shop /></el-icon>
              {{ product.shop }}
            </span>
            <el-button type="primary" link size="small" @click.stop="openProductUrl(product)">
              查看详情
            </el-button>
          </div>
        </div>
      </div>
      
      <el-table v-else :data="products" style="width: 100%" stripe>
        <el-table-column prop="name" label="商品名称" min-width="300">
          <template #default="{ row }">
            <div class="table-product-info">
              <el-image
                class="table-product-image"
                :src="row.image_url"
                :preview-src-list="[row.image_url]"
                fit="cover"
              />
              <div class="table-product-name">
                <div class="name" :title="row.name">{{ row.name }}</div>
                <div class="tags">
                  <el-tag size="small" type="primary">{{ row.platform }}</el-tag>
                  <el-tag size="small">{{ row.brand }}</el-tag>
                  <el-tag v-if="row.axis_type" size="small" type="success">{{ row.axis_type }}</el-tag>
                  <el-tag v-if="row.key_count" size="small" type="warning">{{ row.key_count }}键</el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="price" label="价格" width="150" align="center">
          <template #default="{ row }">
            <div class="price-column">
              <span class="current-price">¥{{ row.price }}</span>
              <span v-if="row.original_price > row.price" class="original-price">
                ¥{{ row.original_price }}
              </span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="shop" label="店铺" width="180">
          <template #default="{ row }">
            <span>
              <el-icon><Shop /></el-icon>
              {{ row.shop }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="axis_type" label="轴体" width="100" align="center" />
        <el-table-column prop="key_count" label="键数" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.key_count">{{ row.key_count }}键</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="fetch_time" label="抓取时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatTime(row.fetch_time) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewProductDetail(row)">
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="openProductUrl(row)">
              访问
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 40, 60, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onPageSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </div>
    
    <el-dialog
      v-model="detailDialogVisible"
      title="商品详情"
      width="800px"
      :before-close="closeDetailDialog"
    >
      <div v-if="currentProduct" class="product-detail">
        <el-row :gutter="24">
          <el-col :span="10">
            <el-image
              class="detail-image"
              :src="currentProduct.image_url"
              :preview-src-list="[currentProduct.image_url]"
              fit="cover"
            />
          </el-col>
          <el-col :span="14">
            <h2 class="detail-name">{{ currentProduct.name }}</h2>
            <div class="detail-price">
              <span class="current-price">¥{{ currentProduct.price }}</span>
              <span v-if="currentProduct.original_price > currentProduct.price" class="original-price">
                ¥{{ currentProduct.original_price }}
              </span>
              <el-tag v-if="currentProduct.original_price > currentProduct.price" type="danger">
                降价
              </el-tag>
            </div>
            
            <el-descriptions :column="2" border>
              <el-descriptions-item label="平台">{{ currentProduct.platform }}</el-descriptions-item>
              <el-descriptions-item label="店铺">{{ currentProduct.shop }}</el-descriptions-item>
              <el-descriptions-item label="品牌">{{ currentProduct.brand }}</el-descriptions-item>
              <el-descriptions-item label="型号">{{ currentProduct.model || '-' }}</el-descriptions-item>
              <el-descriptions-item label="轴体">{{ currentProduct.axis_type || '-' }}</el-descriptions-item>
              <el-descriptions-item label="键数">{{ currentProduct.key_count ? `${currentProduct.key_count}键` : '-' }}</el-descriptions-item>
              <el-descriptions-item label="销量">{{ currentProduct.sales_count || '-' }}</el-descriptions-item>
              <el-descriptions-item label="评分">{{ currentProduct.rating || '-' }}</el-descriptions-item>
            </el-descriptions>
            
            <div class="detail-description" v-if="currentProduct.description">
              <h4>商品描述</h4>
              <p>{{ currentProduct.description }}</p>
            </div>
          </el-col>
        </el-row>
        
        <div class="detail-chart" style="margin-top: 24px;">
          <h4>价格走势图</h4>
          <div class="chart-container" style="height: 300px;">
            <v-chart class="chart" :option="productPriceChartOption" autoresize />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="closeDetailDialog">关闭</el-button>
        <el-button type="primary" @click="openProductUrl(currentProduct)">
          访问商品页面
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useProductsStore } from '@/stores/products';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import VChart from 'vue-echarts';
import _ from 'lodash-es';
import type { Product } from '@/types';

const productsStore = useProductsStore();
const {
  products,
  loading,
  total,
  filters,
  pagination,
  availablePlatforms,
  availableBrands,
  availableAxisTypes,
  availableKeyCounts,
  priceRange,
  priceHistory,
  currentProduct
} = storeToRefs(productsStore);

const viewMode = ref<'grid' | 'list'>('grid');
const currentPage = ref(1);
const pageSize = ref(20);
const sortOption = ref('price_asc');

const selectedBrands = ref<string[]>([]);
const selectedAxisTypes = ref<string[]>([]);
const selectedKeyCounts = ref<number[]>([]);

const detailDialogVisible = ref(false);

const priceRangeConfig = computed(() => ({
  min: Math.floor(priceRange.value.min / 100) * 100,
  max: Math.ceil(priceRange.value.max / 100) * 100
}));

const localPriceRange = ref<[number, number]>([
  priceRangeConfig.value.min,
  priceRangeConfig.value.max
]);

function formatTime(time: string) {
  if (!time) return '-';
  return dayjs(time).format('YYYY-MM-DD HH:mm');
}

function onBrandsChange(newValue: string[]) {
  if (newValue.length > 0) {
    productsStore.updateFilters({ brand: newValue });
  } else {
    const { brand, ...rest } = filters.value;
    productsStore.updateFilters(rest);
  }
}

function onAxisTypesChange(newValue: string[]) {
  if (newValue.length > 0) {
    productsStore.updateFilters({ axis_type: newValue });
  } else {
    const { axis_type, ...rest } = filters.value;
    productsStore.updateFilters(rest);
  }
}

function onKeyCountsChange(newValue: number[]) {
  if (newValue.length > 0) {
    productsStore.updateFilters({ key_count: newValue });
  } else {
    const { key_count, ...rest } = filters.value;
    productsStore.updateFilters(rest);
  }
}

function onPriceRangeChange(newValue: [number, number]) {
  productsStore.updateFilters({
    min_price: newValue[0],
    max_price: newValue[1]
  });
}

function onSortChange(newValue: string) {
  const [field, order] = newValue.split('_');
  productsStore.updatePagination({
    sort_by: field === 'sales' ? 'sales_count' : field === 'rating' ? 'rating' : field,
    sort_order: order as 'asc' | 'desc'
  });
}

function onPageSizeChange(newSize: number) {
  pageSize.value = newSize;
  productsStore.updatePagination({ limit: newSize, offset: 0 });
  currentPage.value = 1;
  fetchProducts();
}

function onPageChange(newPage: number) {
  currentPage.value = newPage;
  productsStore.updatePagination({ offset: (newPage - 1) * pageSize.value });
  fetchProducts();
}

async function applyFilters() {
  currentPage.value = 1;
  productsStore.updatePagination({ offset: 0 });
  await fetchProducts();
}

function clearAllFilters() {
  productsStore.clearFilters();
  selectedBrands.value = [];
  selectedAxisTypes.value = [];
  selectedKeyCounts.value = [];
  localPriceRange.value = [priceRangeConfig.value.min, priceRangeConfig.value.max];
  sortOption.value = 'price_asc';
  currentPage.value = 1;
  fetchProducts();
}

async function fetchProducts() {
  await productsStore.fetchProducts();
}

async function viewProductDetail(product: Product) {
  detailDialogVisible.value = true;
  await productsStore.setCurrentProduct(product);
}

function closeDetailDialog() {
  detailDialogVisible.value = false;
  productsStore.setCurrentProduct(null);
}

function openProductUrl(product: Product | null) {
  if (product && product.product_url) {
    window.open(product.product_url, '_blank');
  }
}

const productPriceChartOption = computed(() => {
  if (!currentProduct.value || !priceHistory.value.length) {
    return {};
  }
  
  const productHistory = priceHistory.value.filter(
    h => h.product_id === currentProduct.value!.id
  );
  
  const sortedHistory = _.sortBy(productHistory, 'date');
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const param = params[0];
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">${param.axisValue}</div>
          <div>价格: <strong style="color: #ef4444;">¥${param.value[1]}</strong></div>
        `;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedHistory.map(h => h.date),
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '价格',
        type: 'line',
        smooth: true,
        data: sortedHistory.map(h => [h.date, h.price]),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        },
        lineStyle: {
          color: '#3b82f6',
          width: 2
        },
        itemStyle: {
          color: '#3b82f6'
        }
      }
    ]
  };
});

watch([filters, pagination], () => {
  fetchProducts();
}, { deep: true });

onMounted(() => {
  fetchProducts();
});
</script>

<style lang="scss" scoped>
.products-page {
  width: 100%;
}

.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  color: #64748b;
  
  strong {
    color: #1e293b;
  }
  
  .view-toggle {
    display: flex;
    align-items: center;
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8fafc;
  color: #cbd5e1;
}

.table-product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-product-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  flex-shrink: 0;
}

.table-product-name {
  .name {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .tags {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
}

.price-column {
  .current-price {
    font-size: 18px;
    font-weight: 700;
    color: #ef4444;
  }
  
  .original-price {
    font-size: 12px;
    color: #94a3b8;
    text-decoration: line-through;
    margin-left: 4px;
  }
}

.product-detail {
  .detail-image {
    width: 100%;
    height: 300px;
    border-radius: 8px;
  }
  
  .detail-name {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 16px;
    line-height: 1.4;
  }
  
  .detail-price {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
    padding: 16px;
    background: #fef2f2;
    border-radius: 8px;
    
    .current-price {
      font-size: 28px;
      font-weight: 700;
      color: #ef4444;
    }
    
    .original-price {
      font-size: 16px;
      color: #94a3b8;
      text-decoration: line-through;
    }
  }
  
  .detail-description {
    margin-top: 20px;
    
    h4 {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    p {
      color: #64748b;
      line-height: 1.6;
    }
  }
  
  .detail-chart {
    h4 {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }
  }
}

.chart {
  width: 100%;
  height: 100%;
}
</style>

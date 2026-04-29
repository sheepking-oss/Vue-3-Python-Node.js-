<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><DataLine /></el-icon>
        电商竞品数据追踪大屏
      </h1>
      <div class="page-actions">
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>
    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <el-icon class="stat-icon"><Goods /></el-icon>
          <div class="stat-value">{{ statistics?.totals?.products || 0 }}</div>
          <div class="stat-label">商品总数</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card blue">
          <el-icon class="stat-icon"><TrendCharts /></el-icon>
          <div class="stat-value">{{ statistics?.totals?.priceHistory || 0 }}</div>
          <div class="stat-label">价格历史</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card green">
          <el-icon class="stat-icon"><ChatDotRound /></el-icon>
          <div class="stat-value">{{ statistics?.totals?.comments || 0 }}</div>
          <div class="stat-label">评论总数</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card orange">
          <el-icon class="stat-icon"><Coin /></el-icon>
          <div class="stat-value">¥{{ statistics?.prices?.average || 0 }}</div>
          <div class="stat-label">平均价格</div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20">
      <el-col :span="16">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><TrendCharts /></el-icon>
              价格走势图
            </h3>
            <div class="card-actions">
              <el-select v-model="selectedProductIds" multiple placeholder="选择商品" style="width: 300px">
                <el-option
                  v-for="product in products"
                  :key="product.id"
                  :label="product.name"
                  :value="product.id"
                />
              </el-select>
            </div>
          </div>
          <div class="card-content">
            <div v-if="loading" class="loading-container">
              <el-icon class="is-loading" size="32"><Loading /></el-icon>
            </div>
            <div v-else class="chart-container">
              <v-chart class="chart" :option="priceChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="8">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              平台分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 250px;">
              <v-chart class="chart" :option="platformChartOption" autoresize />
            </div>
          </div>
        </div>
        
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><DataLine /></el-icon>
              品牌分布 TOP 10
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 250px;">
              <v-chart class="chart" :option="brandChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Rank /></el-icon>
              轴体类型分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 300px;">
              <v-chart class="chart" :option="axisChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Coin /></el-icon>
              价格区间分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 300px;">
              <v-chart class="chart" :option="priceRangeChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useProductsStore } from '@/stores/products';
import { storeToRefs } from 'pinia';
import * as echarts from 'echarts';
import VChart from 'vue-echarts';
import _ from 'lodash-es';

const productsStore = useProductsStore();
const { products, priceHistory, statistics, loading } = storeToRefs(productsStore);

const selectedProductIds = ref<string[]>([]);

watch(selectedProductIds, (newIds) => {
  if (newIds.length > 0) {
    productsStore.fetchPriceHistory(newIds);
  } else {
    productsStore.fetchPriceHistory();
  }
});

const priceChartOption = computed(() => {
  const series: any[] = [];
  const productMap = new Map(products.value.map(p => [p.id, p]));
  
  const groupedHistory = _.groupBy(priceHistory.value, 'product_id');
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  
  let colorIndex = 0;
  for (const [productId, history] of Object.entries(groupedHistory)) {
    const product = productMap.get(productId);
    const sortedHistory = _.sortBy(history, 'date');
    
    series.push({
      name: product?.name || productId,
      type: 'line',
      smooth: true,
      data: sortedHistory.map(h => [h.date, h.price]),
      lineStyle: {
        width: 2,
        color: colors[colorIndex % colors.length]
      },
      itemStyle: {
        color: colors[colorIndex % colors.length]
      },
      symbol: 'circle',
      symbolSize: 6
    });
    
    colorIndex++;
  }
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b'
      },
      formatter: function(params: any) {
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
        params.forEach((param: any) => {
          result += `<div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span style="display: flex; align-items: center;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
              ${param.seriesName}
            </span>
            <span style="font-weight: 600; color: #ef4444;">¥${param.value[1]}</span>
          </div>`;
        });
        return result;
      }
    },
    legend: {
      data: series.map(s => s.name),
      type: 'scroll',
      bottom: 0,
      textStyle: {
        color: '#64748b'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '80px',
      top: '40px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: _.uniq(priceHistory.value.map(h => h.date)).sort(),
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '价格 (¥)',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b',
        formatter: '¥{value}'
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    series
  };
});

const platformChartOption = computed(() => {
  const platforms = statistics.value?.platforms || {};
  const data = Object.entries(platforms).map(([name, value]) => ({
    name,
    value
  }));
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: {
        color: '#1e293b'
      }
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#64748b'
      }
    },
    series: [
      {
        name: '平台分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data,
        color: ['#3b82f6', '#10b981', '#f59e0b']
      }
    ]
  };
});

const brandChartOption = computed(() => {
  const brands = statistics.value?.brands || {};
  const brandEntries = Object.entries(brands)
    .filter(([name]) => name !== '未知品牌')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const names = brandEntries.map(([name]) => name);
  const values = brandEntries.map(([, value]) => value);
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: {
        color: '#1e293b'
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
      data: names,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b',
        rotate: 30
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
        color: '#64748b'
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '商品数量',
        type: 'bar',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };
});

const axisChartOption = computed(() => {
  const axisTypes = statistics.value?.axisTypes || {};
  const axisEntries = Object.entries(axisTypes)
    .filter(([name]) => name !== '未知轴体')
    .sort((a, b) => b[1] - a[1]);
  
  const names = axisEntries.map(([name]) => name);
  const values = axisEntries.map(([, value]) => value);
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
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
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b'
      }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b'
      }
    },
    series: [
      {
        name: '商品数量',
        type: 'bar',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ]),
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  };
});

const priceRangeChartOption = computed(() => {
  const prices = products.value.map(p => p.price).filter(p => !isNaN(p));
  
  const ranges = [
    { name: '0-200元', min: 0, max: 200, count: 0 },
    { name: '200-500元', min: 200, max: 500, count: 0 },
    { name: '500-1000元', min: 500, max: 1000, count: 0 },
    { name: '1000-2000元', min: 1000, max: 2000, count: 0 },
    { name: '2000元以上', min: 2000, max: Infinity, count: 0 }
  ];
  
  prices.forEach(price => {
    const range = ranges.find(r => price >= r.min && price < r.max);
    if (range) {
      range.count++;
    }
  });
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
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
      data: ranges.map(r => r.name),
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b'
      }
    },
    yAxis: {
      type: 'value',
      name: '商品数量',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b'
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '商品数量',
        type: 'bar',
        data: ranges.map(r => r.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#fa709a' },
            { offset: 1, color: '#fee140' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#1e293b',
          formatter: '{c}个'
        }
      }
    ]
  };
});

async function refreshData() {
  await Promise.all([
    productsStore.fetchProducts(),
    productsStore.fetchPriceHistory(),
    productsStore.fetchStatistics()
  ]);
}

onMounted(() => {
  productsStore.fetchPriceHistory();
});
</script>

<style lang="scss" scoped>
.dashboard-page {
  width: 100%;
}

.stats-row {
  margin-bottom: 20px;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>

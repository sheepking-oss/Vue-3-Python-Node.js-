<template>
  <div class="analysis-page">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><TrendCharts /></el-icon>
        数据分析
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
          <div class="stat-label">价格历史记录</div>
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
          <el-icon class="stat-icon"><Star /></el-icon>
          <div class="stat-value">{{ statistics?.avgRating || 0 }}</div>
          <div class="stat-label">平均评分</div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><TrendCharts /></el-icon>
              各平台价格对比
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="platformPriceChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><DataLine /></el-icon>
              品牌价格分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="brandPriceChartOption" autoresize />
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
              轴体类型价格分析
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="axisTypePriceChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Grid /></el-icon>
              键数与价格关系
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="keyCountPriceChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              平台占比
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 300px;">
              <v-chart class="chart" :option="platformPieChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="8">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              轴体类型分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 300px;">
              <v-chart class="chart" :option="axisTypePieChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="8">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              键数分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 300px;">
              <v-chart class="chart" :option="keyCountPieChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useProductsStore } from '@/stores/products';
import { storeToRefs } from 'pinia';
import VChart from 'vue-echarts';
import * as echarts from 'echarts';
import _ from 'lodash-es';

const productsStore = useProductsStore();
const { products, statistics, loading } = storeToRefs(productsStore);

const platformPriceChartOption = computed(() => {
  const platforms = _.groupBy(products.value, 'platform');
  const platformNames = Object.keys(platforms);
  
  const series: any[] = [];
  
  const boxplotData = platformNames.map(platform => {
    const prices = platforms[platform]
      .map(p => p.price)
      .filter(p => !isNaN(p))
      .sort((a, b) => a - b);
    
    if (prices.length === 0) return [0, 0, 0, 0, 0];
    
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q2 = prices[Math.floor(prices.length * 0.5)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    
    return [min, q1, q2, q3, max];
  });
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        const data = params.data;
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
          <div>最低: ¥${data[0]}</div>
          <div>下四分位: ¥${data[1]}</div>
          <div>中位数: ¥${data[2]}</div>
          <div>上四分位: ¥${data[3]}</div>
          <div>最高: ¥${data[4]}</div>
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
      data: platformNames,
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
    series: [
      {
        name: '价格分布',
        type: 'boxplot',
        data: boxplotData,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ]
          },
          borderColor: '#5b21b6'
        }
      }
    ]
  };
});

const brandPriceChartOption = computed(() => {
  const brands = _.groupBy(products.value, 'brand');
  const brandEntries = Object.entries(brands)
    .filter(([name]) => name !== '未知品牌')
    .map(([name, items]) => {
      const prices = items.map(p => p.price).filter(p => !isNaN(p));
      const avgPrice = prices.length > 0 ? _.sum(prices) / prices.length : 0;
      const minPrice = prices.length > 0 ? _.min(prices) || 0 : 0;
      const maxPrice = prices.length > 0 ? _.max(prices) || 0 : 0;
      return { name, avgPrice, minPrice, maxPrice, count: items.length };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const param = params[0];
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${param.name}</div>
          <div>平均价格: <strong>¥${param.value.toFixed(2)}</strong></div>
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
      type: 'value',
      name: '平均价格 (¥)',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      },
      axisLabel: {
        color: '#64748b',
        formatter: '¥{value}'
      }
    },
    yAxis: {
      type: 'category',
      data: brandEntries.map(b => b.name),
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
        name: '平均价格',
        type: 'bar',
        data: brandEntries.map(b => b.avgPrice),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '¥{c}',
          color: '#1e293b'
        }
      }
    ]
  };
});

const axisTypePriceChartOption = computed(() => {
  const axisTypes = _.groupBy(products.value, 'axis_type');
  const axisEntries = Object.entries(axisTypes)
    .filter(([name]) => name !== '未知轴体')
    .map(([name, items]) => {
      const prices = items.map(p => p.price).filter(p => !isNaN(p));
      const avgPrice = prices.length > 0 ? _.sum(prices) / prices.length : 0;
      const minPrice = prices.length > 0 ? _.min(prices) || 0 : 0;
      const maxPrice = prices.length > 0 ? _.max(prices) || 0 : 0;
      return { name, avgPrice, minPrice, maxPrice, count: items.length };
    })
    .sort((a, b) => b.count - a.count);
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const avg = params.find((p: any) => p.seriesName === '平均价格');
        const min = params.find((p: any) => p.seriesName === '最低价格');
        const max = params.find((p: any) => p.seriesName === '最高价格');
        
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${avg.name}</div>
          <div>平均: ¥${avg.value.toFixed(2)}</div>
          <div>最低: ¥${min.value.toFixed(2)}</div>
          <div>最高: ¥${max.value.toFixed(2)}</div>
        `;
      }
    },
    legend: {
      data: ['平均价格', '最低价格', '最高价格'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: axisEntries.map(a => a.name),
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
    series: [
      {
        name: '平均价格',
        type: 'bar',
        data: axisEntries.map(a => a.avgPrice),
        itemStyle: {
          color: '#3b82f6',
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '最低价格',
        type: 'line',
        data: axisEntries.map(a => a.minPrice),
        smooth: true,
        itemStyle: {
          color: '#10b981'
        },
        symbol: 'circle',
        symbolSize: 8
      },
      {
        name: '最高价格',
        type: 'line',
        data: axisEntries.map(a => a.maxPrice),
        smooth: true,
        itemStyle: {
          color: '#ef4444'
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  };
});

const keyCountPriceChartOption = computed(() => {
  const keyCounts = _.groupBy(products.value.filter(p => p.key_count), 'key_count');
  const keyEntries = Object.entries(keyCounts)
    .map(([name, items]) => {
      const keyCount = parseInt(name);
      const prices = items.map(p => p.price).filter(p => !isNaN(p));
      const avgPrice = prices.length > 0 ? _.sum(prices) / prices.length : 0;
      return { keyCount, avgPrice, count: items.length };
    })
    .sort((a, b) => a.keyCount - b.keyCount);
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const param = params[0];
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${param.name}键</div>
          <div>平均价格: <strong>¥${param.value.toFixed(2)}</strong></div>
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
      data: keyEntries.map(k => `${k.keyCount}键`),
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
      name: '平均价格 (¥)',
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
    series: [
      {
        name: '平均价格',
        type: 'line',
        smooth: true,
        data: keyEntries.map(k => k.avgPrice),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(250, 112, 154, 0.3)' },
              { offset: 1, color: 'rgba(254, 225, 64, 0.05)' }
            ]
          }
        },
        lineStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#fa709a' },
              { offset: 1, color: '#fee140' }
            ]
          },
          width: 3
        },
        itemStyle: {
          color: '#fa709a'
        },
        symbol: 'circle',
        symbolSize: 10
      }
    ]
  };
});

const platformPieChartOption = computed(() => {
  const platforms = statistics.value?.platforms || {};
  const data = Object.entries(platforms).map(([name, value]) => ({
    name,
    value
  }));
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
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
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data,
        color: ['#3b82f6', '#10b981', '#f59e0b']
      }
    ]
  };
});

const axisTypePieChartOption = computed(() => {
  const axisTypes = statistics.value?.axisTypes || {};
  const data = Object.entries(axisTypes)
    .filter(([name]) => name !== '未知轴体')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      type: 'scroll'
    },
    series: [
      {
        name: '轴体分布',
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
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  };
});

const keyCountPieChartOption = computed(() => {
  const keyCounts = statistics.value?.keyCounts || {};
  const data = Object.entries(keyCounts)
    .filter(([name]) => name !== 'null')
    .map(([name, value]) => ({ name: `${name}键`, value }))
    .sort((a, b) => b.value - a.value);
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
    },
    series: [
      {
        name: '键数分布',
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
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  };
});

async function refreshData() {
  await Promise.all([
    productsStore.fetchProducts(),
    productsStore.fetchStatistics()
  ]);
}

onMounted(() => {
  refreshData();
});
</script>

<style lang="scss" scoped>
.analysis-page {
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

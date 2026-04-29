<template>
  <div class="comments-page">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><ChatDotRound /></el-icon>
        评论分析
      </h1>
      <div class="page-actions">
        <el-button type="primary" @click="fetchComments" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <el-icon class="stat-icon"><ChatDotRound /></el-icon>
          <div class="stat-value">{{ totalComments }}</div>
          <div class="stat-label">评论总数</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card blue">
          <el-icon class="stat-icon"><Star /></el-icon>
          <div class="stat-value">{{ avgRating }}</div>
          <div class="stat-label">平均评分</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card green">
          <el-icon class="stat-icon"><Sunny /></el-icon>
          <div class="stat-value">{{ positiveCount }}</div>
          <div class="stat-label">好评数</div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card orange">
          <el-icon class="stat-icon"><Cloudy /></el-icon>
          <div class="stat-value">{{ negativeCount }}</div>
          <div class="stat-label">差评数</div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              评分分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="ratingChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="12">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><TrendCharts /></el-icon>
              评论时间分布
            </h3>
          </div>
          <div class="card-content">
            <div class="chart-container" style="min-height: 350px;">
              <v-chart class="chart" :option="timeChartOption" autoresize />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <div class="card-container">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Document /></el-icon>
              评论列表
            </h3>
            <div class="filter-item" style="display: flex; gap: 12px;">
              <el-select
                v-model="filterScore"
                placeholder="全部评分"
                clearable
                style="width: 120px"
              >
                <el-option label="5星" :value="5" />
                <el-option label="4星" :value="4" />
                <el-option label="3星" :value="3" />
                <el-option label="2星" :value="2" />
                <el-option label="1星" :value="1" />
              </el-select>
              <el-button type="primary" @click="fetchComments">
                筛选
              </el-button>
            </div>
          </div>
          <div class="card-content">
            <el-table
              :data="comments"
              style="width: 100%"
              v-loading="loading"
              stripe
            >
              <el-table-column prop="content" label="评论内容" min-width="300">
                <template #default="{ row }">
                  <div class="comment-content">
                    <div class="text">{{ row.content }}</div>
                    <div class="images" v-if="row.images && row.images.length > 0">
                      <el-image
                        v-for="(img, index) in row.images.slice(0, 5)"
                        :key="index"
                        :src="img"
                        :preview-src-list="row.images"
                        fit="cover"
                        class="comment-image"
                      />
                    </div>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="score" label="评分" width="120" align="center">
                <template #default="{ row }">
                  <div class="rating">
                    <el-rate
                      v-model="row.score"
                      disabled
                      show-text
                      :text-color="'#64748b'"
                    />
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="user_name" label="用户" width="150">
                <template #default="{ row }">
                  <div class="user-info">
                    <el-avatar :size="32" class="user-avatar">
                      {{ row.user_name ? row.user_name.charAt(0) : 'U' }}
                    </el-avatar>
                    <div class="user-details">
                      <span class="user-name">{{ row.user_name || '匿名用户' }}</span>
                      <span class="user-level">{{ row.user_level }}</span>
                    </div>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="useful_count" label="有用数" width="100" align="center">
                <template #default="{ row }">
                  <span v-if="row.useful_count > 0" class="useful-count">
                    <el-icon><ThumbUp /></el-icon>
                    {{ row.useful_count }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              
              <el-table-column prop="time" label="评论时间" width="180" align="center">
                <template #default="{ row }">
                  {{ formatTime(row.time) }}
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[20, 40, 60, 100]"
                :total="totalComments"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="onPageSizeChange"
                @current-change="onPageChange"
              />
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
import dayjs from 'dayjs';
import _ from 'lodash-es';

const productsStore = useProductsStore();
const { comments, loading } = storeToRefs(productsStore);

const currentPage = ref(1);
const pageSize = ref(20);
const filterScore = ref<number | undefined>(undefined);

const totalComments = computed(() => comments.value.length);

const avgRating = computed(() => {
  if (comments.value.length === 0) return 0;
  const total = _.sum(comments.value.map(c => c.score));
  return (total / comments.value.length).toFixed(1);
});

const positiveCount = computed(() => {
  return comments.value.filter(c => c.score >= 4).length;
});

const negativeCount = computed(() => {
  return comments.value.filter(c => c.score <= 2).length;
});

const ratingChartOption = computed(() => {
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  comments.value.forEach(comment => {
    const score = comment.score || 0;
    if (ratingCounts[score] !== undefined) {
      ratingCounts[score]++;
    }
  });
  
  const data = Object.entries(ratingCounts).map(([score, count]) => ({
    name: `${score}星`,
    value: count
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
        name: '评分分布',
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
        color: ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981']
      }
    ]
  };
});

const timeChartOption = computed(() => {
  const dateGroups: Record<string, number> = {};
  
  comments.value.forEach(comment => {
    if (comment.time) {
      const date = dayjs(comment.time).format('YYYY-MM-DD');
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    }
  });
  
  const sortedDates = Object.keys(dateGroups).sort();
  const data = sortedDates.slice(-30).map(date => ({
    date,
    count: dateGroups[date]
  }));
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const param = params[0];
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">${param.name}</div>
          <div>评论数: <strong>${param.value}</strong> 条</div>
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
      data: data.map(d => d.date),
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
      name: '评论数',
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
        name: '评论数',
        type: 'line',
        smooth: true,
        data: data.map(d => d.count),
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
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };
});

function formatTime(time: string) {
  if (!time) return '-';
  return dayjs(time).format('YYYY-MM-DD HH:mm');
}

function onPageSizeChange(newSize: number) {
  pageSize.value = newSize;
  currentPage.value = 1;
  fetchComments();
}

function onPageChange(newPage: number) {
  currentPage.value = newPage;
  fetchComments();
}

async function fetchComments() {
  const params: any = {
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value,
    sort_by: 'time',
    sort_order: 'desc'
  };
  
  if (filterScore.value !== undefined) {
    if (filterScore.value >= 4) {
      params.min_score = 4;
    } else if (filterScore.value <= 2) {
      params.max_score = 2;
    } else {
      params.min_score = 3;
      params.max_score = 3;
    }
  }
  
  await productsStore.fetchComments();
}

onMounted(() => {
  fetchComments();
});
</script>

<style lang="scss" scoped>
.comments-page {
  width: 100%;
}

.stats-row {
  margin-bottom: 20px;
}

.chart {
  width: 100%;
  height: 100%;
}

.comment-content {
  .text {
    color: #1e293b;
    line-height: 1.6;
    margin-bottom: 8px;
  }
  
  .images {
    display: flex;
    gap: 8px;
  }
  
  .comment-image {
    width: 60px;
    height: 60px;
    border-radius: 4px;
    cursor: pointer;
  }
}

.rating {
  display: flex;
  justify-content: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .user-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-weight: 600;
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
    
    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }
    
    .user-level {
      font-size: 12px;
      color: #64748b;
    }
  }
}

.useful-count {
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

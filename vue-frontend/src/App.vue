<template>
  <div class="app-container">
    <el-container>
      <el-aside width="220px" class="sidebar">
        <div class="logo">
          <el-icon size="28"><DataLine /></el-icon>
          <span class="logo-text">数据追踪系统</span>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          background-color="#1e293b"
          text-color="#94a3b8"
          active-text-color="#fff"
          router
        >
          <el-menu-item index="/">
            <el-icon><Monitor /></el-icon>
            <span>数据大屏</span>
          </el-menu-item>
          
          <el-menu-item index="/products">
            <el-icon><Goods /></el-icon>
            <span>商品列表</span>
          </el-menu-item>
          
          <el-menu-item index="/analysis">
            <el-icon><TrendCharts /></el-icon>
            <span>数据分析</span>
          </el-menu-item>
          
          <el-menu-item index="/comments">
            <el-icon><ChatDotRound /></el-icon>
            <span>评论分析</span>
          </el-menu-item>
        </el-menu>
        
        <div class="sidebar-footer">
          <div class="update-time">
            <el-icon><Clock /></el-icon>
            <span>数据更新: {{ lastUpdateTime }}</span>
          </div>
        </div>
      </el-aside>
      
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { useProductsStore } from '@/stores/products';
import { storeToRefs } from 'pinia';

const route = useRoute();
const productsStore = useProductsStore();
const { statistics } = storeToRefs(productsStore);

const activeMenu = computed(() => route.path);
const lastUpdateTime = ref<string>(dayjs().format('YYYY-MM-DD HH:mm'));

onMounted(() => {
  productsStore.fetchStatistics();
  productsStore.fetchProducts();
});
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.sidebar {
  background-color: #1e293b;
  display: flex;
  flex-direction: column;
  
  .logo {
    display: flex;
    align-items: center;
    padding: 20px;
    color: #fff;
    border-bottom: 1px solid #334155;
    
    .logo-text {
      margin-left: 12px;
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  .sidebar-menu {
    flex: 1;
    border-right: none;
    
    .el-menu-item {
      margin: 4px 8px;
      border-radius: 6px;
      transition: all 0.3s;
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      &.is-active {
        background-color: #3b82f6;
      }
    }
  }
  
  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid #334155;
    
    .update-time {
      display: flex;
      align-items: center;
      color: #64748b;
      font-size: 12px;
      
      .el-icon {
        margin-right: 6px;
      }
    }
  }
}

.main-content {
  background-color: #f1f5f9;
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '数据大屏' }
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('@/views/Products.vue'),
    meta: { title: '商品列表' }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('@/views/Analysis.vue'),
    meta: { title: '数据分析' }
  },
  {
    path: '/comments',
    name: 'Comments',
    component: () => import('@/views/Comments.vue'),
    meta: { title: '评论分析' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 电商竞品数据追踪系统` : '电商竞品数据追踪系统';
  next();
});

export default router;

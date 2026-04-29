import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { productApi, priceHistoryApi, statsApi, commentApi } from '@/api';
import type { Product, PriceHistory, Comment, Statistics, FilterOptions, PaginationParams } from '@/types';
import _ from 'lodash-es';

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([]);
  const priceHistory = ref<PriceHistory[]>([]);
  const comments = ref<Comment[]>([]);
  const statistics = ref<Statistics | null>(null);
  const currentProduct = ref<Product | null>(null);
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  
  const filters = ref<FilterOptions>({});
  const pagination = ref<PaginationParams>({
    limit: 20,
    offset: 0,
    sort_by: 'price',
    sort_order: 'asc'
  });

  const filteredProducts = computed(() => {
    let result = [...products.value];
    
    if (filters.value.platform) {
      result = result.filter(p => p.platform === filters.value.platform);
    }
    
    if (filters.value.brand) {
      const brands = Array.isArray(filters.value.brand) ? filters.value.brand : [filters.value.brand];
      result = result.filter(p => brands.includes(p.brand));
    }
    
    if (filters.value.axis_type) {
      const axisTypes = Array.isArray(filters.value.axis_type) ? filters.value.axis_type : [filters.value.axis_type];
      result = result.filter(p => axisTypes.includes(p.axis_type));
    }
    
    if (filters.value.key_count) {
      const keyCounts = Array.isArray(filters.value.key_count) ? filters.value.key_count : [filters.value.key_count];
      result = result.filter(p => keyCounts.includes(p.key_count));
    }
    
    if (filters.value.min_price !== undefined) {
      result = result.filter(p => p.price >= filters.value.min_price!);
    }
    
    if (filters.value.max_price !== undefined) {
      result = result.filter(p => p.price <= filters.value.max_price!);
    }
    
    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.model.toLowerCase().includes(searchTerm) ||
        p.shop.toLowerCase().includes(searchTerm)
      );
    }
    
    return result;
  });

  const availableBrands = computed(() => {
    return _.uniq(products.value.map(p => p.brand)).filter(b => b !== '未知品牌');
  });

  const availablePlatforms = computed(() => {
    return _.uniq(products.value.map(p => p.platform));
  });

  const availableAxisTypes = computed(() => {
    return _.uniq(products.value.map(p => p.axis_type)).filter(a => a !== '未知轴体');
  });

  const availableKeyCounts = computed(() => {
    return _.uniq(products.value.map(p => p.key_count)).filter(k => k !== null) as number[];
  });

  const priceRange = computed(() => {
    const prices = products.value.map(p => p.price).filter(p => !isNaN(p));
    return {
      min: prices.length > 0 ? _.min(prices) || 0 : 0,
      max: prices.length > 0 ? _.max(prices) || 0 : 0
    };
  });

  async function fetchProducts() {
    loading.value = true;
    error.value = null;
    
    try {
      const params = {
        ...filters.value,
        ...pagination.value
      };
      
      const response = await productApi.getProducts(params);
      
      if (response.success) {
        products.value = response.data;
        total.value = response.total || 0;
      } else {
        error.value = response.error || 'Failed to fetch products';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  async function fetchPriceHistory(productIds?: string | string[]) {
    try {
      const params: any = {
        sort_by: 'date',
        sort_order: 'asc' as const
      };
      
      if (productIds) {
        params.product_id = productIds;
      }
      
      const response = await priceHistoryApi.getPriceHistory(params);
      
      if (response.success) {
        priceHistory.value = response.data;
      }
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    }
  }

  async function fetchStatistics() {
    try {
      const response = await statsApi.getStatistics();
      
      if (response.success) {
        statistics.value = response.data;
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }

  async function fetchComments(productId?: string) {
    try {
      const params: any = {
        sort_by: 'time',
        sort_order: 'desc' as const,
        limit: 50
      };
      
      if (productId) {
        params.product_id = productId;
      }
      
      const response = await commentApi.getComments(params);
      
      if (response.success) {
        comments.value = response.data;
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }

  async function setCurrentProduct(product: Product | null) {
    currentProduct.value = product;
    
    if (product) {
      await Promise.all([
        fetchPriceHistory(product.id),
        fetchComments(product.id)
      ]);
    }
  }

  function updateFilters(newFilters: Partial<FilterOptions>) {
    filters.value = { ...filters.value, ...newFilters };
    pagination.value.offset = 0;
  }

  function updatePagination(newPagination: Partial<PaginationParams>) {
    pagination.value = { ...pagination.value, ...newPagination };
  }

  function clearFilters() {
    filters.value = {};
    pagination.value.offset = 0;
  }

  return {
    products,
    priceHistory,
    comments,
    statistics,
    currentProduct,
    loading,
    error,
    total,
    filters,
    pagination,
    filteredProducts,
    availableBrands,
    availablePlatforms,
    availableAxisTypes,
    availableKeyCounts,
    priceRange,
    fetchProducts,
    fetchPriceHistory,
    fetchStatistics,
    fetchComments,
    setCurrentProduct,
    updateFilters,
    updatePagination,
    clearFilters
  };
});

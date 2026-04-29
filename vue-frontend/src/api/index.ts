import axios from 'axios';
import type { Product, PriceHistory, Comment, FilterOptions, PaginationParams, ApiResponse, Statistics } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const productApi = {
  getProducts: async (
    filters?: FilterOptions & PaginationParams
  ): Promise<ApiResponse<Product[]>> => {
    const response = await api.get('/products', { params: filters });
    return response.data;
  },

  getProductById: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
};

export const priceHistoryApi = {
  getPriceHistory: async (
    params?: {
      product_id?: string | string[];
      platform?: string;
      start_date?: string;
      end_date?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<ApiResponse<PriceHistory[]>> => {
    const response = await api.get('/price-history', { params });
    return response.data;
  }
};

export const commentApi = {
  getComments: async (
    params?: {
      product_id?: string | string[];
      min_score?: number;
      max_score?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<Comment[]>> => {
    const response = await api.get('/comments', { params });
    return response.data;
  }
};

export const statsApi = {
  getStatistics: async (): Promise<ApiResponse<Statistics>> => {
    const response = await api.get('/stats');
    return response.data;
  }
};

export const healthApi = {
  checkHealth: async (): Promise<ApiResponse<null>> => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;

export interface Product {
  id: string;
  platform: string;
  name: string;
  price: number;
  original_price: number;
  shop: string;
  image_url: string;
  product_url: string;
  category: string;
  fetch_time: string;
  brand: string;
  model: string;
  axis_type: string;
  key_count: number | null;
  description?: string;
  sales_count?: number;
  rating?: number;
  comment_count?: number;
  updatedAt?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  date: string;
  price: number;
  original_price: number;
  platform: string;
}

export interface Comment {
  id: string;
  product_id: string;
  content: string;
  score: number;
  user_name: string;
  user_level: string;
  time: string;
  images: string[];
  useful_count: number;
  fetch_time: string;
  updatedAt?: string;
}

export interface FilterOptions {
  platform?: string;
  brand?: string | string[];
  axis_type?: string | string[];
  key_count?: number | number[];
  min_price?: number;
  max_price?: number;
  search?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  filtered?: number;
  offset?: number;
  limit?: number | null;
  message?: string;
  error?: string;
}

export interface Statistics {
  totals: {
    products: number;
    priceHistory: number;
    comments: number;
  };
  prices: {
    average: number;
    min: number;
    max: number;
  };
  platforms: Record<string, number>;
  brands: Record<string, number>;
  axisTypes: Record<string, number>;
  keyCounts: Record<string, number>;
  avgRating: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface PriceChartData {
  date: string;
  price: number;
  original_price: number;
  product_name: string;
}

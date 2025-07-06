// src/lib/supabase.ts
// ПОЛНАЯ ВЕРСИЯ с ВСЕМИ необходимыми экспортами

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// СОЗДАЕМ ЕДИНСТВЕННЫЙ ЭКЗЕМПЛЯР
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    console.log('🔗 Creating single Supabase client instance...');
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  return supabaseInstance;
};

// Экспортируем единственный экземпляр
export const supabase = getSupabase();

// API Response типы и функции
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  hasMore: boolean;
  page: number;
  pageSize: number;
  error: string | null;
}

export const createApiResponse = <T>(data: T | null, error?: any): ApiResponse<T> => {
  return {
    data,
    error: error ? (typeof error === 'string' ? error : error.message || 'Unknown error') : null
  };
};

// ДОБАВЛЯЕМ НЕДОСТАЮЩУЮ ФУНКЦИЮ
export const createPaginatedResponse = <T>(
  data: T[], 
  count: number | null = null, 
  page: number = 1, 
  pageSize: number = 10,
  error?: any
): PaginatedResponse<T> => {
  const hasMore = count ? (page * pageSize) < count : data.length === pageSize;
  
  return {
    data: data || [],
    count,
    hasMore,
    page,
    pageSize,
    error: error ? (typeof error === 'string' ? error : error.message || 'Unknown error') : null
  };
};

// Дополнительные утилиты которые могут понадобиться
export const handleSupabaseError = (error: any) => {
  if (error?.code === 'PGRST116') {
    return 'Запись не найдена';
  }
  if (error?.code === '23505') {
    return 'Запись с такими данными уже существует';
  }
  if (error?.code === '42501') {
    return 'Недостаточно прав доступа';
  }
  return error?.message || 'Неизвестная ошибка базы данных';
};

// Функция для безопасного выполнения запросов
export const safeSupabaseCall = async <T>(
  operation: () => Promise<any>,
  defaultValue: T | null = null
): Promise<ApiResponse<T>> => {
  try {
    const { data, error } = await operation();
    
    if (error) {
      console.error('Supabase error:', error);
      return createApiResponse(defaultValue, handleSupabaseError(error));
    }
    
    return createApiResponse(data);
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return createApiResponse(defaultValue, error);
  }
};

// Функция для пагинированных запросов
export const safePaginatedCall = async <T>(
  operation: () => Promise<any>,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<T>> => {
  try {
    const { data, error, count } = await operation();
    
    if (error) {
      console.error('Supabase paginated error:', error);
      return createPaginatedResponse([], null, page, pageSize, handleSupabaseError(error));
    }
    
    return createPaginatedResponse(data || [], count, page, pageSize);
  } catch (error) {
    console.error('Supabase paginated operation failed:', error);
    return createPaginatedResponse([], null, page, pageSize, error);
  }
};

// Экспорт типов базы данных (если есть)
export type { Database } from '../types/database';

console.log('✅ Supabase module loaded with single client instance');
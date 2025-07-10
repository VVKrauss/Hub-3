// src/lib/supabase.ts
// УЛУЧШЕННАЯ ВЕРСИЯ с защитой от зависания

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// СОЗДАЕМ ЕДИНСТВЕННЫЙ ЭКЗЕМПЛЯР с улучшенными настройками
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (!supabaseInstance) {
    console.log('🔗 Creating single Supabase client instance with improved settings...');
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Добавляем таймауты для auth запросов
        sessionRefreshMargin: 60, // обновляем токен за 60 секунд до истечения
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'webapp-v1.0.0',
        },
        // ВАЖНО: добавляем fetch с таймаутом
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn(`⏰ Request timeout: ${url}`);
            controller.abort();
          }, 10000); // 10 секунд максимум для любого запроса

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => {
            clearTimeout(timeoutId);
          });
        },
      },
      // Настройки для realtime (если используется)
      realtime: {
        params: {
          eventsPerSecond: 5, // ограничиваем нагрузку
        },
      },
    });

    // Логирование auth событий для отладки
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Auth event: ${event}`, session?.user?.id || 'no user');
    });
  }
  
  return supabaseInstance;
};

// Экспортируем единственный экземпляр
export const supabase = getSupabase();

// API Response типы
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

// Утилиты для безопасного выполнения запросов с таймаутами
export const safeQuery = async <T>(
  operation: () => Promise<{ data: T; error: any }>,
  timeoutMs = 8000,
  retries = 1
): Promise<{ data: T | null; error: any }> => {
  let lastError = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ Query timeout after ${timeoutMs}ms`);
        controller.abort();
      }, timeoutMs);

      const result = await operation();
      clearTimeout(timeoutId);
      
      if (result.error) {
        lastError = result.error;
        
        // Если ошибка связана с подключением, пытаемся еще раз
        if (i < retries && isRetryableError(result.error)) {
          console.warn(`Query failed (attempt ${i + 1}/${retries + 1}), retrying...`, result.error);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        
        return { data: null, error: result.error };
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (i < retries) {
        console.warn(`Query exception (attempt ${i + 1}/${retries + 1}), retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
    }
  }
  
  return { data: null, error: lastError };
};

// Проверка, стоит ли повторять запрос
const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  const retryableErrors = [
    'network error',
    'fetch failed',
    'connection timeout',
    'aborted',
    'PGRST301', // JWT expired
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return retryableErrors.some(err => 
    errorMessage.includes(err) || errorCode === err
  );
};

// Дополнительные утилиты
const handleSupabaseError = (error: any) => {
  if (error?.code === 'PGRST116') {
    return 'Запись не найдена';
  }
  if (error?.code === '23505') {
    return 'Запись с такими данными уже существует';
  }
  if (error?.code === '42501') {
    return 'Недостаточно прав доступа';
  }
  if (error?.name === 'AbortError') {
    return 'Запрос был отменен по таймауту';
  }
  return error?.message || 'Неизвестная ошибка базы данных';
};

console.log('✅ Supabase module loaded with improved client instance');
// src/lib/supabase.ts
// Централизованный Supabase клиент для новой структуры БД

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase-generated';

// Создаем единственный экземпляр клиента
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Утилиты для работы с ошибками
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'Неизвестная ошибка';
  
  // Специфичные ошибки Supabase
  if (error.code === 'PGRST116') return 'Запись не найдена';
  if (error.code === '23505') return 'Такая запись уже существует';
  if (error.code === '23503') return 'Связанная запись не найдена';
  if (error.code === 'row_level_security_violation') return 'Недостаточно прав доступа';
  
  // Общие ошибки
  if (error.message) return error.message;
  if (typeof error === 'string') return error;
  
  return 'Произошла ошибка при выполнении операции';
};

// Типы для ответов API
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Утилита для создания API ответа
export const createApiResponse = <T>(
  data: T | null, 
  error: any = null,
  count?: number
): ApiResponse<T> => ({
  data,
  error: error ? handleSupabaseError(error) : null,
  count
});

// Утилита для создания пагинированного ответа
export const createPaginatedResponse = <T>(
  data: T[] | null,
  error: any = null,
  page: number = 1,
  limit: number = 10,
  total: number = 0
): PaginatedResponse<T> => ({
  data,
  error: error ? handleSupabaseError(error) : null,
  page,
  limit,
  total,
  hasMore: (page * limit) < total,
  count: data?.length || 0
});

// Утилиты для работы с RLS
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch {
    return false;
  }
};

// Утилиты для реального времени
export const subscribeToTable = <T>(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  let subscription = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter 
      }, 
      callback
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// Утилиты для файлов
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return createApiResponse({ path: data.path, publicUrl });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const deleteFile = async (
  bucket: string,
  path: string
): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Экспорт по умолчанию
export default supabase;
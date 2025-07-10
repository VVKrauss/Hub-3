// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Создаем единственный экземпляр клиента с правильными настройками
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Включаем постоянное хранение сессии
    persistSession: true,
    
    // Автоматическое обновление токенов
    autoRefreshToken: true,
    
    // Определение сессии из URL (для callback'ов)
    detectSessionInUrl: true,
    
    // Используем PKCE flow для безопасности
    flowType: 'pkce',
    
    // Настройки localStorage
    storage: window.localStorage,
    
    // Ключ для хранения в localStorage
    storageKey: 'sb-auth-token',
    
    // Настройки для обработки session recovery
    debug: process.env.NODE_ENV === 'development'
  },
  // Настройки для realtime (если используется)
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

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

// Утилиты для работы с auth
export const getStoredSession = () => {
  try {
    const stored = localStorage.getItem('sb-auth-token');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearStoredSession = () => {
  try {
    localStorage.removeItem('sb-auth-token');
  } catch (error) {
    console.warn('Failed to clear stored session:', error);
  }
};
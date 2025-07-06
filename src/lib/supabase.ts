// src/lib/supabase.ts
// ИСПРАВЛЕННАЯ ВЕРСИЯ - единственный экземпляр Supabase

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
    console.log('🔗 Creating Supabase client instance...');
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  } else {
    console.log('🔗 Reusing existing Supabase client instance');
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

export const createApiResponse = <T>(data: T | null, error?: any): ApiResponse<T> => {
  return {
    data,
    error: error ? (typeof error === 'string' ? error : error.message || 'Unknown error') : null
  };
}; 

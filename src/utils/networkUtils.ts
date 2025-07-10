// src/utils/networkUtils.ts
import { supabase } from '../lib/supabase';

/**
 * Утилиты для работы с сетевым соединением и восстановлением сессии
 */

// Проверка доступности сети
export const checkNetworkConnection = (): boolean => {
  return navigator.onLine;
};

// Проверка соединения с Supabase
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
};

// Восстановление соединения с Supabase
export const restoreSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Попытка восстановления соединения с Supabase...');
    
    // Пытаемся получить текущую сессию
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Ошибка при восстановлении сессии:', error);
      return false;
    }
    
    if (session) {
      console.log('✅ Сессия восстановлена успешно');
      return true;
    }
    
    console.log('ℹ️ Активная сессия не найдена');
    return false;
  } catch (error) {
    console.error('❌ Неожиданная ошибка при восстановлении соединения:', error);
    return false;
  }
};

// Переподключение к Supabase при потере соединения
export const reconnectToSupabase = async (): Promise<void> => {
  return new Promise((resolve) => {
    const attemptReconnect = async () => {
      const isOnline = checkNetworkConnection();
      
      if (!isOnline) {
        console.log('🌐 Нет соединения с интернетом, ждем восстановления...');
        setTimeout(attemptReconnect, 5000);
        return;
      }
      
      const isConnected = await checkSupabaseConnection();
      
      if (isConnected) {
        console.log('✅ Соединение с Supabase восстановлено');
        resolve();
      } else {
        console.log('🔄 Повторная попытка подключения через 3 секунды...');
        setTimeout(attemptReconnect, 3000);
      }
    };
    
    attemptReconnect();
  });
};

// Обработчик событий сети
export const setupNetworkEventListeners = () => {
  const handleOnline = () => {
    console.log('🌐 Соединение с интернетом восстановлено');
    restoreSupabaseConnection();
  };
  
  const handleOffline = () => {
    console.log('🌐 Соединение с интернетом потеряно');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Возвращаем функцию очистки
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Проверка валидности токена
export const isTokenValid = (expiresAt?: number): boolean => {
  if (!expiresAt) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // 1 минута буфера
  
  return expiresAt > (now + buffer);
};

// Принудительное обновление токена
export const forceTokenRefresh = async (): Promise<boolean> => {
  try {
    console.log('🔄 Принудительное обновление токена...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Ошибка обновления токена:', error);
      return false;
    }
    
    if (data.session) {
      console.log('✅ Токен успешно обновлен');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Неожиданная ошибка при обновлении токена:', error);
    return false;
  }
};
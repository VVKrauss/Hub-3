// src/utils/networkUtils.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { supabase } from '../lib/supabase';
import { 
  isTokenValid, 
  isOnline, 
  withTimeout, 
  globalOperationManager,
  createOperationId 
} from './performanceUtils';

/**
 * Оптимизированные утилиты для работы с сетевым соединением
 */

// Проверка доступности сети
export const checkNetworkConnection = (): boolean => {
  return isOnline();
};

// Быстрая проверка соединения с Supabase
export const checkSupabaseConnection = async (): Promise<boolean> => {
  const operationId = createOperationId();
  
  if (!globalOperationManager.start(operationId)) {
    console.log('🔄 Проверка Supabase уже выполняется');
    return false;
  }

  try {
    const { error } = await withTimeout(supabase.auth.getSession(), 3000);
    return !error;
  } catch {
    return false;
  } finally {
    globalOperationManager.end(operationId);
  }
};

// Проверка валидности токена из localStorage
export const checkStoredTokenValidity = (): boolean => {
  try {
    const stored = localStorage.getItem('sb-auth-token');
    if (!stored) return false;
    
    const session = JSON.parse(stored);
    if (!session.expires_at) return false;
    
    return isTokenValid(new Date(session.expires_at).getTime() / 1000);
  } catch {
    return false;
  }
};

// Принудительное обновление токена
export const forceTokenRefresh = async (): Promise<boolean> => {
  const operationId = createOperationId();
  
  if (!globalOperationManager.start(operationId)) {
    console.log('🔄 Обновление токена уже выполняется');
    return false;
  }

  try {
    console.log('🔄 Попытка обновления токена...');
    
    const { data, error } = await withTimeout(
      supabase.auth.refreshSession(),
      5000
    );
    
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
    console.error('❌ Таймаут при обновлении токена:', error);
    return false;
  } finally {
    globalOperationManager.end(operationId);
  }
};

// Восстановление соединения с Supabase
export const restoreSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Попытка восстановления соединения с Supabase...');
    
    // Сначала проверяем сеть
    if (!checkNetworkConnection()) {
      console.log('🌐 Нет интернет-соединения');
      return false;
    }
    
    // Проверяем валидность сохраненного токена
    if (checkStoredTokenValidity()) {
      console.log('✅ Сохраненный токен валиден');
      return true;
    }
    
    // Пытаемся получить текущую сессию
    const { data: { session }, error } = await withTimeout(
      supabase.auth.getSession(),
      5000
    );
    
    if (error) {
      console.error('❌ Ошибка при восстановлении сессии:', error);
      
      // Пытаемся обновить токен
      const refreshed = await forceTokenRefresh();
      if (refreshed) {
        console.log('✅ Сессия восстановлена через обновление токена');
        return true;
      }
      
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

// Умное переподключение к Supabase при потере соединения
export const reconnectToSupabase = async (maxAttempts = 5): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attemptReconnect = async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        reject(new Error(`Не удалось переподключиться после ${maxAttempts} попыток`));
        return;
      }
      
      console.log(`🔄 Попытка переподключения ${attempts}/${maxAttempts}`);
      
      const isOnline = checkNetworkConnection();
      
      if (!isOnline) {
        console.log('🌐 Нет соединения с интернетом, ждем восстановления...');
        setTimeout(attemptReconnect, 5000);
        return;
      }
      
      const isConnected = await restoreSupabaseConnection();
      
      if (isConnected) {
        console.log('✅ Переподключение к Supabase успешно');
        resolve();
      } else {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Exponential backoff
        console.log(`🔄 Повторная попытка через ${delay}ms...`);
        setTimeout(attemptReconnect, delay);
      }
    };
    
    attemptReconnect();
  });
};

// Обработчик событий сети с debouncing
export const setupNetworkEventListeners = () => {
  let onlineTimeout: NodeJS.Timeout;
  let offlineTimeout: NodeJS.Timeout;
  
  const handleOnline = () => {
    clearTimeout(offlineTimeout);
    onlineTimeout = setTimeout(() => {
      console.log('🌐 Соединение с интернетом восстановлено');
      restoreSupabaseConnection();
    }, 1000); // Небольшая задержка для стабилизации
  };
  
  const handleOffline = () => {
    clearTimeout(onlineTimeout);
    offlineTimeout = setTimeout(() => {
      console.log('🌐 Соединение с интернетом потеряно');
    }, 1000);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Возвращаем функцию очистки
  return () => {
    clearTimeout(onlineTimeout);
    clearTimeout(offlineTimeout);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Экспорт для обратной совместимости
export { isTokenValid } from './performanceUtils';
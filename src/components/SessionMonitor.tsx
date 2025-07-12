// src/components/SessionMonitor.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ (правильная проверка токенов)
import { useEffect, useRef } from 'react';
import { supabase, clearStoredSession } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

/**
 * Исправленный компонент для мониторинга состояния сессии
 * Правильно проверяет истечение токенов
 */
const SessionMonitor = () => {
  const { user, loading, isQuickReturn } = useAuth();
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSessionCheck = useRef<number>(Date.now());
  const sessionLostNotificationShown = useRef<boolean>(false);
  const isMonitoring = useRef<boolean>(false);

  useEffect(() => {
    // Запускаем мониторинг только когда авторизация завершена
    if (loading || isQuickReturn) {
      console.log('🔍 SessionMonitor: Ожидание завершения авторизации...');
      return;
    }

    // Не запускаем мониторинг если уже работает
    if (isMonitoring.current) {
      return;
    }

    console.log('🔍 SessionMonitor: Запуск мониторинга сессии');
    isMonitoring.current = true;

    // Функция ПРАВИЛЬНОЙ проверки состояния сессии
    const checkSessionHealth = async () => {
      // Пропускаем проверку если AuthContext в процессе инициализации
      if (loading || isQuickReturn) {
        console.log('🔍 SessionMonitor: Пропускаем проверку - AuthContext занят');
        return;
      }

      // Проверяем интернет-соединение
      if (!navigator.onLine) {
        console.log('🔍 SessionMonitor: Нет интернет-соединения, пропускаем проверку');
        return;
      }

      try {
        // ИСПРАВЛЕНО: Правильная проверка через localStorage
        const storedAuth = localStorage.getItem('sb-auth-token');
        
        if (!storedAuth && user) {
          // Если пользователь есть в контексте, но нет в localStorage - проблема
          console.warn('🔍 SessionMonitor: Рассинхронизация - пользователь есть, сессии нет');
          handleSessionLost();
          return;
        }

        if (storedAuth) {
          try {
            const session = JSON.parse(storedAuth);
            
            // ИСПРАВЛЕНО: Правильная проверка времени истечения
            if (session.expires_at) {
              // expires_at в Supabase - это Unix timestamp в СЕКУНДАХ, а не миллисекундах
              const expiresAtMs = session.expires_at * 1000; // Конвертируем в миллисекунды
              const now = Date.now();
              
              console.log('🔍 SessionMonitor: Проверка токена:', {
                expiresAt: new Date(expiresAtMs).toISOString(),
                now: new Date(now).toISOString(),
                diffMinutes: Math.round((expiresAtMs - now) / 60000)
              });
              
              // Проверяем не истек ли токен (с буфером 5 минут)
              const bufferMs = 5 * 60 * 1000; // 5 минут
              if (expiresAtMs < (now + bufferMs)) {
                console.warn('🔍 SessionMonitor: Токен истекает или истек');
                handleSessionLost();
                return;
              }
            }
            
            // Обновляем время последней успешной проверки
            lastSessionCheck.current = Date.now();
            sessionLostNotificationShown.current = false;
            
            console.log('✅ SessionMonitor: Токен валиден');
            
          } catch (parseError) {
            console.error('🔍 SessionMonitor: Ошибка парсинга сессии:', parseError);
            handleSessionLost();
          }
        }

      } catch (error) {
        console.error('🔍 SessionMonitor: Ошибка при проверке сессии:', error);
        
        // Только критические ошибки обрабатываем
        if (error instanceof Error && 
            (error.message.includes('refresh_token_not_found') || 
             error.message.includes('invalid_token'))) {
          handleSessionLost();
        }
      }
    };

    // Функция обработки потери сессии
    const handleSessionLost = () => {
      if (!sessionLostNotificationShown.current) {
        console.warn('🔍 SessionMonitor: Обнаружена потеря сессии');
        
        // Очищаем поврежденные данные
        clearStoredSession();
        
        // Показываем уведомление пользователю (только один раз)
        toast.error('Сессия истекла. Пожалуйста, войдите в систему заново.', {
          duration: 5000,
          id: 'session-expired'
        });
        
        sessionLostNotificationShown.current = true;
        
        // Деликатный выход из системы
        supabase.auth.signOut().catch(error => {
          console.error('🔍 SessionMonitor: Ошибка при выходе:', error);
        });
      }
    };

    // Проверяем сессию каждые 60 секунд (реже чем раньше)
    sessionCheckInterval.current = setInterval(checkSessionHealth, 60000);
    
    // Выполняем первую проверку через 10 секунд (даем AuthContext полностью завершиться)
    const initialCheckTimeout = setTimeout(checkSessionHealth, 10000);

    // НЕ слушаем visibilitychange - это делает AuthContext
    // НЕ слушаем focus - это тоже делает AuthContext

    // Cleanup функция
    return () => {
      console.log('🔍 SessionMonitor: Остановка мониторинга сессии');
      
      isMonitoring.current = false;
      
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
      
      clearTimeout(initialCheckTimeout);
    };
  }, [loading, isQuickReturn, user]); // Зависим от состояния авторизации

  // Компонент не рендерит ничего
  return null;
};

export default SessionMonitor;
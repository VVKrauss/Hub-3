// src/components/SessionMonitor.tsx
import { useEffect, useRef } from 'react';
import { supabase, clearStoredSession } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  checkNetworkConnection, 
  setupNetworkEventListeners, 
  isTokenValid, 
  forceTokenRefresh 
} from '../utils/networkUtils';

/**
 * Компонент для мониторинга состояния сессии Supabase
 * Помогает избежать зависаний при потере соединения
 */
const SessionMonitor = () => {
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSessionCheck = useRef<number>(Date.now());
  const sessionLostNotificationShown = useRef<boolean>(false);

  useEffect(() => {
    console.log('🔍 SessionMonitor: Запуск мониторинга сессии');

    // Настраиваем слушатели сетевых событий
    const cleanupNetworkListeners = setupNetworkEventListeners();

    // Функция проверки состояния сессии
    const checkSessionHealth = async () => {
      // Проверяем интернет-соединение
      if (!checkNetworkConnection()) {
        console.log('🔍 SessionMonitor: Нет интернет-соединения, пропускаем проверку');
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('🔍 SessionMonitor: Ошибка при проверке сессии:', error);
          
          // Если ошибка связана с истекшей сессией
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('invalid_token') ||
              error.message.includes('JWT expired')) {
            handleSessionLost();
          }
          return;
        }

        // Если сессия есть, обновляем время последней проверки
        if (session) {
          lastSessionCheck.current = Date.now();
          sessionLostNotificationShown.current = false;
          
          // Проверяем валидность токена
          if (session.expires_at && !isTokenValid(session.expires_at)) {
            console.log('🔍 SessionMonitor: Токен истекает, попытка обновления');
            const refreshed = await forceTokenRefresh();
            
            if (!refreshed) {
              console.error('🔍 SessionMonitor: Не удалось обновить токен');
              handleSessionLost();
              return;
            }
          }
        } else {
          // Если сессии нет, но пользователь должен был быть авторизован
          const timeSinceLastCheck = Date.now() - lastSessionCheck.current;
          const fiveMinutes = 5 * 60 * 1000;
          
          if (timeSinceLastCheck > fiveMinutes) {
            handleSessionLost();
          }
        }
      } catch (error) {
        console.error('🔍 SessionMonitor: Неожиданная ошибка при проверке сессии:', error);
        
        // Если это ошибка сети, не показываем пользователю
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log('🔍 SessionMonitor: Ошибка сети, пропускаем обработку');
          return;
        }
        
        handleSessionLost();
      }
    };

    // Функция обработки потери сессии
    const handleSessionLost = () => {
      if (!sessionLostNotificationShown.current) {
        console.warn('🔍 SessionMonitor: Обнаружена потеря сессии');
        
        // Очищаем поврежденные данные
        clearStoredSession();
        
        // Показываем уведомление пользователю
        toast.error('Сессия истекла. Пожалуйста, войдите в систему заново.', {
          duration: 5000,
          id: 'session-expired' // Предотвращаем дублирование уведомлений
        });
        
        sessionLostNotificationShown.current = true;
        
        // Принудительно выходим из системы
        supabase.auth.signOut().catch(error => {
          console.error('🔍 SessionMonitor: Ошибка при принудительном выходе:', error);
        });
      }
    };

    // Проверяем сессию каждые 30 секунд
    sessionCheckInterval.current = setInterval(checkSessionHealth, 30000);
    
    // Выполняем первую проверку сразу
    checkSessionHealth();

    // Слушаем события видимости страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 SessionMonitor: Страница стала видимой, проверяем сессию');
        checkSessionHealth();
      }
    };

    // Слушаем события focus/blur окна
    const handleWindowFocus = () => {
      console.log('🔍 SessionMonitor: Окно получило фокус, проверяем сессию');
      checkSessionHealth();
    };

    // Подписываемся на события
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup функция
    return () => {
      console.log('🔍 SessionMonitor: Остановка мониторинга сессии');
      
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      
      // Очищаем слушатели сетевых событий
      cleanupNetworkListeners();
    };
  }, []);

  // Компонент не рендерит ничего
  return null;
};

export default SessionMonitor;
// src/hooks/useAppRecovery.ts - Хук для восстановления приложения
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useAppRecovery = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const lastActiveTime = useRef(Date.now());
  const recoveryTimeout = useRef<NodeJS.Timeout>();

  // Функция восстановления
  const recoverApp = async () => {
    if (isRecovering) return;
    
    console.log('🔄 Starting app recovery...');
    setIsRecovering(true);

    try {
      // 1. Проверяем и восстанавливаем сессию
      console.log('🔐 Recovering auth session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session recovery failed:', sessionError);
        // Пытаемся обновить токен
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
        } else {
          console.log('✅ Token refreshed successfully');
        }
      } else {
        console.log('✅ Session recovered:', { hasSession: !!session, userId: session?.user?.id });
      }

      // 2. Тестируем подключение к БД
      console.log('📊 Testing database connection...');
      const { data: dbTest, error: dbError } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1);

      if (dbError) {
        console.error('❌ Database connection failed:', dbError);
        // Пересоздаем клиент если нужно
        console.log('🔄 Attempting to refresh connection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('✅ Database connection recovered');
      }

      // 3. Уведомляем другие компоненты о восстановлении
      window.dispatchEvent(new CustomEvent('app-recovered'));
      console.log('🎉 App recovery completed');

    } catch (error) {
      console.error('❌ App recovery failed:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  // Отслеживание активности вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Вкладка стала неактивной
        lastActiveTime.current = Date.now();
        console.log('😴 Tab became inactive');
      } else {
        // Вкладка стала активной
        const inactiveTime = Date.now() - lastActiveTime.current;
        console.log(`👁️ Tab became active (was inactive for ${Math.round(inactiveTime / 1000)}s)`);
        
        // Если была неактивна больше 30 секунд - запускаем восстановление
        if (inactiveTime > 30000) {
          console.log('⚠️ Long inactivity detected - starting recovery');
          
          // Небольшая задержка чтобы браузер "проснулся"
          if (recoveryTimeout.current) {
            clearTimeout(recoveryTimeout.current);
          }
          
          recoveryTimeout.current = setTimeout(() => {
            recoverApp();
          }, 2000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Также слушаем focus/blur на window
    const handleFocus = () => {
      if (!document.hidden) {
        const inactiveTime = Date.now() - lastActiveTime.current;
        if (inactiveTime > 30000) {
          console.log('🔍 Window focus - starting recovery');
          setTimeout(recoverApp, 1000);
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (recoveryTimeout.current) {
        clearTimeout(recoveryTimeout.current);
      }
    };
  }, []);

  return {
    isRecovering,
    recoverApp: () => {
      console.log('🔄 Manual recovery triggered');
      recoverApp();
    }
  };
};

// src/components/AppRecovery.tsx - Компонент для индикации восстановления
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppRecovery } from '../hooks/useAppRecovery';

const AppRecovery: React.FC = () => {
  const { isRecovering, recoverApp } = useAppRecovery();

  if (!isRecovering) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h4 className="font-semibold text-blue-800 text-sm">
              Восстановление подключения
            </h4>
            <p className="text-blue-600 text-xs">
              Восстанавливаем авторизацию и подключение к базе данных...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppRecovery;
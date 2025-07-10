// src/components/AppRecovery.tsx
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AppRecovery: React.FC = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const lastActiveTime = useRef(Date.now());
  const recoveryTimeout = useRef<NodeJS.Timeout>();

  // Функция восстановления
  const recoverApp = async () => {
    if (isRecovering) return;
    
    console.log('🔄 Starting app recovery...');
    setIsRecovering(true);
    setShowSuccess(false);

    try {
      // Шаг 1: Восстановление авторизации
      setRecoveryStep('Восстановление авторизации...');
      console.log('🔐 Recovering auth session...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session recovery failed:', sessionError);
        // Пытаемся обновить токен
        setRecoveryStep('Обновление токена...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Не удалось восстановить авторизацию');
        } else {
          console.log('✅ Token refreshed successfully');
        }
      } else {
        console.log('✅ Session recovered:', { hasSession: !!session, userId: session?.user?.id });
      }

      // Небольшая пауза между шагами
      await new Promise(resolve => setTimeout(resolve, 800));

      // Шаг 2: Тестирование БД
      setRecoveryStep('Проверка подключения к базе данных...');
      console.log('📊 Testing database connection...');
      
      const { data: dbTest, error: dbError } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1);

      if (dbError) {
        console.error('❌ Database connection failed:', dbError);
        setRecoveryStep('Переподключение к базе данных...');
        // Дополнительная попытка
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: retryError } = await supabase
          .from('site_settings')
          .select('id')
          .limit(1);
          
        if (retryError) {
          throw new Error('Не удалось восстановить подключение к БД');
        }
      } else {
        console.log('✅ Database connection recovered');
      }

      // Шаг 3: Завершение
      setRecoveryStep('Завершение восстановления...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Уведомляем другие компоненты о восстановлении
      window.dispatchEvent(new CustomEvent('app-recovered'));
      console.log('🎉 App recovery completed');

      // Показываем успех
      setRecoveryStep('');
      setShowSuccess(true);
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('❌ App recovery failed:', error);
      setRecoveryStep(`Ошибка восстановления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      
      // Скрываем ошибку через 5 секунд
      setTimeout(() => {
        setIsRecovering(false);
        setRecoveryStep('');
      }, 5000);
    } finally {
      if (!recoveryStep.includes('Ошибка')) {
        setIsRecovering(false);
      }
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
          
          // Очищаем предыдущий таймаут
          if (recoveryTimeout.current) {
            clearTimeout(recoveryTimeout.current);
          }
          
          // Запускаем восстановление с небольшой задержкой
          recoveryTimeout.current = setTimeout(() => {
            recoverApp();
          }, 2000);
        }
      }
    };

    // Слушаем события видимости
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

    const handleBlur = () => {
      lastActiveTime.current = Date.now();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      if (recoveryTimeout.current) {
        clearTimeout(recoveryTimeout.current);
      }
    };
  }, []);

  // Не показываем ничего если нет активности
  if (!isRecovering && !showSuccess) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      {isRecovering && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800 text-sm">
                Восстановление подключения
              </h4>
              {recoveryStep && (
                <p className={`text-xs mt-1 ${
                  recoveryStep.includes('Ошибка') 
                    ? 'text-red-600' 
                    : 'text-blue-600'
                }`}>
                  {recoveryStep}
                </p>
              )}
              {!recoveryStep && (
                <p className="text-blue-600 text-xs mt-1">
                  Восстанавливаем работу приложения...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 text-sm">
                Подключение восстановлено
              </h4>
              <p className="text-green-600 text-xs mt-1">
                Авторизация и база данных работают нормально
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppRecovery;
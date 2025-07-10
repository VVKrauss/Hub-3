// src/components/AppLoadingWrapper.tsx
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { clearStoredSession } from '../lib/supabase';

interface AppLoadingWrapperProps {
  children: React.ReactNode;
}

const AppLoadingWrapper = ({ children }: AppLoadingWrapperProps) => {
  const { loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Таймаут для предотвращения бесконечной загрузки
  useEffect(() => {
    if (!loading) {
      setTimeoutReached(false);
      setForceShow(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('⚠️ AppLoadingWrapper: Превышен таймаут загрузки авторизации');
      setTimeoutReached(true);
    }, 10000); // 10 секунд

    return () => clearTimeout(timeout);
  }, [loading]);

  const handleForceShow = () => {
    console.log('🔄 AppLoadingWrapper: Принудительное продолжение без ожидания авторизации');
    setForceShow(true);
  };

  const handleClearAndReload = () => {
    console.log('🔄 AppLoadingWrapper: Очистка данных и перезагрузка');
    clearStoredSession();
    localStorage.clear();
    window.location.reload();
  };

  // Если загрузка завершена или принудительное показ
  if (!loading || forceShow) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 text-center">
          {!timeoutReached ? (
            <>
              {/* Обычная загрузка */}
              <div className="mb-6">
                <div className="relative mx-auto w-16 h-16">
                  <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Загрузка приложения
              </h1>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Подготавливаем все для вас...
              </p>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Если загрузка занимает слишком много времени, попробуйте обновить страницу
              </p>
            </>
          ) : (
            <>
              {/* Превышен таймаут */}
              <div className="mb-6">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Проблемы с загрузкой
              </h1>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Приложение загружается дольше обычного. Это может быть связано с медленным соединением или проблемами с авторизацией.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleForceShow}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <span>Продолжить без ожидания</span>
                </button>

                <button
                  onClick={handleClearAndReload}
                  className="w-full btn-outline flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Очистить данные и перезагрузить</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Если проблемы продолжаются, обратитесь к администратору
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLoadingWrapper;
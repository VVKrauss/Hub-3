// src/components/AppLoadingWrapper.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ с анимированным логотипом
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Zap } from 'lucide-react';
import { clearStoredSession } from '../lib/supabase';
import CustomLoader from './ui/CustomLoader';

interface AppLoadingWrapperProps {
  children: React.ReactNode;
}

const AppLoadingWrapper = ({ children }: AppLoadingWrapperProps) => {
  const { loading, isQuickReturn } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Разные таймауты для разных типов загрузки
  useEffect(() => {
    if (!loading) {
      setTimeoutReached(false);
      setForceShow(false);
      return;
    }

    // Для быстрого возврата - короткий таймаут
    const timeoutDuration = isQuickReturn ? 5000 : 10000; // 5 сек для возврата, 10 сек для полной загрузки

    const timeout = setTimeout(() => {
      console.warn(`⚠️ AppLoadingWrapper: Превышен таймаут загрузки (${timeoutDuration}ms, быстрый возврат: ${isQuickReturn})`);
      setTimeoutReached(true);
    }, timeoutDuration);

    return () => clearTimeout(timeout);
  }, [loading, isQuickReturn]);

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
              {/* Анимированный логотип */}
              <div className="mb-6">
                {isQuickReturn ? (
                  <div className="relative">
                    <CustomLoader size="xl" />
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <CustomLoader size="xl" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {isQuickReturn ? 'Быстрое восстановление' : 'Загрузка приложения'}
              </h1>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {isQuickReturn 
                  ? 'Восстанавливаем ваш сеанс...' 
                  : 'Подготавливаем все для вас...'
                }
              </p>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${
                  isQuickReturn 
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 animate-pulse w-4/5' 
                    : 'bg-gradient-to-r from-primary-600 to-secondary-600 animate-pulse w-3/4'
                } h-2 rounded-full transition-all duration-300`}></div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {isQuickReturn 
                  ? 'Быстрое восстановление обычно занимает несколько секунд'
                  : 'Если загрузка занимает слишком много времени, попробуйте обновить страницу'
                }
              </p>
            </>
          ) : (
            <>
              {/* Превышен таймаут */}
              <div className="mb-6">
                <div className="relative">
                  <CustomLoader size="xl" className="opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {isQuickReturn ? 'Медленное восстановление' : 'Проблемы с загрузкой'}
              </h1>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {isQuickReturn 
                  ? 'Восстановление сеанса занимает дольше обычного. Это может быть связано с медленным соединением.'
                  : 'Приложение загружается дольше обычного. Это может быть связано с медленным соединением или проблемами с авторизацией.'
                }
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
                {isQuickReturn 
                  ? 'При медленном соединении восстановление может занять до минуты'
                  : 'Если проблемы продолжаются, обратитесь к администратору'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLoadingWrapper;
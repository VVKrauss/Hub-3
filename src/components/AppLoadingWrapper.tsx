// src/components/AppLoadingWrapper.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface AppLoadingWrapperProps {
  children: React.ReactNode;
}

const AppLoadingWrapper = ({ children }: AppLoadingWrapperProps) => {
  const { loading } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);
  const [loadingStartTime] = useState(Date.now());

  useEffect(() => {
    // Показать опцию перезагрузки через 15 секунд
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 15000);

    return () => clearTimeout(timeoutTimer);
  }, [loading]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleForceSkip = () => {
    // Принудительно пропустить загрузку (только для экстренных случаев)
    localStorage.setItem('force_skip_auth', 'true');
    window.location.reload();
  };

  if (!loading) {
    return <>{children}</>;
  }

  const loadingTime = Math.floor((Date.now() - loadingStartTime) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Логотип или иконка */}
          <div className="mb-6">
            <div className="relative mx-auto w-16 h-16">
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
            </div>
          </div>

          {/* Заголовок */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Загрузка приложения
          </h1>

          {/* Описание */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {loadingTime < 5 ? 'Подготавливаем все для вас...' :
             loadingTime < 10 ? 'Проверяем соединение...' :
             loadingTime < 15 ? 'Это займет еще немного времени...' :
             'Что-то идет не так...'}
          </p>

          {/* Прогресс-бар (имитация) */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.min(90, (loadingTime / 15) * 100)}%` 
              }}
            ></div>
          </div>

          {/* Время загрузки */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Время загрузки: {loadingTime}с
          </p>

          {/* Действия при долгой загрузке */}
          {showTimeout && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Долгая загрузка</span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Загрузка занимает больше времени, чем обычно. Попробуйте обновить страницу.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleReload}
                  className="flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить страницу
                </button>
                
                <button
                  onClick={handleForceSkip}
                  className="flex items-center justify-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm"
                >
                  Пропустить
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Если проблема повторяется, свяжитесь с поддержкой
              </p>
            </div>
          )}
        </div>

        {/* Подсказки */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 Совет: Убедитесь, что у вас стабильное интернет-соединение
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppLoadingWrapper;
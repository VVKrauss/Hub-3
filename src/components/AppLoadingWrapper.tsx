// src/components/AppLoadingWrapper.tsx
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AppLoadingWrapperProps {
  children: React.ReactNode;
}

const AppLoadingWrapper = ({ children }: AppLoadingWrapperProps) => {
  const { loading } = useAuth();

  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Логотип */}
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
            Подготавливаем все для вас...
          </p>

          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLoadingWrapper;
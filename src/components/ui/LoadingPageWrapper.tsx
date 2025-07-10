// src/components/ui/LoadingPageWrapper.tsx - Обертка для страниц с загрузкой
import { ReactNode } from 'react';
import CustomLoader from './CustomLoader';

interface LoadingPageWrapperProps {
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  loadingText?: string;
  minHeight?: string;
  showFullScreen?: boolean;
}

const LoadingPageWrapper = ({
  loading,
  error,
  children,
  loadingText = "Загружаем данные...",
  minHeight = "min-h-screen",
  showFullScreen = false
}: LoadingPageWrapperProps) => {
  // Ошибка
  if (error) {
    return (
      <div className={`${minHeight} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Загрузка
  if (loading) {
    if (showFullScreen) {
      return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
          <div className="text-center">
            <CustomLoader size="xl" showText text={loadingText} />
          </div>
        </div>
      );
    }

    return (
      <div className={`${minHeight} flex items-center justify-center`}>
        <div className="text-center">
          <CustomLoader size="lg" showText text={loadingText} />
        </div>
      </div>
    );
  }

  // Контент
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
};

export default LoadingPageWrapper;
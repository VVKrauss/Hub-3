// src/components/ui/UnifiedLoading.tsx - Единая система загрузки
import { ReactNode } from 'react';
import CustomLoader from './CustomLoader';

// Компонент для замены всех LoadingSpinner
export const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Загрузка данных...',
  className = 'py-12'
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}) => (
  <div className={`flex justify-center items-center ${className}`}>
    <CustomLoader size={size} showText text={text} />
  </div>
);

// Обертка для полноэкранной загрузки
export const FullScreenLoader = ({
  text = 'Загружаем...',
  size = 'xl'
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => (
  <CustomLoader variant="overlay" size={size} showText text={text} />
);

// Обертка для загрузки страницы
export const PageLoader = ({
  text = 'Загружаем страницу...',
  size = 'lg'
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => (
  <CustomLoader variant="page" size={size} showText text={text} />
);

// Компонент замены для LoadingPageWrapper
interface UnifiedLoadingPageWrapperProps {
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  loadingText?: string;
  minHeight?: string;
  showFullScreen?: boolean;
}

export const UnifiedLoadingPageWrapper = ({
  loading,
  error,
  children,
  loadingText = "Загружаем данные...",
  minHeight = "min-h-screen",
  showFullScreen = false
}: UnifiedLoadingPageWrapperProps) => {
  // Ошибка
  if (error) {
    return (
      <div className={`${minHeight} flex items-center justify-center bg-gray-500 dark:bg-dark-600`}>
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-dark-800 rounded-lg shadow-lg">
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
      return <FullScreenLoader text={loadingText} />;
    }

    return (
      <div className={`${minHeight} bg-gray-500 dark:bg-dark-600 flex items-center justify-center`}>
        <CustomLoader size="lg" showText text={loadingText} />
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

// Компонент для кнопок с загрузкой
export const LoadingButton = ({
  loading,
  children,
  className = '',
  loadingText = 'Загрузка...',
  ...props
}: {
  loading: boolean;
  children: ReactNode;
  className?: string;
  loadingText?: string;
  [key: string]: any;
}) => (
  <button
    className={`flex items-center justify-center gap-2 ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
    disabled={loading}
    {...props}
  >
    {loading ? (
      <>
        <CustomLoader size="sm" />
        <span>{loadingText}</span>
      </>
    ) : (
      children
    )}
  </button>
);

// Skeleton компоненты остаются прежними, но используют серый фон
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-400 dark:bg-dark-700 rounded ${className}`}
    {...props}
  />
);

// Улучшенные skeleton с серым фоном
export const EventCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-6">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  </div>
);

export const SpeakerCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 text-center">
    <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
    <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
    <Skeleton className="h-4 w-1/2 mx-auto mb-4" />
    <Skeleton className="h-4 w-full mb-1" />
    <Skeleton className="h-4 w-2/3 mx-auto" />
  </div>
);

export const ListSkeleton = ({ items = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-dark-800 rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white dark:bg-dark-800 rounded-lg shadow overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 dark:bg-dark-700 p-4">
      <div className="flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200 dark:divide-dark-600">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex space-x-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PageContentSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-500 dark:bg-dark-600 min-h-screen">
    {/* Header */}
    <div className="mb-8">
      <Skeleton className="h-12 w-1/3 mb-4" />
      <Skeleton className="h-6 w-2/3" />
    </div>

    {/* Grid контента */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Умный лоадер, который выбирает нужный тип
export const SmartLoader = ({ 
  type = 'spinner', 
  size = 'md',
  text,
  className = ''
}) => {
  switch (type) {
    case 'page':
      return <PageContentSkeleton />;
    case 'table':
      return <TableSkeleton />;
    case 'list':
      return <ListSkeleton />;
    case 'cards':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-500 dark:bg-dark-600 p-8 min-h-screen">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      );
    default:
      return (
        <div className={`flex justify-center items-center ${className}`}>
          <CustomLoader size={size} showText={!!text} text={text} />
        </div>
      );
  }
};
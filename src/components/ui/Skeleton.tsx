// src/components/ui/Skeleton.tsx - Skeleton компоненты для плавной загрузки
import CustomLoader from './CustomLoader';

// Базовый skeleton
export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    {...props}
  />
);

// Skeleton для карточки события
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

// Skeleton для карточки спикера
export const SpeakerCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 text-center">
    <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
    <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
    <Skeleton className="h-4 w-1/2 mx-auto mb-4" />
    <Skeleton className="h-4 w-full mb-1" />
    <Skeleton className="h-4 w-2/3 mx-auto" />
  </div>
);

// Skeleton для списка
export const ListSkeleton = ({ items = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
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

// Skeleton для таблицы
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

// Skeleton для страницы с контентом
export const PageContentSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8">
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

// Комбинированный loading компонент с возможностью выбора
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
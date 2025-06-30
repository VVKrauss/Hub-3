// src/components/events/EmptyEventsState.tsx
import React from 'react';
import { Calendar, Search, Plus, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyEventsStateProps {
  type: 'no-events' | 'no-search-results' | 'no-past-events';
  searchQuery?: string;
  onClearSearch?: () => void;
}

const EmptyEventsState: React.FC<EmptyEventsStateProps> = ({ 
  type, 
  searchQuery, 
  onClearSearch 
}) => {
  const getContent = () => {
    switch (type) {
      case 'no-search-results':
        return {
          icon: <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />,
          title: 'Ничего не найдено',
          description: `По запросу "${searchQuery}" не найдено мероприятий`,
          actions: (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className="px-6 py-3 bg-gray-200 dark:bg-dark-700 hover:bg-gray-300 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Очистить поиск
                </button>
              )}
              <Link
                to="/events"
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Показать все события
              </Link>
            </div>
          )
        };

      case 'no-past-events':
        return {
          icon: <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />,
          title: 'Пока нет прошедших мероприятий',
          description: 'Здесь будут отображаться завершенные мероприятия',
          actions: (
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Посмотреть активные события
            </Link>
          )
        };

      default: // 'no-events'
        return {
          icon: <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />,
          title: 'Нет предстоящих мероприятий',
          description: 'В данный момент не запланировано ни одного мероприятия. Подпишитесь на уведомления, чтобы узнать о новых событиях первыми.',
          actions: (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                <Bell className="h-4 w-4" />
                Подписаться на уведомления
              </button>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-dark-700 hover:bg-gray-300 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Предложить мероприятие
              </Link>
            </div>
          )
        };
    }
  };

  const content = getContent();

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto">
        {content.icon}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {content.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {content.description}
        </p>
        {content.actions}
      </div>
    </div>
  );
};

export default EmptyEventsState;
// src/components/events/CompactEventCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import type { EventWithDetails } from '../../types/database';

interface CompactEventCardProps {
  event: EventWithDetails;
  showStatus?: boolean;
}

const CompactEventCard: React.FC<CompactEventCardProps> = ({ 
  event, 
  showStatus = true 
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isPast = new Date(event.start_at) <= new Date() || event.status === 'past';
  
  // Функция для сокращения текста
  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors group">
      {/* Изображение */}
      {event.cover_image_url ? (
        <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 dark:bg-dark-600">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary-500" />
        </div>
      )}

      {/* Контент */}
      <div className="flex-1 min-w-0">
        {/* Статус (если нужен) */}
        {showStatus && isPast && (
          <div className="mb-1">
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-400 rounded-full">
              Завершено
            </span>
          </div>
        )}

        {/* Название */}
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          <Link 
            to={`/events/${event.id}`}
            className="hover:underline"
          >
            {truncateText(event.title, 50)}
          </Link>
        </h3>

        {/* Дата */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Calendar className="h-3 w-3 mr-1 text-primary-500" />
          <span>{formatDate(event.start_at)}</span>
        </div>

        {/* Место (если есть) */}
        {event.venue_name && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3 mr-1 text-primary-500" />
            <span className="truncate">{truncateText(event.venue_name, 25)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactEventCard;
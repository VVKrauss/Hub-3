// src/components/events/EventCardWithFavorite.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Heart, DollarSign } from 'lucide-react';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

// ЛЕЙБЛЫ ДЛЯ ПРАВИЛЬНОГО ОТОБРАЖЕНИЯ
const EVENT_TYPE_LABELS: Record<string, string> = {
  'lecture': 'Лекция',
  'workshop': 'Мастер-класс',
  'discussion': 'Дискуссия',
  'conference': 'Конференция',
  'seminar': 'Семинар',
  'festival': 'Фестиваль',
  'concert': 'Концерт',
  'standup': 'Стенд-ап',
  'excursion': 'Экскурсия',
  'quiz': 'Квиз',
  'swap': 'Своп',
  'meetup': 'Митап',
  'webinar': 'Вебинар',
  'training': 'Тренинг',
  'other': 'Другое',
  // Legacy значения
  'Lecture': 'Лекция',
  'Workshop': 'Мастер-класс',
  'Conference': 'Конференция',
  'Seminar': 'Семинар',
  'Discussion': 'Дискуссия',
  'Festival': 'Фестиваль',
  'Concert': 'Концерт',
  'Standup': 'Стенд-ап',
  'Excursion': 'Экскурсия',
  'Quiz': 'Квиз',
  'Swap': 'Своп',
  'Other': 'Другое'
};

interface EventCardWithFavoriteProps {
  event: any;
  isFavorite?: boolean;
  onToggleFavorite?: (eventId: string) => void;
  showFavoriteButton?: boolean;
}

// ФУНКЦИЯ ПОЛУЧЕНИЯ ЦЕНЫ - ВСЕГДА ПОКАЗЫВАЕМ ЦЕНУ
const getEventPrice = (event: any): string => {
  if (event.payment_type === 'free') return 'Бесплатно';
  if (event.payment_type === 'donation') return 'Донейшн';
  
  if (event.payment_type === 'paid') {
    // Приоритет: новое поле base_price
    if (event.base_price && event.base_price > 0) {
      return `${event.base_price} ${event.currency || 'RSD'}`;
    }
    // Fallback: legacy поле price
    if (event.price && event.price > 0) {
      return `${event.price} ${event.currency || 'RSD'}`;
    }
    return 'Цена уточняется';
  }
  
  // Legacy логика для старых событий
  if (event.price === 0 || event.price === null) {
    return 'Бесплатно';
  }
  
  if (event.price && event.price > 0) {
    return `${event.price} ${event.currency || 'RSD'}`;
  }
  
  return 'Бесплатно';
};

// ФУНКЦИЯ ПОЛУЧЕНИЯ ТИПА СОБЫТИЯ НА РУССКОМ
const getEventTypeLabel = (eventType: string): string => {
  return EVENT_TYPE_LABELS[eventType] || eventType;
};

// ФУНКЦИЯ ПОЛУЧЕНИЯ ИЗОБРАЖЕНИЯ
const getEventImage = (event: any): string => {
  // Приоритет: новое поле cover_image_url
  if (event.cover_image_url) {
    return getSupabaseImageUrl(event.cover_image_url);
  }
  
  // Fallback: legacy поле bg_image
  if (event.bg_image) {
    return getSupabaseImageUrl(event.bg_image);
  }
  
  return 'https://via.placeholder.com/400x200?text=No+Image';
};

const EventCardWithFavorite: React.FC<EventCardWithFavoriteProps> = ({
  event,
  isFavorite = false,
  onToggleFavorite,
  showFavoriteButton = true
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(event.id);
    }
  };

  return (
    <div className="relative group bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Кнопка избранного */}
      {showFavoriteButton && (
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 left-3 z-10 p-2 rounded-full transition-all duration-200 ${
            isFavorite
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-white/80 dark:bg-dark-700/80 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white'
          }`}
        >
          <Heart 
            className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} 
          />
        </button>
      )}

      <Link to={`/events/${event.id}`} className="block">
        {/* Изображение */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={getEventImage(event)}
            alt={event.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* ТИП СОБЫТИЯ НА РУССКОМ */}
          <div className="absolute top-3 right-3 bg-primary-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
            {getEventTypeLabel(event.event_type)}
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white line-clamp-2">
            {event.title}
          </h3>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
            {event.start_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{new Date(event.start_at).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
            
            {(event.venue_name || event.location) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{event.venue_name || event.location}</span>
              </div>
            )}
          </div>

          {(event.description || event.short_description) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
              {event.short_description || event.description}
            </p>
          )}

          {/* ЦЕНА - ВСЕГДА ОТОБРАЖАЕТСЯ */}
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {getEventPrice(event)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default EventCardWithFavorite;
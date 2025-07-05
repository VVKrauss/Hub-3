// src/components/events/EventCard.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы и типы

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Globe,
  DollarSign,
  Tag,
  Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavoriteEvents } from '../../hooks/useFavorites';
import FavoriteButton from '../favorites/FavoriteButton';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import { formatDate, formatTime } from '../../utils/dateUtils';
import type { EventWithDetails } from '../../types/database';

interface EventCardProps {
  event: EventWithDetails;
  showFavoriteButton?: boolean;
  compact?: boolean;
  className?: string;
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  showFavoriteButton = true, 
  compact = false,
  className = '' 
}) => {
  const { user } = useAuth();
  const { 
    toggleFavoriteEvent, 
    isFavoriteEvent, 
    loading: favLoading 
  } = useFavoriteEvents(user?.id);

  // Вспомогательные функции
  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'lecture': 'Лекция',
      'workshop': 'Мастер-класс',
      'conference': 'Конференция',
      'seminar': 'Семинар',
      'festival': 'Фестиваль',
      'discussion': 'Обсуждение',
      'concert': 'Концерт',
      'standup': 'Стендап',
      'excursion': 'Экскурсия',
      'quiz': 'Квиз',
      'swap': 'Обмен',
      'movie_discussion': 'Обсуждение фильма',
      'conversation_club': 'Разговорный клуб',
      'other': 'Другое'
    };
    return labels[type] || type;
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'free': 'Бесплатно',
      'paid': 'Платно',
      'donation': 'По донации'
    };
    return labels[type] || type;
  };

  const isEventInPast = () => {
    return new Date(event.end_at) < new Date();
  };

  const isEventFull = () => {
    return event.max_attendees && 
           event.registrations_count >= event.max_attendees;
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    toggleFavoriteEvent(event.id);
  };

  const isPast = isEventInPast();
  const isFull = isEventFull();

  return (
    <Link 
      to={`/events/${event.slug || event.id}`}
      className={`group block ${className}`}
    >
      <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-dark-700 ${
        compact ? 'h-auto' : 'h-full'
      }`}>
        {/* Изображение */}
        <div className={`relative overflow-hidden ${compact ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
          {event.cover_image_url ? (
            <img
              src={getSupabaseImageUrl(event.cover_image_url)}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary-400 dark:text-primary-500" />
            </div>
          )}
          
          {/* Статусы и кнопки поверх изображения */}
          <div className="absolute inset-0">
            {/* Статусы */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {event.is_featured && (
                <span className="inline-flex items-center bg-yellow-500/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  <Star className="w-3 h-3 mr-1" />
                  Рекомендуемое
                </span>
              )}
              
              {isPast && (
                <span className="inline-flex items-center bg-gray-500/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  Завершено
                </span>
              )}
              
              {isFull && !isPast && (
                <span className="inline-flex items-center bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  Мест нет
                </span>
              )}
            </div>

            {/* Кнопка избранного */}
            {showFavoriteButton && user && (
              <div className="absolute top-3 right-3">
                <FavoriteButton
                  isFavorite={isFavoriteEvent(event.id)}
                  onClick={handleFavoriteClick}
                  loading={favLoading}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-sm"
                  size="sm"
                />
              </div>
            )}

            {/* Тип события */}
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center bg-primary-600/90 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                {getEventTypeLabel(event.event_type)}
              </span>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className={`p-${compact ? '4' : '6'} flex flex-col h-full`}>
          {/* Заголовок */}
          <h3 className={`font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${
            compact ? 'text-lg' : 'text-xl'
          }`}>
            {event.title}
          </h3>

          {/* Краткое описание */}
          {event.short_description && !compact && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
              {event.short_description}
            </p>
          )}

          {/* Основная информация */}
          <div className="space-y-3 mb-4 flex-1">
            {/* Дата и время */}
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {formatDate(event.start_at)}
              </span>
            </div>

            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {formatTime(event.start_at)} - {formatTime(event.end_at)}
              </span>
            </div>

            {/* Место */}
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              {event.location_type === 'online' ? (
                <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              )}
              <span className="text-sm truncate">
                {event.location_type === 'online' 
                  ? 'Онлайн' 
                  : (event.venue_name || 'Офлайн')
                }
              </span>
            </div>

            {/* Участники */}
            {(event.max_attendees || event.registrations_count > 0) && (
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">
                  {event.registrations_count || 0}
                  {event.max_attendees && ` из ${event.max_attendees}`} участников
                </span>
              </div>
            )}

            {/* Стоимость */}
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {getPaymentTypeLabel(event.payment_type)}
                {event.base_price && event.base_price > 0 && (
                  <span className="ml-1 font-medium">
                    {event.base_price} {event.currency}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Теги */}
          {event.tags && event.tags.length > 0 && !compact && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {event.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {event.tags.length > 3 && (
                  <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs">
                    +{event.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Спикеры */}
          {event.sh_event_speakers && event.sh_event_speakers.length > 0 && !compact && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Спикеры:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.sh_event_speakers.slice(0, 2).map((eventSpeaker) => {
                  const speaker = eventSpeaker.speaker;
                  if (!speaker) return null;
                  
                  return (
                    <div key={eventSpeaker.id} className="flex items-center space-x-2">
                      {speaker.avatar_url ? (
                        <img
                          src={getSupabaseImageUrl(speaker.avatar_url)}
                          alt={speaker.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {speaker.name}
                      </span>
                    </div>
                  );
                })}
                {event.sh_event_speakers.length > 2 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{event.sh_event_speakers.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              {event.age_category && (
                <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs">
                  {event.age_category}
                </span>
              )}
              
              {event.language_code && event.language_code !== 'sr' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs">
                  {event.language_code === 'ru' ? 'RU' : 
                   event.language_code === 'en' ? 'EN' : 
                   event.language_code.toUpperCase()}
                </span>
              )}
            </div>

            {!isPast && event.registration_required && (
              <div className="text-right">
                {isFull ? (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Мест нет
                  </span>
                ) : event.available_spots !== null && event.available_spots <= 5 && event.available_spots > 0 ? (
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Осталось {event.available_spots}
                  </span>
                ) : (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Есть места
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
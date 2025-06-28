import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Users, Globe, Tag, Clock, MapPin } from 'lucide-react';
import { formatTimeFromTimestamp, formatTimeRange, formatRussianDate, isValidDateString } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import EventFavoriteButton from './EventFavoriteButton';

export type Event = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  location?: string;
  description?: string;
  bg_image: string;
  age_category: string;
  languages: string[];
  event_type: string;
  price?: number;
  currency?: string;
  payment_type?: string;
  // Legacy fields for backward compatibility
  date?: string;
  start_time?: string;
  end_time?: string;
};

type EventsListProps = {
  events: Event[];
  type?: 'upcoming' | 'past';
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
  showPrice?: boolean;
  className?: string;
  formatTimeRange?: (start: string, end: string) => string;
};

// Map event types to Russian
const EVENT_TYPE_MAP: Record<string, string> = {
  'lecture': 'Лекция',
  'workshop': 'Мастер-класс',
  'movie discussion': 'Обсуждение фильма',
  'conversation club': 'Разговорный клуб',
  'festival': 'Фестиваль',
  'stand-up': 'Стендап',
  'concert': 'Концерт',
  'excursion': 'Экскурсия',
  'discussion': 'Дискуссия',
  'swap': 'Обмен',
  'quiz': 'Викторина',
  'default': 'Мероприятие'
}; 

/**
 * Безопасно форматирует дату события
 */
const formatEventDate = (event: Event): string => {
  // Сначала пытаемся использовать start_at (новое поле)
  if (isValidDateString(event.start_at)) {
    try {
      return formatRussianDate(event.start_at, 'd MMMM');
    } catch (error) {
      console.error('Error formatting start_at:', event.start_at, error);
    }
  }
  
  // Fallback на legacy поле start_time
  if (isValidDateString(event.start_time)) {
    try {
      return formatRussianDate(event.start_time!, 'd MMMM');
    } catch (error) {
      console.error('Error formatting start_time:', event.start_time, error);
    }
  }
  
  // Fallback на legacy поле date
  if (isValidDateString(event.date)) {
    try {
      return formatRussianDate(event.date!, 'd MMMM');
    } catch (error) {
      console.error('Error formatting date:', event.date, error);
    }
  }
  
  return 'Дата не указана';
};

/**
 * Безопасно форматирует временной диапазон
 */
const formatEventTimeRange = (
  event: Event, 
  customFormatTimeRange?: (start: string, end: string) => string
): string => {
  try {
    // Сначала пытаемся использовать start_at/end_at (новые поля)
    if (event.start_at && event.end_at) {
      if (customFormatTimeRange) {
        return customFormatTimeRange(event.start_at, event.end_at);
      }
      return formatTimeRange(event.start_at, event.end_at);
    }
    
    // Fallback на legacy поля
    if (event.start_time && event.end_time) {
      if (customFormatTimeRange) {
        return customFormatTimeRange(event.start_time, event.end_time);
      }
      return formatTimeRange(event.start_time, event.end_time);
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting time range in EventsList:', error);
    return '';
  }
};

/**
 * Форматирует цену мероприятия
 */
const formatPrice = (event: Event): string => {
  try {
    if (event.payment_type === 'free') return 'Бесплатно';
    if (event.payment_type === 'donation') return 'Донейшн';
    if (event.price === null || event.price === undefined) return 'Подробнее';
    if (event.price && event.currency) {
      return `${event.price} ${event.currency}`;
    }
    return 'Цена не указана';
  } catch (error) {
    console.error('Error formatting price:', error);
    return 'Цена не указана';
  }
};

const EventsList = ({
  events,
  type = 'upcoming',
  searchQuery = '',
  viewMode = 'grid',
  showPrice = false,
  className = '',
  formatTimeRange: customFormatTimeRange
}: EventsListProps) => {
  const filteredEvents = events.filter(event => {
    const searchLower = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchLower) ||
      (event.description && event.description.toLowerCase().includes(searchLower))
    );
  });

  if (filteredEvents.length === 0) {
    return (
      <div className={`py-12 text-center ${className}`}>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          {searchQuery 
            ? 'По вашему запросу ничего не найдено'
            : 'Мероприятий пока нет'}
        </p>
      </div>
    );
  }

  const getTranslatedEventType = (type: string) => {
    const normalizedType = type.toLowerCase().replace(/-/g, '_');
    return EVENT_TYPE_MAP[normalizedType] || EVENT_TYPE_MAP['default'];
  };

  return (
    <div className={`${className} ${type === 'upcoming' ? 'upcoming-events' : 'past-events'}`}>
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredEvents.map(event => (
            <div key={event.id} className="card hover:shadow-md transition-shadow flex flex-col md:flex-row relative">
              {/* Кнопка избранного для списка */}
              <div className="absolute top-3 right-3 z-10">
                <EventFavoriteButton
                  eventId={event.id.toString()}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-sm"
                  size="sm"
                />
              </div>

              <div 
                className="md:w-1/3 h-48 md:h-auto bg-cover bg-center relative"
                style={{ backgroundImage: `url(${getSupabaseImageUrl(event.bg_image)})` }}
              >
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Users className="h-4 w-4 mr-1.5" />
                    {event.age_category}
                  </span>
                </div>
              </div>
              
              <div className="p-5 md:w-2/3 flex flex-col">
                <div className="flex-grow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {event.languages?.map((lang, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <Globe className="h-4 w-4 mr-1.5" />
                        {lang}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      <Tag className="h-4 w-4 mr-1.5" />
                      {getTranslatedEventType(event.event_type)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatEventDate(event)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatEventTimeRange(event, customFormatTimeRange)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="mb-4 text-gray-600 dark:text-gray-300 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  {showPrice && event.payment_type && (
                    <div className="font-medium text-primary-600 dark:text-primary-400">
                      {formatPrice(event)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link 
                      to={`/events/${event.id}`}
                      className="btn btn-primary"
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(event => (
            <div key={event.id} className="card group overflow-hidden hover:shadow-md transition-shadow relative">
              {/* Кнопка избранного для сетки */}
              <div className="absolute top-3 right-3 z-10">
                <EventFavoriteButton
                  eventId={event.id.toString()}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-sm"
                  size="sm"
                />
              </div>

              <Link to={`/events/${event.id}`}>
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${getSupabaseImageUrl(event.bg_image)})` }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium flex items-center">
                      Подробнее <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {event.age_category}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {event.languages?.slice(0, 2).map((lang, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        {lang}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      {getTranslatedEventType(event.event_type)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{formatEventDate(event)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{formatEventTimeRange(event, customFormatTimeRange)}</span>
                    </div>
                  </div>
                  
                  {showPrice && event.payment_type && (
                    <div className="mt-3 font-medium text-primary-600 dark:text-primary-400">
                      {formatPrice(event)}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsList;
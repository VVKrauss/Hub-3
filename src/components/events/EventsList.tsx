import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Globe, Tag, DollarSign } from 'lucide-react';
import { 
  EventType, 
  PaymentType, 
  Language,
  EventStatus,
  EVENT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  LANGUAGE_LABELS,
  STATUS_LABELS,
  mapLegacyEventType,
  mapLegacyPaymentType,
  mapLegacyLanguage
} from '../../pages/admin/constants';
import { 
  getEventTypeLabel,
  getPaymentTypeLabel,
  getLanguageLabel,
  formatLanguages,
  formatPrice,
  migrateEventToModern
} from '../../utils/migrationUtils';
import { formatTimeFromTimestamp, formatRussianDate } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

// Обновленный интерфейс Event с новыми типами
interface Event {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  event_type: EventType | string; // Может быть legacy значение
  status: EventStatus | string;
  payment_type: PaymentType | string;
  languages: Language[] | string[];
  bg_image?: string;
  price?: number | null;
  currency?: string;
  age_category?: string;
  location?: string;
  speakers?: string[];
  // Новые поля времени
  start_at?: string;
  end_at?: string;
  // Legacy поля для обратной совместимости
  date?: string;
  start_time?: string;
  end_time?: string;
}

interface EventsListProps {
  events: Event[];
  type?: 'upcoming' | 'past';
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
  showPrice?: boolean;
  showLanguages?: boolean;
  showType?: boolean;
  showAge?: boolean;
  showSpeakers?: boolean;
  className?: string;
  formatTimeRange?: (start: string, end: string) => string;
}

// Мапинг типов событий для отображения в старом формате (если нужно)
const EVENT_TYPE_MAP: Record<string, string> = {
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
  'other': 'Другое',
  'default': 'Мероприятие'
};

/**
 * Безопасно форматирует дату события с поддержкой новых и legacy полей
 */
const formatEventDate = (event: Event): string => {
  try {
    // Сначала пытаемся использовать start_at (новое поле)
    if (event.start_at) {
      return formatRussianDate(event.start_at);
    }
    
    // Fallback на legacy поле date
    if (event.date) {
      return formatRussianDate(event.date);
    }
    
    return 'Дата не указана';
  } catch (error) {
    console.error('Error formatting event date:', error);
    return 'Дата не указана';
  }
};

/**
 * Безопасно форматирует время события с поддержкой новых и legacy полей
 */
const formatEventTime = (
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
    
    return 'Время не указано';
  } catch (error) {
    console.error('Error formatting time range in EventsList:', error);
    return 'Время не указано';
  }
};

/**
 * Форматирует диапазон времени из timestamp'ов
 */
const formatTimeRange = (start: string, end: string): string => {
  try {
    const startTime = formatTimeFromTimestamp(start);
    const endTime = formatTimeFromTimestamp(end);
    return `${startTime} - ${endTime}`;
  } catch (error) {
    console.error('Error formatting time range:', error);
    return '';
  }
};

/**
 * Безопасно форматирует тип события
 */
const formatEventType = (eventType: string): string => {
  try {
    return getEventTypeLabel(eventType);
  } catch (error) {
    console.error('Error formatting event type:', error);
    return eventType || 'Мероприятие';
  }
};

/**
 * Безопасно форматирует цену мероприятия
 */
const formatEventPrice = (event: Event): string => {
  try {
    return formatPrice(
      event.payment_type || 'free',
      event.price,
      event.currency
    );
  } catch (error) {
    console.error('Error formatting price:', error);
    return 'Цена не указана';
  }
};

/**
 * Безопасно форматирует языки мероприятия
 */
const formatEventLanguages = (languages: string[] | undefined): string => {
  try {
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return 'Не указано';
    }
    
    return formatLanguages(languages);
  } catch (error) {
    console.error('Error formatting languages:', error);
    return 'Не указано';
  }
};

/**
 * Получает URL изображения события
 */
const getEventImageUrl = (bgImage?: string): string => {
  if (!bgImage) {
    return 'https://via.placeholder.com/400x200?text=Без+изображения';
  }
  
  try {
    return getSupabaseImageUrl(bgImage);
  } catch (error) {
    console.error('Error getting image URL:', error);
    return 'https://via.placeholder.com/400x200?text=Ошибка+загрузки';
  }
};

/**
 * Мигрирует событие к современному формату для безопасного отображения
 */
const ensureModernEvent = (event: Event): Event => {
  try {
    // Если событие уже в современном формате, возвращаем как есть
    if (event.start_at && 
        ['lecture', 'workshop', 'discussion', 'conference', 'seminar', 'festival', 'concert', 'standup', 'excursion', 'quiz', 'swap', 'other'].includes(event.event_type as string) &&
        ['free', 'paid', 'donation'].includes(event.payment_type as string)) {
      return event;
    }
    
    // Иначе мигрируем
    return migrateEventToModern(event as any);
  } catch (error) {
    console.error('Error migrating event:', error);
    // Возвращаем исходное событие в случае ошибки
    return event;
  }
};

const EventsList: React.FC<EventsListProps> = ({
  events,
  type = 'upcoming',
  searchQuery = '',
  viewMode = 'grid',
  showPrice = false,
  showLanguages = true,
  showType = true,
  showAge = true,
  showSpeakers = false,
  className = '',
  formatTimeRange: customFormatTimeRange
}) => {
  // Мигрируем и фильтруем события
  const processedEvents = events
    .map(ensureModernEvent) // Мигрируем к современному формату
    .filter(event => {
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.short_description && event.short_description.toLowerCase().includes(searchLower)) ||
        getEventTypeLabel(event.event_type as string).toLowerCase().includes(searchLower) ||
        (event.location && event.location.toLowerCase().includes(searchLower))
      );
    });

  if (processedEvents.length === 0) {
    return (
      <div className={`py-12 text-center ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="mb-4 p-4 bg-gray-100 dark:bg-dark-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'Ничего не найдено' : 'Мероприятий пока нет'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить поисковый запрос.`
              : type === 'upcoming' 
                ? 'Скоро здесь появятся новые мероприятия'
                : 'Прошедших мероприятий пока нет'}
          </p>
        </div>
      </div>
    );
  }


  // ============================= /1 =============================

  // ============================= 2 =============================
  
  
  
return (
    <div className={`${className} ${type === 'upcoming' ? 'upcoming-events' : 'past-events'}`}>
      {viewMode === 'list' ? (
        // List режим
        <div className="space-y-4">
          {processedEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="block bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Изображение */}
                <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0">
                  <img
                    src={getEventImageUrl(event.bg_image)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/400x200?text=Без+изображения';
                    }}
                  />
                </div>
                
                {/* Контент */}
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      {/* Заголовок и описание */}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      
                      {event.short_description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                          {event.short_description}
                        </p>
                      )}
                      
                      {/* Метаинформация */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {/* Дата и время */}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatEventDate(event)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatEventTime(event, customFormatTimeRange)}</span>
                        </div>
                        
                        {/* Локация */}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Правая секция с дополнительной информацией */}
                    <div className="flex flex-col gap-2 text-sm">
                      {/* Тип события */}
                      {showType && (
                        <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                          <Tag className="h-4 w-4" />
                          <span>{formatEventType(event.event_type as string)}</span>
                        </div>
                      )}
                      
                      {/* Возрастная категория */}
                      {showAge && event.age_category && (
                        <div className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium">{event.age_category}</span>
                        </div>
                      )}
                      
                      {/* Языки */}
                      {showLanguages && (
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Globe className="h-4 w-4" />
                          <span>{formatEventLanguages(event.languages as string[])}</span>
                        </div>
                      )}
                      
                      {/* Цена */}
                      {showPrice && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatEventPrice(event)}</span>
                        </div>
                      )}
                      
                      {/* Количество спикеров */}
                      {showSpeakers && event.speakers && event.speakers.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>{event.speakers.length} спикер{event.speakers.length !== 1 ? (event.speakers.length > 4 ? 'ов' : 'а') : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Grid режим
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 overflow-hidden"
            >
              {/* Изображение */}
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={getEventImageUrl(event.bg_image)}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x200?text=Без+изображения';
                  }}
                />
                
                {/* Бейджи поверх изображения */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                  {/* Тип события */}
                  {showType && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                      {formatEventType(event.event_type as string)}
                    </span>
                  )}
                  
                  {/* Возрастная категория */}
                  {showAge && event.age_category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {event.age_category}
                    </span>
                  )}
                </div>
                
                {/* Цена в углу */}
                {showPrice && (
                  <div className="absolute bottom-3 right-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {formatEventPrice(event)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Контент карточки */}
              <div className="p-4">
                {/* Заголовок */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {event.title}
                </h3>
                
                {/* Краткое описание */}
                {event.short_description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                    {event.short_description}
                  </p>
                )}
                
                {/* Метаинформация */}
                <div className="space-y-2">
                  {/* Дата и время */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{formatEventDate(event)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{formatEventTime(event, customFormatTimeRange)}</span>
                  </div>
                  
                  {/* Локация */}
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  
                  {/* Языки */}
                  {showLanguages && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{formatEventLanguages(event.languages as string[])}</span>
                    </div>
                  )}
                  
                  {/* Спикеры */}
                  {showSpeakers && event.speakers && event.speakers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {event.speakers.length} спикер{event.speakers.length !== 1 ? (event.speakers.length > 4 ? 'ов' : 'а') : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsList;
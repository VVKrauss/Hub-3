// src/components/events/EventsList.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы и API

import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Calendar, MapPin, Users, Clock } from 'lucide-react';
import EventCard from './EventCard';
import { getEvents } from '../../api/events';
import type { EventWithDetails, EventFilters, ShEventType, ShEventStatus } from '../../types/database';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';

interface EventsListProps {
  initialFilters?: Partial<EventFilters>;
  showFilters?: boolean;
  showSearch?: boolean;
  showViewToggle?: boolean;
  title?: string;
  limit?: number;
  compact?: boolean;
  className?: string;
}

const EventsList: React.FC<EventsListProps> = ({
  initialFilters = {},
  showFilters = true,
  showSearch = true,
  showViewToggle = true,
  title = 'Мероприятия',
  limit,
  compact = false,
  className = ''
}) => {
  // Функции форматирования
  const formatDate = (dateString: string): string => {
    return formatRussianDate(dateString, 'd MMMM yyyy');
  };

  const formatTime = (dateString: string): string => {
    return formatTimeFromTimestamp(dateString);
  };

  // Состояние
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Фильтры
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    event_types: [],
    statuses: ['active'], // По умолчанию показываем только активные события
    location_types: [],
    payment_types: [],
    date_from: '',
    date_to: '',
    is_featured: undefined,
    has_available_spots: undefined,
    ...initialFilters
  });

  // Загрузка событий
  const fetchEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getEvents(filters, pageNum, limit || 20);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        if (append) {
          setEvents(prev => [...prev, ...result.data!]);
        } else {
          setEvents(result.data);
        }
        
        setHasMore(result.hasMore);
        setTotal(result.total);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Ошибка при загрузке мероприятий');
    } finally {
      setLoading(false);
    }
  };

  // Эффекты
  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [filters]);

  // Обработчики
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      event_types: [],
      statuses: ['active'],
      location_types: [],
      payment_types: [],
      date_from: '',
      date_to: '',
      is_featured: undefined,
      has_available_spots: undefined,
      ...initialFilters
    });
  };

  // Типы событий для фильтра
  const eventTypes: { value: ShEventType; label: string }[] = [
    { value: 'lecture', label: 'Лекция' },
    { value: 'workshop', label: 'Мастер-класс' },
    { value: 'conference', label: 'Конференция' },
    { value: 'seminar', label: 'Семинар' },
    { value: 'festival', label: 'Фестиваль' },
    { value: 'discussion', label: 'Обсуждение' },
    { value: 'concert', label: 'Концерт' },
    { value: 'standup', label: 'Стендап' },
    { value: 'excursion', label: 'Экскурсия' },
    { value: 'quiz', label: 'Квиз' },
    { value: 'swap', label: 'Обмен' },
    { value: 'movie_discussion', label: 'Обсуждение фильма' },
    { value: 'conversation_club', label: 'Разговорный клуб' },
    { value: 'other', label: 'Другое' }
  ];

  // Статусы событий
  const eventStatuses: { value: ShEventStatus; label: string }[] = [
    { value: 'active', label: 'Активные' },
    { value: 'past', label: 'Прошедшие' },
    { value: 'draft', label: 'Черновики' },
    { value: 'cancelled', label: 'Отмененные' }
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {total > 0 && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Найдено {total} мероприятий
            </p>
          )}
        </div>

        {/* Переключатель вида */}
        {showViewToggle && (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Поиск */}
      {showSearch && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск мероприятий..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Фильтры */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Фильтры
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Очистить все
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Тип события */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Тип события
              </label>
              <select
                multiple
                value={filters.event_types}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value as ShEventType);
                  handleFilterChange('event_types', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={4}
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Статус */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статус
              </label>
              <select
                multiple
                value={filters.statuses}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value as ShEventStatus);
                  handleFilterChange('statuses', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={4}
              >
                {eventStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Дата от */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата от
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Дата до */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата до
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Тип проведения */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Формат
              </label>
              <select
                multiple
                value={filters.location_types}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('location_types', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={3}
              >
                <option value="physical">Офлайн</option>
                <option value="online">Онлайн</option>
                <option value="hybrid">Гибридный</option>
              </select>
            </div>

            {/* Тип оплаты */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Стоимость
              </label>
              <select
                multiple
                value={filters.payment_types}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('payment_types', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={3}
              >
                <option value="free">Бесплатно</option>
                <option value="paid">Платно</option>
                <option value="donation">По донации</option>
              </select>
            </div>
          </div>

          {/* Дополнительные фильтры */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.is_featured === true}
                onChange={(e) => handleFilterChange('is_featured', e.target.checked ? true : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Только рекомендуемые</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.has_available_spots === true}
                onChange={(e) => handleFilterChange('has_available_spots', e.target.checked ? true : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Только с доступными местами</span>
            </label>
          </div>
        </div>
      )}

      {/* Состояния загрузки и ошибок */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchEvents(1, false)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading && events.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Загрузка мероприятий...</p>
          </div>
        </div>
      )}

      {/* Список событий */}
      {events.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className={`grid gap-6 ${
              compact 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact={compact}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </div>
          )}

          {/* Кнопка "Загрузить еще" */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Загрузка...
                  </>
                ) : (
                  'Загрузить еще'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Пустое состояние */}
      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Мероприятия не найдены
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Попробуйте изменить фильтры или поисковый запрос
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Очистить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

// Компонент элемента списка (для режима списка)
const EventListItem: React.FC<{ event: EventWithDetails }> = ({ event }) => {
  const isEventInPast = () => {
    return new Date(event.end_at) < new Date();
  };

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {/* Изображение */}
        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="inline-flex items-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-sm font-medium">
                  {getEventTypeLabel(event.event_type)}
                </span>
                {isEventInPast() && (
                  <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded text-sm">
                    Завершено
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                <a href={`/events/${event.slug || event.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                  {event.title}
                </a>
              </h3>

              {event.short_description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                  {event.short_description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(event.start_at)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTime(event.start_at)}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {event.location_type === 'online' ? 'Онлайн' : (event.venue_name || 'Офлайн')}
                </div>
                {(event.max_attendees || event.registrations_count > 0) && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {event.registrations_count || 0}
                    {event.max_attendees && ` из ${event.max_attendees}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsList;
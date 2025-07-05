// src/pages/EventsPage.tsx - НОВАЯ ВЕРСИЯ с современным дизайном

import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { getEvents } from '../api/events';
import { getSupabaseImageUrl } from '../utils/imageUtils';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import type { EventWithDetails } from '../types/database';
import { Link } from 'react-router-dom';

type ViewMode = 'grid' | 'list';
type SortOption = 'date_asc' | 'date_desc' | 'title_asc' | 'title_desc';

const EventsPage = () => {
  // Состояние
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры и сортировка
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Загрузка событий
  const fetchEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const filters = {
        search: searchQuery,
        event_type: selectedTypes,
        status: ['active', 'past'] as const
      };

      const result = await getEvents(filters, pageNum, 12);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        if (append) {
          setEvents(prev => [...prev, ...result.data]);
        } else {
          setEvents(result.data);
        }
        setHasMore(result.hasNext);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Ошибка при загрузке мероприятий');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Эффекты
  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [searchQuery, selectedTypes, sortBy]);

  // Обработчики
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSearchQuery('');
  };

  // Получаем уникальные типы событий
  const eventTypes = Array.from(new Set(events.map(e => e.event_type)));

  // Фильтрация и сортировка
  const filteredAndSortedEvents = events
    .filter(event => {
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return event.title.toLowerCase().includes(query) ||
               event.description?.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        case 'date_desc':
          return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  if (loading && page === 1) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchEvents(1, false)}
              className="btn-primary"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Заголовок страницы */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-4">Мероприятия</h1>
          <p className="text-xl opacity-90">
            Открывайте новые знания вместе с нами
          </p>
        </div>
      </div>

      <main className="bg-gray-50 dark:bg-dark-900 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Панель управления */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 mb-8">
            {/* Поиск и кнопки */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Поиск */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск мероприятий..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Кнопки управления */}
              <div className="flex gap-3">
                {/* Фильтры */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    selectedTypes.length > 0
                      ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900 dark:border-primary-600 dark:text-primary-300'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                  Фильтры
                  {selectedTypes.length > 0 && (
                    <span className="bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {selectedTypes.length}
                    </span>
                  )}
                </button>

                {/* Сортировка */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date_asc">Дата: сначала ближайшие</option>
                  <option value="date_desc">Дата: сначала дальние</option>
                  <option value="title_asc">Название: А-Я</option>
                  <option value="title_desc">Название: Я-А</option>
                </select>

                {/* Вид отображения */}
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 ${viewMode === 'grid' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 ${viewMode === 'list' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex flex-wrap gap-3 mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white w-full mb-2">
                    Типы мероприятий:
                  </h3>
                  {eventTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => handleTypeToggle(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-primary-600 dark:text-primary-400 text-sm hover:underline"
                  >
                    Очистить фильтры
                  </button>
                )}
              </div>
            )}

            {/* Активные фильтры */}
            {selectedTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTypes.map(type => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    {type}
                    <button
                      onClick={() => handleTypeToggle(type)}
                      className="hover:text-primary-900 dark:hover:text-primary-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Список событий */}
          {filteredAndSortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Мероприятия не найдены
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Попробуйте изменить фильтры или поисковый запрос
              </p>
              <button
                onClick={clearFilters}
                className="btn-primary"
              >
                Очистить фильтры
              </button>
            </div>
          ) : (
            <>
              {/* Сетка событий */}
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
              }>
                {filteredAndSortedEvents.map(event => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Кнопка "Загрузить еще" */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        </div>
      </main>
    </Layout>
  );
};

// Компонент карточки события
const EventCard = ({ event, viewMode }: { 
  event: EventWithDetails; 
  viewMode: ViewMode 
}) => {
  const isGridMode = viewMode === 'grid';
  const isPast = new Date(event.end_at) < new Date();

  if (isGridMode) {
    return (
      <Link 
        to={`/events/${event.id}`}
        className="group bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      >
        {/* Изображение */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.cover_image_url 
              ? getSupabaseImageUrl(event.cover_image_url)
              : 'https://via.placeholder.com/400x200?text=No+Image'
            }
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isPast && (
            <div className="absolute top-3 left-3 bg-gray-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
              Завершено
            </div>
          )}
          <div className="absolute top-3 right-3 bg-primary-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
            {event.event_type}
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {event.title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {event.short_description || event.description}
          </p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              {formatRussianDate(event.start_at)}
            </div>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              {formatTimeFromTimestamp(event.start_at)}
            </div>

            {event.venue_name && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-2" />
                {event.venue_name}
              </div>
            )}

            {event.registrations_count !== undefined && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2" />
                {event.registrations_count} участников
              </div>
            )}
          </div>

          {/* Цена */}
          {event.payment_type === 'paid' && event.base_price > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {event.base_price} {event.currency}
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Режим списка
  return (
    <Link 
      to={`/events/${event.id}`}
      className="group bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 flex gap-6"
    >
      {/* Изображение */}
      <div className="relative w-32 h-24 flex-shrink-0 overflow-hidden rounded-lg">
        <img
          src={event.cover_image_url 
            ? getSupabaseImageUrl(event.cover_image_url)
            : 'https://via.placeholder.com/200x150?text=No+Image'
          }
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isPast && (
          <div className="absolute top-1 left-1 bg-gray-500 text-white px-1 py-0.5 rounded text-xs">
            Завершено
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {event.title}
          </h3>
          <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg text-xs font-medium">
            {event.event_type}
          </span>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
          {event.short_description || event.description}
        </p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatRussianDate(event.start_at)}
          </div>
          
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatTimeFromTimestamp(event.start_at)}
          </div>

          {event.venue_name && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {event.venue_name}
            </div>
          )}

          {event.registrations_count !== undefined && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {event.registrations_count} участников
            </div>
          )}

          {event.payment_type === 'paid' && event.base_price > 0 && (
            <div className="font-bold text-primary-600 dark:text-primary-400">
              {event.base_price} {event.currency}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventsPage;
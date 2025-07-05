// src/pages/EventsPage.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Grid, List, Search, Filter, ChevronDown, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

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

const LANGUAGE_LABELS: Record<string, string> = {
  'sr': 'Српски',
  'en': 'English',
  'ru': 'Русский',
  'Русский': 'Русский',
  'Английский': 'English',
  'Сербский': 'Српски'
};

// ФУНКЦИИ ДЛЯ ПРАВИЛЬНОГО ОТОБРАЖЕНИЯ ДАННЫХ
const getEventPrice = (event: any): string => {
  if (event.payment_type === 'free') return 'Бесплатно';
  if (event.payment_type === 'donation') return 'Донейшн';
  
  if (event.payment_type === 'paid') {
    if (event.base_price && event.base_price > 0) {
      return `${event.base_price} ${event.currency || 'RSD'}`;
    }
    if (event.price && event.price > 0) {
      return `${event.price} ${event.currency || 'RSD'}`;
    }
    return 'Цена уточняется';
  }
  
  if (event.price === 0 || event.price === null) return 'Бесплатно';
  if (event.price && event.price > 0) {
    return `${event.price} ${event.currency || 'RSD'}`;
  }
  return 'Бесплатно';
};

const getEventTypeLabel = (eventType: string): string => {
  return EVENT_TYPE_LABELS[eventType] || eventType;
};

const getEventLanguage = (event: any): string => {
  if (event.language_code) {
    return LANGUAGE_LABELS[event.language_code] || event.language_code;
  }
  if (event.languages && Array.isArray(event.languages) && event.languages.length > 0) {
    const firstLang = event.languages[0];
    return LANGUAGE_LABELS[firstLang] || firstLang;
  }
  return 'Не указан';
};

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'title' | 'price' | 'popularity';

interface EventWithDetails {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  start_at: string;
  end_at: string;
  event_type: string;
  payment_type: string;
  base_price?: number;
  price?: number;
  currency: string;
  cover_image_url?: string;
  bg_image?: string;
  venue_name?: string;
  language_code?: string;
  languages?: string[];
  registrations_count?: number;
  status: string;
  age_category?: string;
}

const EventsPage = () => {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [filteredAndSortedEvents, setFilteredAndSortedEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    eventType: '',
    paymentType: '',
    dateRange: '',
    showPast: false
  });
  const [showFilters, setShowFilters] = useState(false);

  // Загрузка событий
  const fetchEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('sh_events')
        .select(`
          id, title, short_description, description, start_at, end_at, 
          event_type, payment_type, base_price, currency, cover_image_url,
          venue_name, language_code, status, age_category
        `)
        .eq('is_public', true)
        .order('start_at', { ascending: false })
        .range((pageNum - 1) * 20, pageNum * 20 - 1);

      // Фильтр по статусу (показывать прошедшие или нет)
      if (!filters.showPast) {
        query = query.eq('status', 'active');
      }

      const { data: newEvents, error } = await query;

      if (error) {
        // Fallback к старой таблице events
        let legacyQuery = supabase
          .from('events')
          .select('*')
          .order('start_at', { ascending: false })
          .range((pageNum - 1) * 20, pageNum * 20 - 1);

        if (!filters.showPast) {
          legacyQuery = legacyQuery.eq('status', 'active');
        }

        const { data: legacyEvents, error: legacyError } = await legacyQuery;
        
        if (legacyError) throw legacyError;
        
        if (append) {
          setEvents(prev => [...prev, ...(legacyEvents || [])]);
        } else {
          setEvents(legacyEvents || []);
        }
        setHasMore((legacyEvents || []).length === 20);
      } else {
        if (append) {
          setEvents(prev => [...prev, ...(newEvents || [])]);
        } else {
          setEvents(newEvents || []);
        }
        setHasMore((newEvents || []).length === 20);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Фильтрация и сортировка
  useEffect(() => {
    let filtered = [...events];

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Фильтры
    if (filters.eventType) {
      filtered = filtered.filter(event => event.event_type === filters.eventType);
    }

    if (filters.paymentType) {
      filtered = filtered.filter(event => event.payment_type === filters.paymentType);
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'price':
          const priceA = a.base_price || a.price || 0;
          const priceB = b.base_price || b.price || 0;
          return priceA - priceB;
        default:
          return 0;
      }
    });

    setFilteredAndSortedEvents(filtered);
  }, [events, searchQuery, filters, sortBy]);

  useEffect(() => {
    fetchEvents();
  }, [filters.showPast]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      eventType: '',
      paymentType: '',
      dateRange: '',
      showPast: false
    });
  };

  // Компонент карточки события
  const EventCard = ({ event, viewMode }: { event: EventWithDetails; viewMode: ViewMode }) => {
    const isGridMode = viewMode === 'grid';
    const isPast = new Date(event.end_at || event.start_at) < new Date();

    if (isGridMode) {
      return (
        <Link 
          to={`/events/${event.id}`}
          className="group bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="relative h-48 overflow-hidden">
            <img
              src={event.cover_image_url 
                ? getSupabaseImageUrl(event.cover_image_url)
                : event.bg_image 
                  ? getSupabaseImageUrl(event.bg_image)
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
              {getEventTypeLabel(event.event_type)}
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {event.title}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {event.short_description || event.description}
            </p>

            <div className="space-y-2 mb-4">
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

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {getEventPrice(event)}
              </span>
            </div>
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
        <div className="relative w-32 h-24 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={event.cover_image_url 
              ? getSupabaseImageUrl(event.cover_image_url)
              : event.bg_image 
                ? getSupabaseImageUrl(event.bg_image)
                : 'https://via.placeholder.com/150x100?text=No+Image'
            }
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {isPast && (
            <div className="absolute top-1 left-1 bg-gray-500 text-white px-1 py-0.5 rounded text-xs">
              Завершено
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 pr-4">
              {event.title}
            </h3>
            
            <span className="inline-block px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded text-xs font-medium whitespace-nowrap">
              {getEventTypeLabel(event.event_type)}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {event.short_description || event.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatRussianDate(event.start_at)}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTimeFromTimestamp(event.start_at)}
              </div>

              {event.venue_name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.venue_name}
                </div>
              )}

              {event.registrations_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.registrations_count} участников
                </div>
              )}
            </div>

            <span className="text-lg font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
              {getEventPrice(event)}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-dark-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Мероприятия
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Присоединяйтесь к нашим событиям и расширяйте кругозор
            </p>
          </div>

          {/* Панель управления */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 mb-8">
            {/* Поиск и управление видом */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Поиск мероприятий..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Переключатель вида */}
                <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-dark-600 text-primary-600 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-dark-600 text-primary-600 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>

                {/* Кнопка фильтров */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Тип события */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Тип события
                    </label>
                    <select
                      value={filters.eventType}
                      onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="">Все типы</option>
                      <option value="lecture">Лекция</option>
                      <option value="workshop">Мастер-класс</option>
                      <option value="conference">Конференция</option>
                      <option value="seminar">Семинар</option>
                      <option value="discussion">Дискуссия</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>

                  {/* Тип оплаты */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Стоимость
                    </label>
                    <select
                      value={filters.paymentType}
                      onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="">Все</option>
                      <option value="free">Бесплатно</option>
                      <option value="paid">Платное</option>
                      <option value="donation">Донейшн</option>
                    </select>
                  </div>

                  {/* Сортировка */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Сортировка
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="date">По дате</option>
                      <option value="title">По названию</option>
                      <option value="price">По цене</option>
                    </select>
                  </div>

                  {/* Показать прошедшие */}
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.showPast}
                        onChange={(e) => setFilters(prev => ({ ...prev, showPast: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Показать прошедшие
                      </span>
                    </label>
                  </div>
                </div>

                {/* Кнопка очистки фильтров */}
                {(searchQuery || filters.eventType || filters.paymentType || filters.showPast) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                      Очистить все фильтры
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Список событий */}
          {filteredAndSortedEvents.length > 0 ? (
            <>
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
          ) : (
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
          )}
        </div>
      </main>
    </Layout>
  );
};

export default EventsPage;
    
// src/pages/EventsPage.tsx - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ без дёрганья
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Grid, List, Search, Filter, ChevronDown, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { UnifiedLoadingPageWrapper, LoadingSpinner } from '../components/ui/UnifiedLoading';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

// Типы
type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'title' | 'price' | 'popularity';

interface EventWithDetails {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  start_at: string;
  end_at?: string;
  event_type: string;
  payment_type: string;
  base_price?: number;
  price?: number;
  currency?: string;
  cover_image_url?: string;
  venue_name?: string;
  location_type?: string;
  address?: string;
  language_code?: string;
  age_category?: string;
  status: string;
  registrations_count?: number;
  is_featured?: boolean;
}

// Константы
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
};

// Утилиты
const getEventPrice = (event: EventWithDetails): string => {
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
  
  return 'Бесплатно';
};

const getEventTypeLabel = (eventType: string): string => {
  return EVENT_TYPE_LABELS[eventType] || eventType;
};

const getEventImage = (event: EventWithDetails): string => {
  if (event.cover_image_url) {
    return getSupabaseImageUrl(event.cover_image_url);
  }
  return 'https://via.placeholder.com/400x200?text=No+Image';
};

// Компонент карточки события
const EventCard = React.memo(({ event, viewMode }: { event: EventWithDetails; viewMode: ViewMode }) => {
  if (viewMode === 'list') {
    return (
      <Link to={`/events/${event.id}`} className="block">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
          <div className="flex">
            <div className="w-48 h-32 flex-shrink-0">
              <img
                src={getEventImage(event)}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {event.title}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatRussianDate(event.start_at)}
                </span>
              </div>
              
              {event.short_description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                  {event.short_description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTimeFromTimestamp(event.start_at)}
                  </span>
                  {event.venue_name && (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {event.venue_name}
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {getEventPrice(event)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/events/${event.id}`} className="block group">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className="aspect-video overflow-hidden">
          <img
            src={getEventImage(event)}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
              {getEventTypeLabel(event.event_type)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatRussianDate(event.start_at)}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {event.title}
          </h3>
          
          {event.short_description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
              {event.short_description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatTimeFromTimestamp(event.start_at)}
            </span>
            {event.venue_name && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {event.venue_name}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {event.registrations_count !== undefined && (
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <Users className="h-4 w-4 mr-1" />
                {event.registrations_count} участников
              </div>
            )}
            
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {getEventPrice(event)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});

// Основной компонент
const EventsPage = () => {
  // 🎯 ЕДИНОЕ состояние для устранения дёрганья
  const [pageState, setPageState] = useState<{
    events: EventWithDetails[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    page: number;
  }>({
    events: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: true,
    page: 1
  });

  // UI состояния
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

  // 🚀 Оптимизированная функция загрузки
  const fetchEvents = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) {
        setPageState(prev => ({ ...prev, loading: true, error: null }));
      } else {
        setPageState(prev => ({ ...prev, loadingMore: true }));
      }

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

      if (!filters.showPast) {
        query = query.eq('status', 'active');
      }

      const { data: newEvents, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        throw new Error('Ошибка загрузки мероприятий');
      }

      const eventsData = newEvents || [];
      
      // ✅ ЕДИНОЕ обновление состояния
      setPageState(prev => ({
        ...prev,
        events: append ? [...prev.events, ...eventsData] : eventsData,
        loading: false,
        loadingMore: false,
        hasMore: eventsData.length === 20,
        page: pageNum,
        error: null
      }));

    } catch (error: any) {
      console.error('Error in fetchEvents:', error);
      setPageState(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
        error: error.message || 'Ошибка загрузки мероприятий'
      }));
    }
  }, [filters.showPast]);

  // 🎨 Мемоизированная фильтрация и сортировка
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...pageState.events];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.short_description?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
    }

    // Фильтр по типу события
    if (filters.eventType) {
      filtered = filtered.filter(event => event.event_type === filters.eventType);
    }

    // Фильтр по типу оплаты
    if (filters.paymentType) {
      filtered = filtered.filter(event => event.payment_type === filters.paymentType);
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
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

    return filtered;
  }, [pageState.events, searchQuery, filters, sortBy]);

  // Эффекты
  useEffect(() => {
    fetchEvents(1, false);
  }, [fetchEvents]);

  // Обработчики
  const handleLoadMore = useCallback(() => {
    if (!pageState.loadingMore && pageState.hasMore) {
      const nextPage = pageState.page + 1;
      fetchEvents(nextPage, true);
    }
  }, [fetchEvents, pageState.loadingMore, pageState.hasMore, pageState.page]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({
      eventType: '',
      paymentType: '',
      dateRange: '',
      showPast: false
    });
    setSortBy('date');
  }, []);

  const hasActiveFilters = () => {
    return searchQuery || filters.eventType || filters.paymentType || filters.dateRange || filters.showPast;
  };

  // 🎯 ЕДИНЫЙ лоадер вместо множественных
  return (
    <Layout disablePageTransition={true}>
      <UnifiedLoadingPageWrapper
        loading={pageState.loading && pageState.events.length === 0}
        error={pageState.error}
        loadingText="Загружаем мероприятия..."
      >
        <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Мероприятия
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Присоединяйтесь к увлекательным событиям нашего сообщества
              </p>
            </div>

            {/* Фильтры и поиск */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Поиск */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Поиск мероприятий..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Кнопки управления */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      showFilters || hasActiveFilters()
                        ? 'bg-primary-600 text-white border-primary-600' 
                        : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    Фильтры
                    {hasActiveFilters() && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        !
                      </span>
                    )}
                  </button>

                  <div className="flex rounded-lg border border-gray-300 dark:border-dark-600 overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-600'
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-600'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Расширенные фильтры */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={filters.eventType}
                      onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Все типы</option>
                      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>

                    <select
                      value={filters.paymentType}
                      onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Все цены</option>
                      <option value="free">Бесплатные</option>
                      <option value="paid">Платные</option>
                      <option value="donation">Донейшн</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="date">По дате</option>
                      <option value="title">По названию</option>
                      <option value="price">По цене</option>
                    </select>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.showPast}
                        onChange={(e) => setFilters(prev => ({ ...prev, showPast: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Показать прошедшие</span>
                    </label>

                    {hasActiveFilters() && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* События */}
            {filteredAndSortedEvents.length === 0 && !pageState.loading ? (
              <div className="text-center py-16">
                <Calendar className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Мероприятия не найдены
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Попробуйте изменить параметры поиска или фильтры
                </p>
                {hasActiveFilters() && (
                  <button
                    onClick={clearFilters}
                    className="btn-primary"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className={`animate-fade-in ${
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                }`}>
                  {filteredAndSortedEvents.map((event) => (
                    <EventCard key={event.id} event={event} viewMode={viewMode} />
                  ))}
                </div>

                {/* Кнопка "Загрузить еще" */}
                {pageState.hasMore && filteredAndSortedEvents.length > 0 && (
                  <div className="mt-8 text-center">
                    {pageState.loadingMore ? (
                      <LoadingSpinner text="Загружаем еще..." />
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        className="btn-outline"
                      >
                        Загрузить еще
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </UnifiedLoadingPageWrapper>
    </Layout>
  );
};

export default EventsPage;
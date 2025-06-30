// src/pages/EventsPage.tsx
// ОБНОВЛЕННАЯ ВЕРСИЯ EventsPage с блоком прошедших мероприятий справа

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';   
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Filter,
  Search,
  Loader2,
  AlertCircle,
  Grid3X3,
  List,  
  Star,
  ExternalLink,
  Eye,
  Heart,
  Share2,
  Download,
  ChevronDown,
  X,
  SortAsc,
  SortDesc,
  CalendarDays,
  Tag,
  DollarSign
} from 'lucide-react';

// Импортируем новые API функции
import { 
  getEvents, 
  getFeaturedEvents, 
  searchEvents, 
  getEventsStats,
  getActiveEvents
} from '../api/events';
import { getPageSettings } from '../api/settings';

// Импортируем компонент слайдшоу
import EventsHeroSlider from '../components/events/EventsHeroSlider';

// Импортируем компонент компактной карточки
import CompactEventCard from '../components/events/CompactEventCard';

// Импортируем компонент пустого состояния
import EmptyEventsState from '../components/events/EmptyEventsState';

// Импортируем типы
import type { 
  EventWithDetails, 
  EventFilters,
  ShEventType,
  ShEventStatus,
  ShAgeCategory,
  ShPaymentType
} from '../types/database';

// Импортируем константы отдельно
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  AGE_CATEGORY_LABELS
} from '../types/database';

// Интерфейсы для компонента
interface EventsPageSettings {
  title: string;
  heroImage?: string;
  defaultView: 'grid' | 'list';
  showFilters: boolean;
  itemsPerPage: number;
  metaDescription?: string;
}

type SortOption = 'date_asc' | 'date_desc' | 'title_asc' | 'title_desc' | 'price_asc' | 'price_desc';

const EventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============ ОСНОВНОЕ СОСТОЯНИЕ ============
  const [allEvents, setAllEvents] = useState<EventWithDetails[]>([]);
  const [activeEvents, setActiveEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventWithDetails[]>([]);
  const [pageSettings, setPageSettings] = useState<EventsPageSettings>({
    title: 'Мероприятия',
    defaultView: 'grid',
    showFilters: true,
    itemsPerPage: 12
  });
  
  // ============ СОСТОЯНИЕ ЗАГРУЗКИ И ОШИБОК ============
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ============ СОСТОЯНИЕ ФИЛЬТРОВ И ПОИСКА ============
  const [filters, setFilters] = useState<EventFilters>({
    status: ['active'] as ShEventStatus[] // Только активные в основной галерее
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // ============ СТАТИСТИКА ============
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    past: 0,
    draft: 0,
    cancelled: 0,
    featured: 0
  });

  // ============ ИЗБРАННОЕ ============
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // ============ EFFECTS ============
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Обновляем URL при изменении поиска
    if (searchQuery) {
      setSearchParams(prev => ({ ...prev, search: searchQuery }));
    } else {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('search');
        return newParams;
      });
    }
  }, [searchQuery, setSearchParams]);

  // ============ ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ============
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Загружаем настройки страницы
      const settingsResult = await getPageSettings('events');
      if (settingsResult.success) {
        setPageSettings(settingsResult.data);
        setViewMode(settingsResult.data.defaultView);
      }

      // Загружаем все события
      const eventsResult = await getEvents({ 
        page: 1, 
        limit: 100, // Загружаем больше для разделения на активные и прошедшие
        filters: { status: ['active', 'past'] } 
      });
      
      if (eventsResult.success && eventsResult.data) {
        const allEventsData = eventsResult.data.events;
        setAllEvents(allEventsData);
        
        // Разделяем события на активные и прошедшие
        const now = new Date();
        const active = allEventsData.filter(event => {
          const eventDate = new Date(event.start_at);
          return eventDate > now && event.status === 'active';
        });
        
        const past = allEventsData.filter(event => {
          const eventDate = new Date(event.start_at);
          return eventDate <= now || event.status === 'past';
        }).slice(0, 10); // Берем только 10 последних прошедших

        setActiveEvents(active);
        setPastEvents(past);
        setHasMore(active.length >= pageSettings.itemsPerPage);
      }

      // Загружаем статистику
      const statsResult = await getEventsStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Загружаем рекомендуемые события для слайдшоу
      const featuredResult = await getFeaturedEvents();
      if (featuredResult.success) {
        setFeaturedEvents(featuredResult.data);
      }

    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // ============ ФУНКЦИИ ФИЛЬТРАЦИИ И ПОИСКА ============
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadInitialData();
      return;
    }

    try {
      setLoading(true);
      const result = await searchEvents({
        query: searchQuery,
        filters: { status: ['active'] }, // Ищем только среди активных
        page: 1,
        limit: pageSettings.itemsPerPage
      });

      if (result.success) {
        setActiveEvents(result.data.events);
        setHasMore(result.data.pagination.hasMore);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, pageSettings.itemsPerPage]);

  // ============ ФУНКЦИИ ОТОБРАЖЕНИЯ ============
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (event: EventWithDetails): string => {
    if (event.payment_type === 'free') return 'Бесплатно';
    if (event.price && event.price > 0) {
      return `${event.price} ${event.currency || 'RUB'}`;
    }
    return 'Цена не указана';
  };

  const getEventTypeLabel = (type?: ShEventType): string => {
    return type ? EVENT_TYPE_LABELS[type] : 'Мероприятие';
  };

 ? 'w-20 h-20 flex-shrink-0' : 'h-48'} bg-gray-200 dark:bg-dark-700 overflow-hidden ${
            isCompact ? 'rounded-md' : ''
          }`}>
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className={isCompact ? 'flex-1 min-w-0' : 'p-6'}>
          {!isCompact && isPast && (
            <div className="mb-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-full">
                Прошедшее
              </span>
            </div>
          )}
          
          <h3 className={`font-bold text-gray-900 dark:text-white mb-2 ${
            isCompact ? 'text-sm line-clamp-2' : 'text-xl'
          }`}>
            <Link 
              to={`/events/${event.id}`}
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {event.title}
            </Link>
          </h3>
          
          {!isCompact && event.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
              {event.description}
            </p>
          )}
          
          <div className={`space-y-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} mr-2 text-primary-500`} />
              <span className="font-medium">{formatDate(event.start_at)}</span>
            </div>
            
            {!isCompact && (
              <>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-2 text-primary-500" />
                  <span>{formatTime(event.start_at)}</span>
                </div>
                
                {event.venue_name && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2 text-primary-500" />
                    <span className="truncate">{event.venue_name}</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {!isCompact && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600 flex justify-between items-center">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(event)}
              </span>
              
              <Link
                to={`/events/${event.id}`}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Подробнее
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ ОСНОВНОЙ РЕНДЕР ============
  if (loading && activeEvents.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
        {/* Hero Slider - показывает только активные события */}
        <EventsHeroSlider events={activeEvents} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {pageSettings.title}
            </h1>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск мероприятий..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg text-sm dark:bg-dark-800 dark:text-white"
                />
              </div>
              
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Поиск
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1">
              {/* View Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Найдено: {activeEvents.length} мероприятий
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 dark:bg-dark-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <Grid3X3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-200 dark:bg-dark-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Events Grid */}
              {activeEvents.length === 0 ? (
                <EmptyEventsState 
                  type={searchQuery ? 'no-search-results' : 'no-events'}
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery('')}
                />
              ) : (
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {activeEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => {/* Load more logic */}}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-gray-200 dark:bg-dark-700 hover:bg-gray-300 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                        Загрузка...
                      </>
                    ) : (
                      'Загрузить еще'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar with Past Events */}
            {pastEvents.length > 0 && (
              <div className="w-80 hidden lg:block">
                <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 sticky top-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-gray-500" />
                    Прошедшие мероприятия
                  </h2>
                  
                  <div className="space-y-2">
                    {pastEvents.map(event => (
                      <CompactEventCard key={event.id} event={event} />
                    ))}
                  </div>
                  
                  {pastEvents.length >= 10 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600">
                      <Link
                        to="/events?status=past"
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm"
                      >
                        Показать все прошедшие →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Call to Action */}
          {activeEvents.length > 0 && (
            <section className="mt-16 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white text-center">
              <h2 className="text-2xl font-bold mb-4">
                Не нашли подходящее событие?
              </h2>
              <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                Подпишитесь на наши уведомления, чтобы первыми узнавать о новых мероприятиях, 
                или предложите свою тему для будущих событий.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors">
                  Подписаться на уведомления
                </button>
                <Link
                  to="/contact"
                  className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Предложить тему
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
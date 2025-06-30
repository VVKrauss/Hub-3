// src/pages/EventsPage.tsx
// ПОЛНАЯ ВЕРСИЯ EventsPage для работы с новой БД структурой (sh_ таблицы)

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

// Импортируем типы для новой БД структуры
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
  const [events, setEvents] = useState<EventWithDetails[]>([]);
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
    status: ['active', 'past'] as ShEventStatus[] // И активные, и прошедшие для загрузки
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

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      loadEvents(true);
    }
  }, [filters, searchQuery, sortBy]);

  // ============ УТИЛИТЫ СОРТИРОВКИ ============
  const sortEvents = (events: EventWithDetails[], sortOption: SortOption): EventWithDetails[] => {
    const sorted = [...events];
    
    switch (sortOption) {
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
      case 'title_asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      case 'title_desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
      case 'price_asc':
        return sorted.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
      case 'price_desc':
        return sorted.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
      default:
        return sorted;
    }
  };

  // ============ УТИЛИТЫ ФОРМАТИРОВАНИЯ ============
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
    if (event.base_price && event.base_price > 0) {
      return `${event.base_price} ${event.currency || 'RSD'}`;
    }
    return 'Бесплатно';
  };

  // ============ ФУНКЦИИ РАЗДЕЛЕНИЯ СОБЫТИЙ ============
  const getActiveEvents = (allEvents: EventWithDetails[]): EventWithDetails[] => {
    const now = new Date();
    return allEvents.filter(event => {
      const eventDate = new Date(event.start_at);
      return eventDate > now && event.status === 'active';
    });
  };

  const getPastEvents = (allEvents: EventWithDetails[]): EventWithDetails[] => {
    const now = new Date();
    return allEvents.filter(event => {
      const eventDate = new Date(event.start_at);
      return eventDate <= now || event.status === 'past';
    }).slice(0, 10); // Берем только 10 последних прошедших
  };

  // ============ ОСНОВНЫЕ ФУНКЦИИ ЗАГРУЗКИ ============
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем настройки страницы, события и статистику параллельно
      const [settingsResponse, eventsResponse, featuredResponse, statsResponse] = await Promise.all([
        getPageSettings('events').catch(() => ({ data: null })),
        getEvents({ status: ['active', 'past'] as ShEventStatus[] }, 1, 100), // Загружаем активные и прошедшие
        getFeaturedEvents(6).catch(() => ({ data: [] })),
        getEventsStats().catch(() => ({ data: null }))
      ]);

      // Обрабатываем настройки страницы
      if (settingsResponse.data) {
        const settings = settingsResponse.data as EventsPageSettings;
        setPageSettings(settings);
        setViewMode(settings.defaultView);
      }

      // Обрабатываем события
      if (eventsResponse.error) {
        console.error('Events API error:', eventsResponse.error);
        throw new Error(eventsResponse.error);
      }
      
      const eventsData = eventsResponse.data || [];
      console.log('Loaded events:', eventsData.length);
      setEvents(eventsData);
      setHasMore(eventsResponse.hasMore);

      // Обрабатываем рекомендуемые события для слайдшоу
      if (featuredResponse.data && featuredResponse.data.length > 0) {
        setFeaturedEvents(featuredResponse.data);
      }

      // Обрабатываем статистику
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }

      // Загружаем избранное из localStorage
      const savedFavorites = localStorage.getItem('favorite_events');
      if (savedFavorites) {
        try {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        } catch (e) {
          console.warn('Error parsing saved favorites:', e);
        }
      }

    } catch (err) {
      console.error('Error loading events page:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (reset: boolean = false) => {
    try {
      if (reset) {
        setCurrentPage(1);
        setLoadingMore(true);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      
      // Подготавливаем фильтры
      const filtersWithDefaults = {
        ...filters,
        status: filters.status && filters.status.length > 0 ? filters.status : ['active', 'past'] as ShEventStatus[]
      };

      console.log('Loading events with filters:', filtersWithDefaults);

      const response = await getEvents(filtersWithDefaults, page, pageSettings.itemsPerPage);

      if (response.error) {
        throw new Error(response.error);
      }

      let sortedEvents = response.data || [];
      console.log('API returned events:', sortedEvents.length);
      
      // Применяем сортировку на клиенте
      sortedEvents = sortEvents(sortedEvents, sortBy);

      if (reset) {
        setEvents(sortedEvents);
      } else {
        setEvents(prev => [...prev, ...sortedEvents]);
      }

      setHasMore(response.hasMore);
      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }

    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки событий');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents(true);
      return;
    }

    try {
      setLoadingMore(true);
      
      const searchFilters = {
        ...filters,
        status: filters.status && filters.status.length > 0 ? filters.status : ['active', 'past'] as ShEventStatus[]
      };
      
      const response = await searchEvents(searchQuery.trim(), searchFilters, 50);

      if (response.error) {
        throw new Error(response.error);
      }

      let results = response.data || [];
      results = sortEvents(results, sortBy);
      setEvents(results);
      setHasMore(false);
    } catch (err) {
      console.error('Error searching events:', err);
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoadingMore(false);
    }
  };
  // ============ ОБРАБОТЧИКИ ФИЛЬТРОВ ============
  
  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const toggleEventType = (type: ShEventType) => {
    const currentTypes = filters.event_type || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    handleFilterChange('event_type', newTypes);
  };

  const togglePaymentType = (type: ShPaymentType) => {
    const currentTypes = filters.payment_type || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    handleFilterChange('payment_type', newTypes);
  };

  const toggleEventStatus = (status: ShEventStatus) => {
    const currentStatuses = filters.status || ['active', 'past'];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    handleFilterChange('status', newStatuses.length > 0 ? newStatuses : ['active', 'past']);
  };

  const clearFilters = () => {
    setFilters({ status: ['active', 'past'] as ShEventStatus[] });
    setSearchQuery('');
    setSortBy('date_asc');
    setCurrentPage(1);
  };

  // ============ ОБРАБОТЧИКИ ИЗБРАННОГО ============
  
  const toggleFavorite = (eventId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(eventId)) {
      newFavorites.delete(eventId);
    } else {
      newFavorites.add(eventId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('favorite_events', JSON.stringify([...newFavorites]));
  };

  // ============ ПРОВЕРКА СОСТОЯНИЙ ============
  
  const hasActiveFilters = () => {
    return (
      filters.event_type?.length ||
      filters.payment_type?.length ||
      filters.age_category?.length ||
      (filters.status && filters.status.length > 0 && !filters.status.includes('active') && !filters.status.includes('past')) ||
      filters.is_featured !== undefined ||
      filters.date_from ||
      filters.date_to ||
      searchQuery
    );
  };

  // ============ КОМПОНЕНТЫ РЕНДЕРИНГА ============

  // Компактная карточка для прошедших событий
  const CompactEventCard = ({ event }: { event: EventWithDetails }) => {
    const formatDateShort = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    const truncateText = (text: string, maxLength: number = 50): string => {
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
          <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-white opacity-50" />
          </div>
        )}

        {/* Контент */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            <Link 
              to={`/events/${event.slug || event.id}`}
              className="hover:underline"
            >
              {truncateText(event.title)}
            </Link>
          </h3>

          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="h-3 w-3 mr-1 text-primary-500" />
            <span>{formatDateShort(event.start_at)}</span>
          </div>

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

  // Карточка события для основной галереи
  const EventCard = ({ event }: { event: EventWithDetails }) => (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* Изображение */}
      <div className="relative h-48 overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Calendar className="h-16 w-16 text-white opacity-50" />
          </div>
        )}
        
        {/* Статус бейдж */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            event.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            event.status === 'past' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
            event.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </div>

        {/* Рекомендуемое */}
        {event.is_featured && (
          <div className="absolute top-3 right-3">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
          </div>
        )}

        {/* Кнопка избранного */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(event.id);
          }}
          className="absolute bottom-3 right-3 p-2 bg-white/80 hover:bg-white rounded-full transition-colors"
        >
          <Heart className={`h-4 w-4 ${favorites.has(event.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
        </button>

        {/* Цена */}
        {event.payment_type !== 'free' && event.base_price && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-sm font-medium text-gray-900">
            {formatPrice(event)}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-6">
        {/* Дата и время */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Clock className="h-4 w-4" />
          <span>{formatDate(event.start_at)}</span>
          <span>•</span>
          <span>{formatTime(event.start_at)}</span>
        </div>

        {/* Заголовок */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          {event.title}
        </h3>

        {/* Краткое описание */}
        {event.short_description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
            {event.short_description}
          </p>
        )}

        {/* Теги */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{event.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Мета-информация */}
        <div className="space-y-2 mb-4">
          {/* Место проведения */}
          {event.venue_name && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}
        </div>

        {/* Тип события и возрастная категория */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200">
            {EVENT_TYPE_LABELS[event.event_type]}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {AGE_CATEGORY_LABELS[event.age_category]}
          </span>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2">
          <Link
            to={`/events/${event.slug || event.id}`}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
          >
            Подробнее
          </Link>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ============ ОСНОВНОЙ РЕНДЕР ============

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
          <div className="relative h-96 bg-gradient-to-r from-primary-600 to-primary-700 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                <h2 className="text-3xl font-bold mb-2">Загружаем события...</h2>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Получаем активные и прошедшие события
  const activeEvents = getActiveEvents(events);
  const pastEvents = getPastEvents(events);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
        {/* Hero слайдшоу - показываем только активные события */}
        <div className="bg-white dark:bg-dark-800">
          <EventsHeroSlider events={activeEvents} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                    Найдено: {activeEvents.length} активных мероприятий
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
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {searchQuery ? 'Мероприятия не найдены' : 'Нет активных мероприятий'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {searchQuery 
                      ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить поисковый запрос.`
                      : 'В данный момент нет запланированных мероприятий. Следите за обновлениями!'
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Показать все события
                      </button>
                    )}
                  </div>
                </div>
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
                    onClick={() => loadEvents(false)}
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
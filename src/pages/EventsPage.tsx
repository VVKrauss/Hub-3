// src/pages/EventsPage.tsx
// ИСПРАВЛЕННАЯ ВЕРСИЯ EventsPage для работы с новой БД структурой
// Часть 1: Импорты, интерфейсы, состояние и основные функции

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
    status: ['active'] as ShEventStatus[] // ВАЖНО: по умолчанию активные события
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

  const formatPrice = (price: number | undefined, currency: string = 'RSD'): string => {
    if (!price || price === 0) return 'Бесплатно';
    return `${price} ${currency}`;
  };

  // ============ ОСНОВНЫЕ ФУНКЦИИ ЗАГРУЗКИ ============
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем настройки страницы, события и статистику параллельно
      const [settingsResponse, eventsResponse, featuredResponse, statsResponse] = await Promise.all([
        getPageSettings('events').catch(() => ({ data: null })),
        getEvents({ status: ['active'] as ShEventStatus[] }, 1, 12), // ПРИНУДИТЕЛЬНО активные события
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
      console.log('Loaded events:', eventsData.length); // Отладка
      setEvents(eventsData);
      setHasMore(eventsResponse.hasMore);

      // Обрабатываем рекомендуемые события
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
      
      // Подготавливаем фильтры - всегда включаем активные события
      const filtersWithDefaults = {
        ...filters,
        status: filters.status && filters.status.length > 0 ? filters.status : ['active'] as ShEventStatus[]
      };

      console.log('Loading events with filters:', filtersWithDefaults); // Отладка

      const response = await getEvents(filtersWithDefaults, page, pageSettings.itemsPerPage);

      if (response.error) {
        throw new Error(response.error);
      }

      let sortedEvents = response.data || [];
      console.log('API returned events:', sortedEvents.length); // Отладка
      
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
      
      // При поиске тоже используем активные события по умолчанию
      const searchFilters = {
        ...filters,
        status: filters.status && filters.status.length > 0 ? filters.status : ['active'] as ShEventStatus[]
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
    const currentStatuses = filters.status || ['active'];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    // Если убрали все статусы, возвращаем активные по умолчанию
    handleFilterChange('status', newStatuses.length > 0 ? newStatuses : ['active']);
  };

  const clearFilters = () => {
    setFilters({ status: ['active'] as ShEventStatus[] }); // Сбрасываем к активным
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
      (filters.status && filters.status.length > 0 && !filters.status.includes('active')) ||
      filters.is_featured !== undefined ||
      filters.date_from ||
      filters.date_to ||
      searchQuery
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.event_type?.length) count += filters.event_type.length;
    if (filters.payment_type?.length) count += filters.payment_type.length;
    if (filters.age_category?.length) count += filters.age_category.length;
    if (filters.status && filters.status.length > 0 && !filters.status.includes('active')) count += filters.status.length;
    if (filters.is_featured !== undefined) count += 1;
    if (filters.date_from) count += 1;
    if (filters.date_to) count += 1;
    if (searchQuery) count += 1;
    return count;
  };

  // ============ КОМПОНЕНТЫ РЕНДЕРИНГА ============

  // Компактный горизонтальный блок фильтров
  const CompactFiltersPanel = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Тип события */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Тип:
          </label>
          <select
            value={filters.event_type?.[0] || ''}
            onChange={(e) => handleFilterChange('event_type', e.target.value ? [e.target.value as ShEventType] : [])}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">Все типы</option>
            <option value="lecture">Лекция</option>
            <option value="workshop">Мастер-класс</option>
            <option value="conference">Конференция</option>
            <option value="seminar">Семинар</option>
            <option value="festival">Фестиваль</option>
            <option value="other">Другое</option>
          </select>
        </div>

        {/* Возрастная категория */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Возраст:
          </label>
          <select
            value={filters.age_category?.[0] || ''}
            onChange={(e) => handleFilterChange('age_category', e.target.value ? [e.target.value as ShAgeCategory] : [])}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">Все возраста</option>
            <option value="0+">0+</option>
            <option value="6+">6+</option>
            <option value="12+">12+</option>
            <option value="16+">16+</option>
            <option value="18+">18+</option>
          </select>
        </div>

        {/* Дата от */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            От:
          </label>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        {/* Дата до */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            До:
          </label>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        {/* Кнопка очистки фильтров */}
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Очистить
          </button>
        )}
      </div>
    </div>
  );

  // Карточка события для сетки
  const renderEventCard = (event: EventWithDetails) => (
    <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
      {/* Изображение */}
      <div className="relative h-48 overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Если изображение не загрузилось, показываем градиент с иконкой
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <svg class="h-16 w-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                `;
              }
            }}
            onLoad={(e) => {
              // Убираем градиент если изображение загрузилось
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.className = "relative h-48 overflow-hidden";
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <Calendar className="h-16 w-16 text-white opacity-50" />
          </div>
        )}
        
        {/* Статус бейдж */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            event.status === 'active' ? 'bg-green-100 text-green-800' :
            event.status === 'past' ? 'bg-gray-100 text-gray-800' :
            event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
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
            {formatPrice(event.base_price, event.currency)}
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-6">
        {/* Дата и время */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Clock className="h-4 w-4" />
          <span>{formatDate(event.start_at)}</span>
          <span>•</span>
          <span>{formatTime(event.start_at)}</span>
        </div>

        {/* Заголовок */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
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
              <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}

          {/* Спикеры */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span className="truncate">
                {event.speakers.map(es => es.speaker?.name).filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Регистрации */}
          {event.registrations_count !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>
                {event.registrations_count} зарегистрировано
                {event.max_attendees && (
                  <span> из {event.max_attendees}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Тип события и возрастная категория */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {EVENT_TYPE_LABELS[event.event_type]}
          </span>
          <span className="text-xs text-gray-500">
            {AGE_CATEGORY_LABELS[event.age_category]}
          </span>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2">
          <Link
            to={`/events/${event.slug || event.id}`}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
          >
            Подробнее
          </Link>
          
          {event.status === 'active' && event.registration_enabled && (
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Элемент списка для списочного вида
  const renderEventListItem = (event: EventWithDetails) => (
    <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="flex">
        {/* Изображение */}
        <div className="flex-shrink-0 w-32 h-32 relative overflow-hidden">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Если изображение не загрузилось, показываем градиент с иконкой
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                      <svg class="h-8 w-8 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-white opacity-50" />
            </div>
          )}
          
          {/* Статус бейдж */}
          <div className="absolute top-2 left-2">
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
              event.status === 'active' ? 'bg-green-100 text-green-800' :
              event.status === 'past' ? 'bg-gray-100 text-gray-800' :
              event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {EVENT_STATUS_LABELS[event.status]}
            </span>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Дата и время */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Clock className="h-4 w-4" />
                <span>{formatDate(event.start_at)}</span>
                <span>•</span>
                <span>{formatTime(event.start_at)}</span>
              </div>

              {/* Заголовок */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {event.title}
              </h3>

              {/* Краткое описание */}
              {event.short_description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                  {event.short_description}
                </p>
              )}

              {/* Мета-информация */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {event.venue_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-32">{event.venue_name}</span>
                  </div>
                )}
                
                {event.speakers && event.speakers.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="truncate max-w-40">
                      {event.speakers.map(es => es.speaker?.name).filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>
              </div>
            </div>

            {/* Правая панель */}
            <div className="flex flex-col items-end gap-2 ml-4">
              {/* Избранное */}
              <button
                onClick={() => toggleFavorite(event.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Heart className={`h-4 w-4 ${favorites.has(event.id) ? 'text-red-500 fill-current' : ''}`} />
              </button>

              {/* Цена */}
              {event.payment_type !== 'free' && event.base_price ? (
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPrice(event.base_price, event.currency)}
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium text-green-600">
                  Бесплатно
                </div>
              )}

              {/* Кнопка */}
              <Link
                to={`/events/${event.slug || event.id}`}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Подробнее
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ ОСНОВНОЙ РЕНДЕР ============

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Мероприятия"
            subtitle="Загрузка событий..."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Hero слайдшоу с предстоящими событиями - полная ширина */}
        <div className="bg-white dark:bg-gray-800">
          <EventsHeroSlider events={events} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Поисковая панель */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Строка поиска */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск событий по названию, описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопки управления */}
              <div className="flex gap-2">
                {/* Кнопка фильтров для мобильных */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>

                {/* Переключатель вида */}
                <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${
                      viewMode === 'grid'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${
                      viewMode === 'list'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Сортировка */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-10 text-sm focus:ring-primary-500 focus:border-primary-500 dark:text-white"
                  >
                    <option value="date_asc">Дата: сначала ближайшие</option>
                    <option value="date_desc">Дата: сначала дальние</option>
                    <option value="title_asc">Название: А-Я</option>
                    <option value="title_desc">Название: Я-А</option>
                    <option value="price_asc">Цена: по возрастанию</option>
                    <option value="price_desc">Цена: по убыванию</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Экспорт */}
                <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Экспорт</span>
                </button>
              </div>
            </div>

            {/* Быстрые фильтры */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleFilterChange('status', ['active'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.status?.includes('active') && filters.status?.length === 1
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Активные
              </button>
              
              <button
                onClick={() => handleFilterChange('payment_type', ['free'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.payment_type?.includes('free')
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Бесплатные
              </button>

              <button
                onClick={() => handleFilterChange('is_featured', true)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.is_featured === true
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ⭐ Рекомендуемые
              </button>

              {/* Очистить фильтры */}
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                >
                  ✕ Очистить все
                </button>
              )}
            </div>
          </div>

          {/* Мобильные фильтры - заменяем на компактные */}
          <CompactFiltersPanel />

          {/* Основной контент - убираем боковую панель */}
          <div>
            {/* Рекомендуемые события */}
            {featuredEvents.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    Рекомендуемые события
                  </h2>
                  <Link
                    to="/events?featured=true"
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
                  >
                    Все рекомендуемые
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {featuredEvents.slice(0, 3).map(event => renderEventCard(event))}
                </div>
              </section>
            )}

              {/* Заголовок секции основных событий */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {searchQuery ? `Результаты поиска "${searchQuery}"` : 'Все события'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {loading ? 'Загрузка...' : 
                       searchQuery ? `Найдено: ${events.length}` :
                       `Показано ${events.length} из ${stats.total} событий`}
                    </p>
                  </div>

                  {/* Статистика */}
                  {!searchQuery && stats.total > 0 && (
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.active}</div>
                        <div>Активных</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.past}</div>
                        <div>Прошедших</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.featured}</div>
                        <div>Рекомендуемых</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                  <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Ошибка загрузки
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {error}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                          loadEvents(true);
                        }}
                        className="ml-auto bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Повторить
                      </button>
                    </div>
                  </div>
                )}

                {/* Индикатор загрузки */}
                {loadingMore && !loading && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
                  </div>
                )}

                {/* Список событий */}
                {!loading && !loadingMore && events.length === 0 ? (
                  /* Пустое состояние */
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      События не найдены
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      {searchQuery 
                        ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить условия поиска.`
                        : hasActiveFilters()
                        ? 'События с такими фильтрами не найдены. Попробуйте изменить условия поиска.'
                        : 'В ближайшее время событий не запланировано. Следите за обновлениями!'
                      }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {hasActiveFilters() && (
                        <button
                          onClick={clearFilters}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Показать все события
                        </button>
                      )}
                      
                      <Link
                        to="/events?status=past"
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        {searchQuery ? 'Перейти к полному списку' : 'Посмотреть прошедшие события'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Сетка/список событий */
                  <>
                    <div className={
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                        : 'space-y-4'
                    }>
                      {events.map(event => 
                        viewMode === 'grid' 
                          ? renderEventCard(event)
                          : renderEventListItem(event)
                      )}
                    </div>

                    {/* Кнопка "Загрузить еще" */}
                    {hasMore && !searchQuery && (
                      <div className="text-center mt-12">
                        <button
                          onClick={() => loadEvents(false)}
                          disabled={loadingMore}
                          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Загрузить еще события
                            </>
                          )}
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Показано {events.length} из {stats.total} событий
                        </p>
                      </div>
                    )}

                    {/* Информация о завершении списка */}
                    {!hasMore && events.length > pageSettings.itemsPerPage && (
                      <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                          Вы просмотрели все доступные события ({events.length})
                        </p>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                        >
                          ↑ Вернуться к началу
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Call to Action */}
              {events.length > 0 && (
                <section className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-white text-center">
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
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
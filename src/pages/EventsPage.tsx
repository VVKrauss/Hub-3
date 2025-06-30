// src/pages/EventsPage.tsx KKK
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

interface EventsStats {
  total: number;
  active: number;
  past: number;
  draft: number;
  featured: number;
}

// Компонент для карточки прошедшего мероприятия в сайдбаре
const PastEventCard = ({ event }: { event: EventWithDetails }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const truncateTitle = (title: string, maxLength: number = 80) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + '...';
  };

  return (
    <Link 
      to={`/events/${event.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg p-3 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
    >
      <div className="flex gap-3">
        {/* Изображение */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {event.cover_image_url ? (
              <img 
                src={event.cover_image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        
        {/* Контент */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight mb-1">
            {truncateTitle(event.title)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(event.start_at)}
          </p>
        </div>
      </div>
    </Link>
  );
};

// Компонент для сайдбара с прошедшими мероприятиями
const PastEventsSidebar = ({ pastEvents, loading }: { 
  pastEvents: EventWithDetails[]; 
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Прошедшие мероприятия
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (pastEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Прошедшие мероприятия
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Пока нет прошедших мероприятий
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Прошедшие мероприятия
      </h3>
      <div className="space-y-3">
        {pastEvents.slice(0, 8).map((event) => (
          <PastEventCard key={event.id} event={event} />
        ))}
      </div>
      {pastEvents.length > 8 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link 
            to="/events?status=past"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Показать все ({pastEvents.length})
          </Link>
        </div>
      )}
    </div>
  );
};

// Основной компонент страницы
const EventsPage = () => {
  // ============ СОСТОЯНИЕ ============
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Основные данные
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
  const [activeEventsForSlider, setActiveEventsForSlider] = useState<EventWithDetails[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventWithDetails[]>([]);
  const [stats, setStats] = useState<EventsStats>({
    total: 0,
    active: 0,
    past: 0,
    draft: 0,
    featured: 0
  });

  // UI состояние
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPast, setLoadingPast] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'date-asc');
  const [filters, setFilters] = useState<EventFilters>({
    event_type: searchParams.get('type')?.split(',') as ShEventType[] || [],
    status: (searchParams.get('status')?.split(',') as ShEventStatus[]) || ['active'],
    payment_type: searchParams.get('payment')?.split(',') as ShPaymentType[] || [],
    age_category: searchParams.get('age')?.split(',') as ShAgeCategory[] || [],
    tags: searchParams.get('tags')?.split(',') || [],
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  });

  // Избранное
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Настройки страницы
  const [pageSettings, setPageSettings] = useState<EventsPageSettings>({
    title: 'Мероприятия',
    defaultView: 'grid',
    showFilters: true,
    itemsPerPage: 12
  });

  // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
  
  const sortEvents = (events: EventWithDetails[], sortType: string): EventWithDetails[] => {
    const sorted = [...events];
    
    switch (sortType) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
      case 'type':
        return sorted.sort((a, b) => (a.event_type || '').localeCompare(b.event_type || '', 'ru'));
      case 'featured':
        return sorted.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        });
      default:
        return sorted;
    }
  };

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

  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (sortBy !== 'date-asc') params.set('sort', sortBy);
    if (filters.event_type && filters.event_type.length > 0) {
      params.set('type', filters.event_type.join(','));
    }
    if (filters.status && filters.status.length > 0 && 
        !(filters.status.length === 1 && filters.status[0] === 'active')) {
      params.set('status', filters.status.join(','));
    }
    if (filters.payment_type && filters.payment_type.length > 0) {
      params.set('payment', filters.payment_type.join(','));
    }
    if (filters.age_category && filters.age_category.length > 0) {
      params.set('age', filters.age_category.join(','));
    }
    if (filters.tags && filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','));
    }
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);

    setSearchParams(params);
  }, [searchQuery, sortBy, filters, setSearchParams]);

  // Обновляем URL при изменении параметров
  useEffect(() => {
    updateURLParams();
  }, [updateURLParams]);

  const clearAllFilters = () => {
    setFilters({
      event_type: [],
      status: ['active'],
      payment_type: [],
      age_category: [],
      tags: [],
      date_from: undefined,
      date_to: undefined,
    });
    setSearchQuery('');
    setSortBy('date-asc');
    setCurrentPage(1);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.event_type && filters.event_type.length > 0) count++;
    if (filters.status && !(filters.status.length === 1 && filters.status[0] === 'active')) count++;
    if (filters.payment_type && filters.payment_type.length > 0) count++;
    if (filters.age_category && filters.age_category.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    if (searchQuery) count++;
    return count;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatEventTime = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const startTime = start.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (endDate) {
      const end = new Date(endDate);
      const endTime = end.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${startTime} - ${endTime}`;
    }
    
    return startTime;
  };

  const getEventTypeColor = (type: ShEventType) => {
    const colors = {
      'lecture': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'workshop': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'conference': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'seminar': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'meetup': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'festival': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'exhibition': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'discussion': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };










  //==================================================== конец 1 чвсим =======================================






  // ============ ОСНОВНЫЕ ФУНКЦИИ ЗАГРУЗКИ ============
  
  // Загружаем активные события для слайдшоу отдельно (всегда только активные)
  const loadActiveEventsForSlider = async () => {
    try {
      console.log('Loading active events for slider...'); // Отладка
      
      // Загружаем активные события с изображениями для слайдшоу
      const response = await getEvents({ 
        status: ['active'] as ShEventStatus[]
      }, 1, 20); // Больше событий для выбора лучших
      
      if (!response.error && response.data) {
        console.log('Loaded events for slider:', response.data.length); // Отладка
        
        // Фильтруем события с изображениями и сортируем по featured
        const eventsWithImages = response.data
          .filter(event => event.cover_image_url)
          .sort((a, b) => {
            // Сначала рекомендуемые события
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            // Потом по дате
            return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
          })
          .slice(0, 10); // Берем максимум 10 лучших событий
        
        console.log('Filtered events with images:', eventsWithImages.length); // Отладка
        setActiveEventsForSlider(eventsWithImages);
      } else {
        console.error('Error loading events for slider:', response.error);
      }
    } catch (err) {
      console.error('Error loading active events for slider:', err);
    }
  };

  // Загружаем прошедшие события для сайдбара (от последнего к первому)
  const loadPastEvents = async () => {
    try {
      setLoadingPast(true);
      const response = await getEvents({ 
        status: ['past'] as ShEventStatus[] 
      }, 1, 20); // Загружаем больше событий для лучшей сортировки
      
      if (!response.error && response.data) {
        // Сортируем от самого последнего к первому (по дате окончания или началу)
        const sortedPastEvents = response.data.sort((a, b) => {
          const dateA = new Date(a.end_at || a.start_at);
          const dateB = new Date(b.end_at || b.start_at);
          return dateB.getTime() - dateA.getTime(); // От последнего к первому
        });
        
        setPastEvents(sortedPastEvents);
      }
    } catch (err) {
      console.error('Error loading past events:', err);
    } finally {
      setLoadingPast(false);
    }
  };

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
      
      // Подготавливаем фильтры - всегда включаем активные события по умолчанию
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

  const toggleAgeCategory = (category: ShAgeCategory) => {
    const currentCategories = filters.age_category || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    handleFilterChange('age_category', newCategories);
  };

  const toggleStatus = (status: ShEventStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    handleFilterChange('status', newStatuses);
  };

  // ============ EFFECTS ============
  
  useEffect(() => {
    loadInitialData();
    loadActiveEventsForSlider(); // Загружаем активные события для слайдшоу
    loadPastEvents(); // Загружаем прошедшие события для сайдбара
  }, []);

  useEffect(() => {
    if (!loading) {
      loadEvents(true);
    }
  }, [filters, sortBy]);

  // ============ КОМПОНЕНТ КАРТОЧКИ СОБЫТИЯ ============
  
  const EventCard = ({ event, isFavorite, onToggleFavorite }: {
    event: EventWithDetails;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
  }) => {
    const handleShare = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const shareData = {
        title: event.title,
        text: event.short_description || event.title,
        url: window.location.origin + `/events/${event.id}`
      };

      try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback для браузеров без Web Share API
          await navigator.clipboard.writeText(shareData.url);
          // Можно добавить toast уведомление о копировании
          alert('Ссылка скопирована в буфер обмена!');
        }
      } catch (err) {
        console.log('Error sharing:', err);
        // Fallback на копирование в буфер
        try {
          await navigator.clipboard.writeText(shareData.url);
          alert('Ссылка скопирована в буфер обмена!');
        } catch (clipboardErr) {
          console.log('Clipboard error:', clipboardErr);
        }
      }
    };

    return (
      <Link to={`/events/${event.id}`} className="block group">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
          {/* Изображение */}
          <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
            {event.cover_image_url ? (
              <img 
                src={event.cover_image_url} 
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* Избранное */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(event.id);
              }}
              className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-900/90 rounded-full hover:bg-white dark:hover:bg-gray-900 transition-colors z-10"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
            </button>

            {/* Избранное событие */}
            {event.is_featured && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                <Star className="w-3 h-3 inline mr-1" />
                Рекомендуем
              </div>
            )}

            {/* Стрелка перехода */}
            <div className="absolute bottom-3 right-3 p-2 bg-primary-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>

          {/* Контент */}
          <div className="p-6">
            {/* Заголовок */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {event.title}
            </h3>

            {/* Краткое описание */}
            {event.short_description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {event.short_description}
              </p>
            )}

            {/* Мета информация */}
            <div className="space-y-2 mb-4">
              {/* Дата и время */}
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{formatEventDate(event.start_at)}</span>
                {event.start_at && (
                  <span className="ml-2 text-gray-500">
                    • {formatEventTime(event.start_at, event.end_at)}
                  </span>
                )}
              </div>

              {/* Место проведения */}
              {(event.venue_name || event.venue_address) && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    {event.location_type === 'online' ? 'Онлайн' : (event.venue_name || event.venue_address)}
                  </span>
                </div>
              )}
            </div>

            {/* Теги и метки */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Тип события */}
              {event.event_type && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>
              )}

              {/* Возрастная категория */}
              {event.age_category && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {AGE_CATEGORY_LABELS[event.age_category]}
                </span>
              )}

              {/* Цена */}
              {event.payment_type === 'free' ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Бесплатно
                </span>
              ) : event.base_price && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  от {event.base_price} {event.currency}
                </span>
              )}
            </div>

            {/* Действия */}
            <div className="flex items-center justify-end">
              {/* Кнопка поделиться */}
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="Поделиться"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  };



  // ============================ Конец 2 части =========================





  // ============ КОМПОНЕНТ СПИСОЧНОГО ПРЕДСТАВЛЕНИЯ ============
  
  const EventListItem = ({ event, isFavorite, onToggleFavorite }: {
    event: EventWithDetails;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
  }) => {
    const handleShare = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const shareData = {
        title: event.title,
        text: event.short_description || event.title,
        url: window.location.origin + `/events/${event.id}`
      };

      try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback для браузеров без Web Share API
          await navigator.clipboard.writeText(shareData.url);
          alert('Ссылка скопирована в буфер обмена!');
        }
      } catch (err) {
        console.log('Error sharing:', err);
        try {
          await navigator.clipboard.writeText(shareData.url);
          alert('Ссылка скопирована в буфер обмена!');
        } catch (clipboardErr) {
          console.log('Clipboard error:', clipboardErr);
        }
      }
    };

    return (
      <Link to={`/events/${event.id}`} className="block group">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
          <div className="flex">
            {/* Изображение */}
            <div className="relative w-48 h-32 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              {event.cover_image_url ? (
                <img 
                  src={event.cover_image_url} 
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              {/* Избранное событие */}
              {event.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                  <Star className="w-3 h-3 inline mr-1" />
                  Рекомендуем
                </div>
              )}

              {/* Стрелка перехода */}
              <div className="absolute bottom-2 right-2 p-1.5 bg-primary-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>

            {/* Контент */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {event.title}
                </h3>
                
                <div className="flex items-center gap-2 ml-4">
                  {/* Избранное */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFavorite(event.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  
                  {/* Поделиться */}
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title="Поделиться"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Краткое описание */}
              {event.short_description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {event.short_description}
                </p>
              )}

              {/* Мета информация */}
              <div className="space-y-1 mb-3">
                {/* Дата и время */}
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{formatEventDate(event.start_at)}</span>
                  {event.start_at && (
                    <span className="ml-2 text-gray-500">
                      • {formatEventTime(event.start_at, event.end_at)}
                    </span>
                  )}
                </div>

                {/* Место проведения */}
                {(event.venue_name || event.venue_address) && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>
                      {event.location_type === 'online' ? 'Онлайн' : (event.venue_name || event.venue_address)}
                    </span>
                  </div>
                )}
              </div>

              {/* Теги */}
              <div className="flex flex-wrap gap-2">
                {/* Тип события */}
                {event.event_type && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </span>
                )}

                {/* Цена */}
                {event.payment_type === 'free' ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Бесплатно
                  </span>
                ) : event.base_price && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    от {event.base_price} {event.currency}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // ============ ОСНОВНОЙ РЕНДЕР ============
  
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary-600" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Загружаем мероприятия...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Ошибка загрузки
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadInitialData();
                  loadActiveEventsForSlider();
                }}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero слайдшоу с активными событиями - на всю ширину экрана */}
        <div className="w-full">
          <EventsHeroSlider events={activeEventsForSlider} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Поисковая панель и фильтры */}
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
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопки управления */}
              <div className="flex gap-2">
                {/* Фильтры */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                    showFilters
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>

                {/* Переключение вида */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 ${
                      viewMode === 'grid'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } rounded-l-lg transition-colors`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 ${
                      viewMode === 'list'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } rounded-r-lg transition-colors border-l border-gray-300 dark:border-gray-600`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Тип события */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Тип события
                    </label>
                    <div className="space-y-2">
                      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                        <label key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.event_type?.includes(value as ShEventType) || false}
                            onChange={() => toggleEventType(value as ShEventType)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Статус */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Статус
                    </label>
                    <div className="space-y-2">
                      {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                        <label key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.status?.includes(value as ShEventStatus) || false}
                            onChange={() => toggleStatus(value as ShEventStatus)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Тип оплаты */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Стоимость
                    </label>
                    <div className="space-y-2">
                      {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                        <label key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.payment_type?.includes(value as ShPaymentType) || false}
                            onChange={() => togglePaymentType(value as ShPaymentType)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Возрастная категория */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Возрастная категория
                    </label>
                    <div className="space-y-2">
                      {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                        <label key={value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.age_category?.includes(value as ShAgeCategory) || false}
                            onChange={() => toggleAgeCategory(value as ShAgeCategory)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Действия с фильтрами */}
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Сбросить все фильтры
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Применить
                  </button>
                </div>
              </div>
            )}



            {/* ====================================== конпец 3 части ================================= */}            






            {/* Сортировка и статистика */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Сортировка:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="date-asc">По дате (сначала ближайшие)</option>
                    <option value="date-desc">По дате (сначала дальние)</option>
                    <option value="title-asc">По названию (А-Я)</option>
                    <option value="title-desc">По названию (Я-А)</option>
                    <option value="type">По типу события</option>
                    <option value="featured">Сначала рекомендуемые</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {searchQuery ? 
                  `Найдено ${events.length} событий` : 
                  `Всего событий: ${stats.total || events.length}`
                }
              </div>
            </div>
          </div>

          {/* Основной контент с сайдбаром */}
          <div className="flex gap-8">
            {/* Основная область с событиями */}
            <div className="flex-1">
              {/* Заголовок секции */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 
                    `Результаты поиска "${searchQuery}"` : 
                    'Все события'
                  }
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {loading ? 'Загрузка...' : 
                   searchQuery ? 
                     `Найдено ${events.length} событий` :
                     `Показано ${events.length} из ${stats.total || events.length} событий`
                  }
                </p>
              </div>

              {/* Список событий */}
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {searchQuery ? 'Ничего не найдено' : 'Нет событий'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchQuery ? 
                      'Попробуйте изменить параметры поиска или фильтры' :
                      'Пока нет доступных событий для показа'
                    }
                  </p>
                  {searchQuery && (
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* События в сетке или списке */}
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {events.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          isFavorite={favorites.has(event.id)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <EventListItem
                          key={event.id}
                          event={event}
                          isFavorite={favorites.has(event.id)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}

                  {/* Кнопка "Загрузить еще" */}
                  {hasMore && (
                    <div className="text-center mt-12">
                      <button
                        onClick={() => loadEvents(false)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
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
            </div>

            {/* Сайдбар с прошедшими событиями */}
            <div className="w-80 flex-shrink-0">
              <PastEventsSidebar 
                pastEvents={pastEvents} 
                loading={loadingPast} 
              />
            </div>
          </div>

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
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
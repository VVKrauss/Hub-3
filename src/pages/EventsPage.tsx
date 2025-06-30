// src/pages/EventsPage.tsx
// Полная обновленная версия EventsPage для работы с новой БД структурой

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

import { getSupabaseImageUrl } from '../utils/imageUtils';

// Импортируем новые API функции
import { 
  getEvents, 
  getFeaturedEvents, 
  searchEvents, 
  getEventsStats 
} from '../api/events';
import { getPageSettings } from '../api/settings';
import { apiUtils, API_CONSTANTS } from '../api';

// Импортируем типы
import type { 
  EventWithDetails, 
  EventFilters,
  ShEventType,
  ShEventStatus,
  ShAgeCategory,
  ShPaymentType
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

const EventsPageUpdated = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============ ОСНОВНОЕ СОСТОЯНИЕ ============
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
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
  status: ['active'] // по умолчанию показываем только активные
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
    upcoming: 0,
    published: 0,
    draft: 0,
    this_month: 0
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

  // ============ ОСНОВНЫЕ ФУНКЦИИ ЗАГРУЗКИ ============
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем настройки страницы, события и статистику параллельно
      const [settingsResponse, eventsResponse, featuredResponse, statsResponse] = await Promise.all([
        getPageSettings('events'),
        getEvents({}, 1, 50), // Увеличиваем лимит для разделения
        getFeaturedEvents(6),
        getEventsStats()
      ]);

      // Обрабатываем настройки страницы
      if (settingsResponse.data) {
        const settings = settingsResponse.data as EventsPageSettings;
        setPageSettings(settings);
        setViewMode(settings.defaultView);
      }

      // Разделяем события на предстоящие и прошедшие
      if (eventsResponse.data) {
        const now = new Date();
        const upcoming = eventsResponse.data.filter(event => 
          event.status === 'published' && new Date(event.end_at) >= now
        );
        const past = eventsResponse.data.filter(event => 
          (event.status === 'completed' || new Date(event.end_at) < now) && 
          event.status !== 'cancelled'
        );

        setUpcomingEvents(upcoming);
        setPastEvents(past.slice(0, 10)); // Ограничиваем прошедшие события
        setEvents(upcoming); // Основной список - только предстоящие
      }

      // Обрабатываем рекомендуемые события
      if (featuredResponse.data) {
        setFeaturedEvents(featuredResponse.data);
      }

      // Обрабатываем статистику
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }

      // Загружаем избранное из localStorage
      const savedFavorites = localStorage.getItem('favorite_events');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
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
      
      // Подготавливаем фильтры с сортировкой - только для предстоящих событий
      const filtersWithUpcoming = {
        ...filters,
        status: ['published'], // Только опубликованные
      };

      const response = await getEvents(filtersWithUpcoming, page, pageSettings.itemsPerPage);

      if (response.error) {
        throw new Error(response.error);
      }

      let sortedEvents = response.data || [];
      
      // Фильтруем только предстоящие события на клиенте
      const now = new Date();
      sortedEvents = sortedEvents.filter(event => new Date(event.end_at) >= now);
      
      // Применяем сортировку на клиенте
      sortedEvents = sortEvents(sortedEvents, sortBy);

      if (reset) {
        setUpcomingEvents(sortedEvents);
        setEvents(sortedEvents);
      } else {
        setUpcomingEvents(prev => [...prev, ...sortedEvents]);
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
      const response = await searchEvents(searchQuery.trim(), 50);

      if (response.error) {
        throw new Error(response.error);
      }

      let results = response.data || [];
      
      // Фильтруем только предстоящие события
      const now = new Date();
      results = results.filter(event => 
        event.status === 'published' && new Date(event.end_at) >= now
      );
      
      results = sortEvents(results, sortBy);
      setUpcomingEvents(results);
      setEvents(results);
      setHasMore(false);
    } catch (err) {
      console.error('Error searching events:', err);
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoadingMore(false);
    }
  };

  // ============ УТИЛИТЫ ============
  
  const sortEvents = (eventsList: EventWithDetails[], sortOption: SortOption): EventWithDetails[] => {
    return [...eventsList].sort((a, b) => {
      switch (sortOption) {
        case 'date_asc':
          return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        case 'date_desc':
          return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'price_asc':
          return (a.base_price || 0) - (b.base_price || 0);
        case 'price_desc':
          return (b.base_price || 0) - (a.base_price || 0);
        default:
          return 0;
      }
    });
  };

  const updateFilter = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSortBy('date_asc');
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

  const shareEvent = async (event: EventWithDetails) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.short_description || event.description || '',
          url: `${window.location.origin}/events/${event.slug}`
        });
      } catch (err) {
        console.log('Sharing cancelled');
      }
    } else {
      // Fallback: копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
      // Можно добавить toast уведомление
    }
  };

  const exportEvents = () => {
    // Экспорт событий в CSV или другой формат
    const csvContent = upcomingEvents.map(event => [
      event.title,
      apiUtils.formatDateTime(event.start_at),
      event.venue_name || '',
      event.payment_type === 'free' ? 'Бесплатно' : apiUtils.formatPrice(event.base_price || 0, event.currency),
    ].join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upcoming_events.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============ УТИЛИТЫ ОТОБРАЖЕНИЯ ============
  
  const getEventStatusBadge = (event: EventWithDetails) => {
    const now = new Date();
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);

    if (event.status === 'cancelled') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Отменено</span>;
    } else if (endDate < now || event.status === 'completed') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Завершено</span>;
    } else if (startDate <= now && endDate >= now) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Идет сейчас</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Скоро</span>;
    }
  };

  const getEventTypeLabel = (type: ShEventType) => {
    const labels = {
      lecture: 'Лекция',
      workshop: 'Мастер-класс',
      festival: 'Фестиваль',
      conference: 'Конференция',
      seminar: 'Семинар',
      other: 'Другое'
    };
    return labels[type] || type;
  };

  const getPaymentTypeIcon = (paymentType: ShPaymentType, price?: number) => {
    if (paymentType === 'free') {
      return <span className="text-green-600 font-medium">Бесплатно</span>;
    } else if (paymentType === 'donation') {
      return <span className="text-orange-600 font-medium">Донат</span>;
    } else if (paymentType === 'paid' && price) {
      return <span className="font-semibold text-primary-600">{apiUtils.formatPrice(price)}</span>;
    }
    return null;
  };

  // ============ НОВЫЕ КОМПОНЕНТЫ ============

  // Компонент слайдшоу для hero блока
  const HeroSlideshow = ({ events }: { events: EventWithDetails[] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
      if (events.length <= 1) return;
      
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % events.length);
      }, 5000);

      return () => clearInterval(timer);
    }, [events.length]);

    if (events.length === 0) {
      return (
        <div className="relative h-[400px] bg-gradient-to-r from-primary-600 to-secondary-600 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Наши Мероприятия</h1>
            <p className="text-xl opacity-90">Следите за новыми событиями</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative h-[400px] overflow-hidden">
        {events.slice(0, 5).map((event, index) => (
          <div
            key={event.id}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out`}
            style={{ transform: `translateX(${(index - currentSlide) * 100}%)` }}
          >
            <div className="relative h-full">
              <img 
                src={getSupabaseImageUrl(event.cover_image_url || event.bg_image)} 
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center" style={{ display: 'none' }}>
                <Calendar className="h-16 w-16 text-white" />
              </div>
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                <div className="max-w-4xl">
                  <h2 className="text-white text-3xl font-bold mb-2">{event.title}</h2>
                  <div className="flex items-center gap-4 text-white/90 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>{apiUtils.formatDateTime(event.start_at)}</span>
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span>{event.venue_name}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/events/${event.slug}`}
                    className="inline-block bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Индикаторы слайдов */}
        {events.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {events.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Компонент для панели прошедших событий
  const PastEventsPanel = ({ events }: { events: EventWithDetails[] }) => {
    if (events.length === 0) return null;

    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6 sticky top-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Прошедшие события
        </h3>
        <div className="space-y-3">
          {events.map(event => (
            <Link
              key={event.id}
              to={`/events/${event.slug}`}
              className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors group"
            >
              {/* Маленькое изображение */}
              <div className="w-16 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                {(event.cover_image_url || event.bg_image) ? (
                  <img
                    src={getSupabaseImageUrl(event.cover_image_url || event.bg_image)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center" style={{ display: (event.cover_image_url || event.bg_image) ? 'none' : 'flex' }}>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-2 mb-1">
                  {event.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {apiUtils.formatDate(event.start_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
        
        {events.length >= 10 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Link
              to="/events?status=completed"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Показать все прошедшие →
            </Link>
          </div>
        )}
      </div>
    );
  };

  // ============ КОМПОНЕНТЫ РЕНДЕРИНГА КАРТОЧЕК ============

  // Компактная карточка события без регистраций
  const renderCompactEventCard = (event: EventWithDetails) => (
    <div key={event.id} className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Изображение события */}
      <div className="aspect-[4/3] overflow-hidden relative">
        {(event.cover_image_url || event.bg_image) ? (
          <img
            src={getSupabaseImageUrl(event.cover_image_url || event.bg_image)}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallbackTried) {
                img.dataset.fallbackTried = 'true';
                const altField = event.cover_image_url ? event.bg_image : event.cover_image_url;
                if (altField) {
                  img.src = getSupabaseImageUrl(altField);
                  return;
                }
              }
              img.style.display = 'none';
              const placeholder = img.parentElement?.querySelector('.image-placeholder');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        
        <div 
          className={`image-placeholder w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center ${(event.cover_image_url || event.bg_image) ? 'hidden' : 'flex'}`}
        >
          <Calendar className="h-8 w-8 text-white" />
        </div>
        
        {/* Статус события */}
        <div className="absolute top-2 left-2">
          {getEventStatusBadge(event)}
        </div>

        {/* Кнопка избранного */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(event.id);
          }}
          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
        >
          <Heart className={`h-4 w-4 ${favorites.has(event.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Контент карточки - более компактный */}
      <div className="p-4">
        {/* Дата и тип события */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{apiUtils.formatDate(event.start_at)}</span>
          </div>
          <span className="px-2 py-1 rounded text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
            {getEventTypeLabel(event.event_type)}
          </span>
        </div>

        {/* Заголовок */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          <Link to={`/events/${event.slug}`} className="hover:text-primary-600 transition-colors">
            {event.title}
          </Link>
        </h3>

        {/* Место проведения */}
        {event.venue_name && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.venue_name}</span>
          </div>
        )}

        {/* Нижняя часть - цена и кнопка */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {getPaymentTypeIcon(event.payment_type, event.base_price)}
          </div>
          
          <Link
            to={`/events/${event.slug}`}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Подробнее →
          </Link>
        </div>
      </div>
    </div>
  );

  // Компонент списка событий (обновленный без регистраций)
  const renderEventListItem = (event: EventWithDetails) => (
    <div key={event.id} className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        {/* Изображение */}
        <div className="w-48 h-32 flex-shrink-0 relative">
          {(event.cover_image_url || event.bg_image) ? (
            <img
              src={getSupabaseImageUrl(event.cover_image_url || event.bg_image)}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.fallbackTried) {
                  img.dataset.fallbackTried = 'true';
                  const altField = event.cover_image_url ? event.bg_image : event.cover_image_url;
                  if (altField) {
                    img.src = getSupabaseImageUrl(altField);
                    return;
                  }
                }
                img.style.display = 'none';
                const placeholder = img.parentElement?.querySelector('.image-placeholder');
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          
          <div 
            className={`image-placeholder w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center ${(event.cover_image_url || event.bg_image) ? 'hidden' : 'flex'}`}
          >
            <Calendar className="h-8 w-8 text-white" />
          </div>
          
          {/* Статус */}
          <div className="absolute top-2 left-2">
            {getEventStatusBadge(event)}
          </div>
        </div>

        {/* Содержимое */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Дата и тип */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{apiUtils.formatDateTime(event.start_at)}</span>
                </div>
                <span className="px-2 py-1 rounded text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                  {getEventTypeLabel(event.event_type)}
                </span>
              </div>

              {/* Заголовок */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                <Link to={`/events/${event.slug}`} className="hover:text-primary-600 transition-colors">
                  {event.title}
                </Link>
              </h3>

              {/* Описание */}
              {event.short_description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                  {event.short_description}
                </p>
              )}

              {/* Мета информация */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {event.venue_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venue_name}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <span className="font-medium">{event.age_category}</span>
                </div>
              </div>
            </div>

            {/* Правая часть - цена и действия */}
            <div className="flex flex-col items-end gap-3">
              <div>
                {getPaymentTypeIcon(event.payment_type, event.base_price)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(event.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Heart className={`h-4 w-4 ${favorites.has(event.id) ? 'text-red-500 fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={() => shareEvent(event)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                <Link
                  to={`/events/${event.slug}`}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Подробнее
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ СОСТОЯНИЯ ЗАГРУЗКИ И ОШИБОК ============

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Загрузка событий...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button 
              onClick={loadInitialData}
              className="btn-primary"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ============ ОСНОВНОЙ РЕНДЕР ============

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero слайдшоу */}
        <HeroSlideshow events={featuredEvents} />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Основной контент - предстоящие события */}
            <div className="flex-1">
              
              {/* Статистика */}
              {stats.total > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white dark:bg-dark-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">{upcomingEvents.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Предстоящих</div>
                  </div>
                  <div className="bg-white dark:bg-dark-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.this_month}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">В этом месяце</div>
                  </div>
                  <div className="bg-white dark:bg-dark-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Всего опубликовано</div>
                  </div>
                  <div className="bg-white dark:bg-dark-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{favorites.size}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Избранных</div>
                  </div>
                </div>
              )}

              {/* Управление и поиск */}
              <div className="bg-white dark:bg-dark-800 rounded-lg p-6 mb-8">
                {/* Первая строка - поиск */}
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Поиск событий по названию, описанию..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-white"
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
                    {pageSettings.showFilters && (
                      <button
                        onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                        className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                          showFiltersPanel 
                            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/20 dark:border-primary-600 dark:text-primary-400' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700'
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Фильтры</span>
                        {Object.keys(filters).length > 0 && (
                          <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                            {Object.keys(filters).length}
                          </span>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700"
                    >
                      {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                      <span className="hidden sm:inline">{viewMode === 'grid' ? 'Список' : 'Сетка'}</span>
                    </button>

                    <button
                      onClick={exportEvents}
                      className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-dark-700"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Экспорт</span>
                    </button>
                  </div>
                </div>

                {/* Вторая строка - сортировка и быстрые фильтры */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Сортировка */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Сортировка:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                    >
                      <option value="date_asc">Дата: сначала ближайшие</option>
                      <option value="date_desc">Дата: сначала дальние</option>
                      <option value="title_asc">Название: А-Я</option>
                      <option value="title_desc">Название: Я-А</option>
                      <option value="price_asc">Цена: по возрастанию</option>
                      <option value="price_desc">Цена: по убыванию</option>
                    </select>
                  </div>

                  {/* Быстрые фильтры */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Быстрые фильтры:</span>
                    
                    <button
                      onClick={() => updateFilter('payment_type', filters.payment_type?.includes('free') ? undefined : ['free'])}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filters.payment_type?.includes('free')
                          ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-dark-700'
                      }`}
                    >
                      Бесплатные
                    </button>

                    <button
                      onClick={() => updateFilter('is_featured', filters.is_featured ? undefined : true)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filters.is_featured
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-400'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-dark-700'
                      }`}
                    >
                      <Star className="h-3 w-3 inline mr-1" />
                      Рекомендуемые
                    </button>

                    {(Object.keys(filters).length > 0 || searchQuery) && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Очистить все
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Расширенная панель фильтров */}
              {showFiltersPanel && pageSettings.showFilters && (
                <div className="bg-white dark:bg-dark-800 rounded-lg p-6 mb-8 border-l-4 border-primary-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Расширенные фильтры</h3>
                    <button
                      onClick={() => setShowFiltersPanel(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Тип события */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Тип события
                      </label>
                      <select
                        value={filters.event_type?.[0] || ''}
                        onChange={(e) => updateFilter('event_type', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Все типы</option>
                        <option value="lecture">Лекция</option>
                        <option value="workshop">Мастер-класс</option>
                        <option value="festival">Фестиваль</option>
                        <option value="conference">Конференция</option>
                        <option value="seminar">Семинар</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>

                    {/* Возрастная категория */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Возрастное ограничение
                      </label>
                      <select
                        value={filters.age_category?.[0] || ''}
                        onChange={(e) => updateFilter('age_category', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Все возрасты</option>
                        <option value="0+">0+ (для всех)</option>
                        <option value="6+">6+ (дети от 6 лет)</option>
                        <option value="12+">12+ (подростки от 12 лет)</option>
                        <option value="16+">16+ (молодежь от 16 лет)</option>
                        <option value="18+">18+ (только взрослые)</option>
                      </select>
                    </div>

                    {/* Тип оплаты */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Тип оплаты
                      </label>
                      <select
                        value={filters.payment_type?.[0] || ''}
                        onChange={(e) => updateFilter('payment_type', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Любой тип оплаты</option>
                        <option value="free">Бесплатно</option>
                        <option value="paid">Платно</option>
                        <option value="donation">Добровольный донат</option>
                      </select>
                    </div>

                    {/* Место проведения */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Место проведения
                      </label>
                      <select
                        value={filters.location_type || ''}
                        onChange={(e) => updateFilter('location_type', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Любое место</option>
                        <option value="physical">Очно</option>
                        <option value="online">Онлайн</option>
                        <option value="hybrid">Гибридно</option>
                      </select>
                    </div>

                    {/* Период событий */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Дата начала
                      </label>
                      <input
                        type="date"
                        value={filters.date_from || ''}
                        onChange={(e) => updateFilter('date_from', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Дата окончания
                      </label>
                      <input
                        type="date"
                        value={filters.date_to || ''}
                        onChange={(e) => updateFilter('date_to', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      />
                    </div>

                    {/* Дополнительные опции */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Дополнительные фильтры
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={filters.is_featured || false}
                            onChange={(e) => updateFilter('is_featured', e.target.checked || undefined)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-dark-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Только рекомендуемые события</span>
                        </label>

                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={favorites.size > 0 && upcomingEvents.filter(e => favorites.has(e.id)).length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Показать только избранные - фильтруем на клиенте
                                const favoriteEvents = upcomingEvents.filter(event => favorites.has(event.id));
                                setEvents(favoriteEvents);
                              } else {
                                // Перезагружаем все события
                                setEvents(upcomingEvents);
                              }
                            }}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-dark-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Только избранные ({favorites.size})</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Применить/Сбросить фильтры */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {events.length} событий найдено
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Сбросить все
                      </button>
                      <button
                        onClick={() => setShowFiltersPanel(false)}
                        className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Применить фильтры
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Список событий */}
              <section>
                {events.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                      <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                      <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-4">
                        События не найдены
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {searchQuery 
                          ? `Не найдено событий по запросу "${searchQuery}". Попробуйте изменить критерии поиска.`
                          : 'В ближайшее время событий не запланировано. Следите за обновлениями!'
                        }
                      </p>
                      {(searchQuery || Object.keys(filters).length > 0) && (
                        <div className="space-y-3">
                          <button
                            onClick={clearFilters}
                            className="btn-primary"
                          >
                            Показать все события
                          </button>
                          <p className="text-sm text-gray-500">
                            или <Link to="/events" className="text-primary-600 hover:underline">перейти к полному списку</Link>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Результаты поиска */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {searchQuery ? `Результаты поиска "${searchQuery}"` : 'Предстоящие события'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Найдено {events.length} событий
                          {Object.keys(filters).length > 0 && ` с примененными фильтрами`}
                        </p>
                      </div>

                      {/* Индикатор избранных */}
                      {favorites.size > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span>У вас {favorites.size} избранных событий</span>
                        </div>
                      )}
                    </div>

                    {/* Сетка или список событий - ОБНОВЛЕННАЯ СТРУКТУРА */}
                    <div className={
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' // Увеличили плотность
                        : 'space-y-4'
                    }>
                      {events.map(event => 
                        viewMode === 'grid' 
                          ? renderCompactEventCard(event)
                          : renderEventListItem(event)
                      )}
                    </div>

                    {/* Кнопка "Загрузить еще" */}
                    {hasMore && !searchQuery && (
                      <div className="text-center mt-12">
                        <button
                          onClick={() => loadEvents(false)}
                          disabled={loadingMore}
                          className="btn-primary flex items-center gap-2 mx-auto px-8 py-3"
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
                          Показано {events.length} из {upcomingEvents.length} событий
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
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
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
                    Подпишитесь на уведомления о новых событиях или предложите свою тему для мероприятия
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link 
                      to="/notifications" 
                      className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Подписаться на уведомления
                    </Link>
                    <Link 
                      to="/suggest-event" 
                      className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
                    >
                      Предложить событие
                    </Link>
                  </div>
                </section>
              )}
            </div>

            {/* Боковая панель с прошедшими событиями */}
            <div className="w-80 flex-shrink-0 hidden lg:block">
              <PastEventsPanel events={pastEvents} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPageUpdated;
// src/pages/EventsPage.tsx - ПОЛНАЯ ОРИГИНАЛЬНАЯ ВЕРСИЯ с минимальными исправлениями
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Grid, List, Search, Filter, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';
import { LoadingSpinner } from '../components/ui/UnifiedLoading'; // 👈 ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ ИМПОРТА

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

// ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ЯЗЫКА
const getEventLanguage = (event: any): string => {
  if (event.language_code) {
    const languageMap: Record<string, string> = {
      'ru': 'РУ',
      'en': 'EN', 
      'sr': 'СР',
      'de': 'DE',
      'fr': 'FR',
      'es': 'ES'
    };
    return languageMap[event.language_code] || event.language_code.toUpperCase();
  }
  if (event.languages && event.languages.length > 0) {
    return event.languages.join(', ').toUpperCase();
  }
  return 'РУ'; // По умолчанию
};

// ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ВОЗРАСТНОЙ КАТЕГОРИИ
const getAgeCategory = (event: any): string => {
  if (event.age_category) {
    return event.age_category;
  }
  return '18+'; // По умолчанию
};

// ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ИЗОБРАЖЕНИЯ СОБЫТИЯ
const getEventImage = (event: any): string => {
  if (event.cover_image_url) {
    return getSupabaseImageUrl(event.cover_image_url);
  }
  return 'https://via.placeholder.com/400x200?text=No+Image';
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
  venue_name?: string;
  language_code?: string;
  languages?: string[];
  registrations_count?: number;
  status: string;
  age_category?: string;
}

// КОМПОНЕНТ СЛАЙДШОУ
const EventsSlideshow = ({ events }: { events: EventWithDetails[] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Автопрокрутка слайдов
  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % events.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length, isAutoPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % events.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + events.length) % events.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  if (events.length === 0) return null;

  return (
    <div className="relative w-full h-[400px] overflow-hidden rounded-xl shadow-2xl mb-8">
      {/* Слайды */}
      <div className="relative w-full h-full">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Фоновое изображение */}
            <div className="absolute inset-0">
              <img
                src={getEventImage(event)}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Темный оверлей для читаемости текста */}
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            </div>

            {/* Контент слайда */}
            <div className="relative z-10 h-full flex items-end">
              <div className="w-full p-8 text-white">
                <div className="max-w-4xl">
                  {/* Название */}
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                    {event.title}
                  </h2>
                  
                  {/* Краткое описание */}
                  {event.short_description && (
                    <p className="text-xl md:text-2xl text-gray-200 mb-6 leading-relaxed line-clamp-2">
                      {event.short_description}
                    </p>
                  )}
                  
                  {/* Информация о событии */}
                  <div className="flex flex-wrap gap-6 mb-6 text-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>{formatRussianDate(event.start_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span>{formatTimeFromTimestamp(event.start_at)}</span>
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span>{event.venue_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                        {getEventTypeLabel(event.event_type)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Кнопки действий */}
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/events/${event.id}`}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
                    >
                      Подробнее
                    </Link>
                    <span className="text-2xl font-bold">
                      {getEventPrice(event)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Навигационные кнопки */}
        {events.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200 z-20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200 z-20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Индикаторы слайдов */}
      {events.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSlide
                  ? 'bg-white scale-110'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// КОМПОНЕНТ ПРОШЕДШИХ МЕРОПРИЯТИЙ
const PastEventsPanel = ({ events }: { events: EventWithDetails[] }) => {
  if (events.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-500" />
        Завершённые мероприятия
      </h3>
      
      <div className="space-y-3">
        {events.slice(0, 10).map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors group"
          >
            {/* Миниатюра */}
            <div className="w-16 h-12 flex-shrink-0 overflow-hidden rounded-md">
              <img
                src={getEventImage(event)}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
            {/* Информация */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {event.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatRussianDate(event.start_at)}
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      {events.length > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            И ещё {events.length - 10} мероприятий...
          </p>
        </div>
      )}
    </div>
  );
};

// КОМПОНЕНТ КАРТОЧКИ СОБЫТИЯ
const EventCard = ({ event, viewMode }: { event: EventWithDetails; viewMode: ViewMode }) => {
  const isPastEvent = event.status === 'past';

  if (viewMode === 'list') {
    return (
      <Link to={`/events/${event.id}`} className="block">
        <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
          isPastEvent ? 'opacity-75' : ''
        }`}>
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
                <div className="flex items-center gap-2">
                  {isPastEvent && (
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                      Прошло
                    </span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatRussianDate(event.start_at)}
                  </span>
                </div>
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
      <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
        isPastEvent ? 'opacity-75' : ''
      }`}>
        <div className="aspect-video overflow-hidden relative">
          <img
            src={getEventImage(event)}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          {isPastEvent && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded-full">
                Прошло
              </span>
            </div>
          )}
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
};

const EventsPage = () => {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [activeEvents, setActiveEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
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

      if (!filters.showPast) {
        query = query.eq('status', 'active');
      }

      const { data: newEvents, error } = await query;

      if (error) {
        console.error('Error fetching from sh_events:', error);
        // Fallback к старой таблице events
        let legacyQuery = supabase
          .from('events')
          .select('*')
          .order('start_at', { ascending: false })
          .range((pageNum - 1) * 20, pageNum * 20 - 1);

        const { data: legacyEvents, error: legacyError } = await legacyQuery;
        
        if (legacyError) {
          throw legacyError;
        }

        const eventsData = legacyEvents || [];
        
        if (append) {
          setEvents(prev => [...prev, ...eventsData]);
        } else {
          setEvents(eventsData);
        }
        
        setHasMore(eventsData.length === 20);
        setPage(pageNum);
        
      } else {
        const eventsData = newEvents || [];
        
        if (append) {
          setEvents(prev => [...prev, ...eventsData]);
        } else {
          setEvents(eventsData);
        }
        
        setHasMore(eventsData.length === 20);
        setPage(pageNum);
      }

    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Сепарация событий по статусам
  const separateEventsByStatus = (allEvents: EventWithDetails[]) => {
    const active = allEvents.filter(event => event.status === 'active');
    const past = allEvents.filter(event => event.status === 'past');
    
    setActiveEvents(active);
    setPastEvents(past);
  };

  // Фильтрация и сортировка
  const filterAndSortEvents = () => {
    let filtered = [...events];

    // Фильтр по статусу
    if (!filters.showPast) {
      filtered = filtered.filter(event => event.status !== 'past');
    }

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.short_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

    setFilteredAndSortedEvents(filtered);
  };

  // Эффекты
  useEffect(() => {
    fetchEvents();
  }, [filters.showPast]);

  useEffect(() => {
    separateEventsByStatus(events);
  }, [events]);

  useEffect(() => {
    filterAndSortEvents();
  }, [events, searchQuery, filters, sortBy]);

  // Обработчики
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
    setSortBy('date');
  };

  const hasActiveFilters = () => {
    return searchQuery || filters.eventType || filters.paymentType || filters.dateRange || filters.showPast;
  };

  // 👈 ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ: заменил старый лоадер
  if (loading && events.length === 0) {
    return (
      <Layout disablePageTransition={true}>
        <main className="min-h-screen bg-gray-500 dark:bg-dark-600">
          <div className="container mx-auto px-4 py-8">
            <LoadingSpinner text="Загружаем мероприятия..." className="py-32" />
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout disablePageTransition={true}> {/* 👈 ОТКЛЮЧАЕМ конфликтующие переходы */}
      <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="container mx-auto px-4 py-8">
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Мероприятия
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Присоединяйтесь к увлекательным событиям нашего сообщества
            </p>
          </div>

          {/* 🎯 СЛАЙДШОУ СОБЫТИЙ */}
          <EventsSlideshow events={activeEvents.slice(0, 5)} />

          {/* Основной контент в две колонки */}
          <div className="flex gap-8">
            {/* ЛЕВАЯ КОЛОНКА - ОСНОВНЫЕ МЕРОПРИЯТИЯ */}
            <div className="flex-1">
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
                        <option value="popularity">По популярности</option>
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
              <div>
                {filteredAndSortedEvents.length > 0 ? (
                  <>
                    <div className={`animate-fade-in ${
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6' 
                        : 'space-y-4'
                    }`}>
                      {filteredAndSortedEvents.map((event) => (
                        <EventCard key={event.id} event={event} viewMode={viewMode} />
                      ))}
                    </div>

                    {hasMore && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingMore ? (
                            <LoadingSpinner text="Загрузка..." />
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
                      className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Очистить фильтры
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 🎯 ПРАВАЯ КОЛОНКА - ПРОШЕДШИЕ МЕРОПРИЯТИЯ */}
            <div className="w-80 flex-shrink-0">
              <PastEventsPanel events={pastEvents} />
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default EventsPage;
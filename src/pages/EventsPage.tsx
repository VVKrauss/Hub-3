// src/pages/EventsPage.tsx
// ИСПРАВЛЕННАЯ ОРИГИНАЛЬНАЯ ВЕРСИЯ - с минимальными изменениями для устранения зависания

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Grid, List, Search, Filter, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // ИСПРАВЛЕННАЯ автопрокрутка слайдов
  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % events.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length, isAutoPlaying]); // Убрал currentSlide из зависимостей

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
                  
                  {/* Дата и время */}
                  <div className="flex flex-wrap items-center gap-6 text-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>{formatRussianDate(event.start_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span>{formatTimeFromTimestamp(event.start_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ссылка на событие */}
            <Link 
              to={`/events/${event.id}`}
              className="absolute inset-0 z-5"
              aria-label={`Перейти к событию: ${event.title}`}
            />
          </div>
        ))}
      </div>

      {/* Стрелки навигации */}
      {events.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Индикаторы слайдов */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex space-x-2">
        {events.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
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
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ загрузка событий - только один раз
  const fetchEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!isMountedRef.current) return;
      
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

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error fetching from sh_events:', error);
        // Fallback к старой таблице events
        let legacyQuery = supabase
          .from('events')
          .select('*')
          .order('start_at', { ascending: false })
          .range((pageNum - 1) * 20, pageNum * 20 - 1);

        if (!filters.showPast) {
          legacyQuery = legacyQuery.eq('active', true);
        }

        const { data: legacyEvents, error: legacyError } = await legacyQuery;

        if (legacyError) throw legacyError;

        // Конвертируем legacy события
        const convertedEvents = (legacyEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start_at: event.start_at,
          end_at: event.end_at,
          event_type: event.type || 'other',
          payment_type: event.price > 0 ? 'paid' : 'free',
          price: event.price,
          currency: 'RSD',
          cover_image_url: event.bg_image,
          venue_name: event.location,
          status: 'active'
        }));

        if (append) {
          setEvents(prev => [...prev, ...convertedEvents]);
        } else {
          setEvents(convertedEvents);
        }
        setHasMore(convertedEvents.length === 20);
      } else {
        if (append) {
          setEvents(prev => [...prev, ...(newEvents || [])]);
        } else {
          setEvents(newEvents || []);
        }
        setHasMore((newEvents || []).length === 20);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Фильтрация и сортировка
  const filterAndSortEvents = () => {
    if (!isMountedRef.current) return;
    
    let filtered = [...events];

    // Фильтр по прошедшим событиям
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

  // ИСПРАВЛЕННЫЕ эффекты
  useEffect(() => {
    isMountedRef.current = true;
    fetchEvents();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [filters.showPast]); // Только при изменении showPast

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

  if (loading && events.length === 0) {
    return (
      <Layout>
        <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  // Разделяем события на активные и прошедшие для слайдшоу
  const upcomingEvents = filteredAndSortedEvents.filter(event => event.status !== 'past').slice(0, 5);

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="container mx-auto px-4 py-8">
          
          {/* Слайдшоу с предстоящими событиями */}
          {upcomingEvents.length > 0 && (
            <EventsSlideshow events={upcomingEvents} />
          )}

          {/* Заголовок и фильтры */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Все мероприятия
            </h1>
            
            {/* Поиск и основные фильтры */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по названию или описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="date">По дате</option>
                  <option value="title">По названию</option>
                  <option value="price">По цене</option>
                </select>
                
                <button
                  onClick={() => setFilters(prev => ({ ...prev, showPast: !prev.showPast }))}
                  className={`px-4 py-2 rounded-lg ${
                    filters.showPast 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {filters.showPast ? 'Все' : 'Только будущие'}
                </button>
                
                <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* События */}
          {filteredAndSortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Мероприятия не найдены
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Попробуйте изменить поисковый запрос или фильтры
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Очистить фильтры
              </button>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {filteredAndSortedEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className={`group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
                      viewMode === 'list' ? 'flex' : ''
                    }`}
                  >
                    <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={getEventImage(event)}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-3 right-3 bg-primary-600 text-white px-2 py-1 rounded-lg text-xs font-medium">
                          {getEventTypeLabel(event.event_type)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {event.title}
                      </h3>
                      
                      {event.short_description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                          {event.short_description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatRussianDate(event.start_at)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatTimeFromTimestamp(event.start_at)}
                        </div>
                        {event.venue_name && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.venue_name}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          {getEventPrice(event)}
                        </span>
                        {event.registrations_count !== undefined && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            {event.registrations_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Загрузить еще */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? (
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
        </div>
      </main>
    </Layout>
  );
};

export default EventsPage;
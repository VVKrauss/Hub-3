// src/pages/EventsPage.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
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
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* Индикаторы слайдов */}
      {events.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
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
  // Фильтруем только действительно прошедшие события
  const pastEvents = events.filter(event => {
    if (event.status === 'past') return true;
    if (event.end_at && new Date(event.end_at) < new Date()) return true;
    if (!event.end_at && new Date(event.start_at) < new Date()) return true;
    return false;
  });

  if (pastEvents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-500" />
        Завершённые мероприятия
      </h3>
      
      <div className="space-y-3">
        {pastEvents.slice(0, 10).map((event) => (
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
      
      {pastEvents.length > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            И ещё {pastEvents.length - 10} мероприятий...
          </p>
        </div>
      )}
    </div>
  );
};

// КОМПОНЕНТ КАРТОЧКИ СОБЫТИЯ
const EventCard = ({ event, viewMode }: { event: EventWithDetails; viewMode: ViewMode }) => {
  const isEventInPast = () => {
    // Проверяем и по статусу, и по дате
    if (event.status === 'past') return true;
    if (event.end_at) {
      return new Date(event.end_at) < new Date();
    }
    // Если нет end_at, проверяем start_at
    return new Date(event.start_at) < new Date();
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex gap-4">
          {/* Изображение */}
          <div className="w-24 h-18 flex-shrink-0 overflow-hidden rounded-lg">
            <img
              src={getEventImage(event)}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Контент */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-sm font-medium">
                    {getEventTypeLabel(event.event_type)}
                  </span>
                  <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                    {getEventLanguage(event)}
                  </span>
                  <span className="inline-flex items-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs font-medium">
                    {getAgeCategory(event)}
                  </span>
                  {isEventInPast() && (
                    <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded text-sm">
                      Завершено
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  <Link to={`/events/${event.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                    {event.title}
                  </Link>
                </h3>

                {event.short_description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                    {event.short_description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatRussianDate(event.start_at)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTimeFromTimestamp(event.start_at)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.venue_name || 'Локация уточняется'}
                  </div>
                  {(event.registrations_count !== undefined && event.registrations_count > 0) && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {event.registrations_count}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {getEventPrice(event)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Изображение */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={getEventImage(event)}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isEventInPast() && (
          <div className="absolute top-3 left-3 bg-gray-500 text-white px-2 py-1 rounded text-xs">
            Завершено
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg text-xs font-medium">
            {getEventTypeLabel(event.event_type)}
          </span>
          <div className="flex gap-1">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-xs font-medium">
              {getEventLanguage(event)}
            </span>
            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-lg text-xs font-medium">
              {getAgeCategory(event)}
            </span>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {event.title}
        </h3>

        {event.short_description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
            {event.short_description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
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
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          {(event.registrations_count !== undefined && event.registrations_count > 0) && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Users className="h-4 w-4 mr-1" />
              {event.registrations_count} участников
            </div>
          )}

          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {getEventPrice(event)}
          </p>
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

      // Отдельно загружаем активные события для слайдшоу
      if (pageNum === 1) {
        const { data: activeEventsData } = await supabase
          .from('sh_events')
          .select(`
            id, title, short_description, description, start_at, end_at,
            event_type, payment_type, base_price, currency, cover_image_url,
            venue_name, language_code, status, age_category
          `)
          .eq('status', 'active')
          .eq('is_public', true)
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(5);

        setActiveEvents(activeEventsData || []);

        // Загружаем прошедшие события
        const { data: pastEventsData } = await supabase
          .from('sh_events')
          .select(`
            id, title, start_at, end_at, cover_image_url, status
          `)
          .eq('is_public', true)
          .or('status.eq.past,end_at.lt.' + new Date().toISOString())
          .order('start_at', { ascending: false })
          .limit(15);

        setPastEvents(pastEventsData || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Фильтрация и сортировка событий
  const filterAndSortEvents = () => {
    let filtered = [...events];

    // Исключаем прошедшие события из основного списка, если не включен фильтр "показать прошедшие"
    if (!filters.showPast) {
      filtered = filtered.filter(event => {
        // Проверяем статус и дату
        if (event.status === 'past') return false;
        if (event.end_at && new Date(event.end_at) < new Date()) return false;
        if (!event.end_at && new Date(event.start_at) < new Date()) return false;
        return true;
      });
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

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="container mx-auto px-4 py-8">
          {/* Слайдшоу активных событий */}
          {activeEvents.length > 0 && (
            <EventsSlideshow events={activeEvents} />
          )}

          <div className="flex gap-8">
            {/* ОСНОВНОЙ КОНТЕНТ */}
            <div className="flex-1">
              {/* Заголовок и управление */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Мероприятия
                  </h1>

                  {/* Управление видом */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Поиск и фильтры */}
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Поиск */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Поиск мероприятий..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      />
                    </div>

                    {/* Кнопка фильтров */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                        showFilters
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      Фильтры
                      <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
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
                            <option value="festival">Фестиваль</option>
                            <option value="quiz">Квиз</option>
                            <option value="excursion">Экскурсия</option>
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
              </div>

              {/* Отступ между фильтрами и списком событий */}
              <div className="mt-8">
                {/* Список событий */}
                {filteredAndSortedEvents.length > 0 ? (
                  <>
                    <div className={viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6'
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
                          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
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
                      className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Очистить фильтры
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА - ПРОШЕДШИЕ МЕРОПРИЯТИЯ */}
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
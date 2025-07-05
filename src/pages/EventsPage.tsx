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
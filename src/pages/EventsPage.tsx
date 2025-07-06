// src/pages/EventsPage.tsx
// ИСПРАВЛЕННАЯ ВЕРСИЯ - устранение зависания при загрузке

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Grid, List, Search, Filter } from 'lucide-react';
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
  'other': 'Другое'
};

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
  return 'Бесплатно';
};

const getEventTypeLabel = (eventType: string): string => {
  return EVENT_TYPE_LABELS[eventType] || eventType;
};

const getEventImage = (event: any): string => {
  if (event.cover_image_url) {
    return getSupabaseImageUrl(event.cover_image_url);
  }
  return 'https://via.placeholder.com/400x200?text=No+Image';
};

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'title' | 'price';

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
  registrations_count?: number;
  status: string;
  age_category?: string;
}

const EventsPage = () => {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPast, setShowPast] = useState(false);
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ ЗАГРУЗКА СОБЫТИЙ - только один раз
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchEvents = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        
        console.log('🚀 Fetching events...');

        // Пробуем новую таблицу sh_events
        let eventsData = [];
        
        try {
          const { data: newEvents, error: newError } = await supabase
            .from('sh_events')
            .select(`
              id, title, short_description, description, start_at, end_at, 
              event_type, payment_type, base_price, currency, cover_image_url,
              venue_name, language_code, status, age_category
            `)
            .eq('is_public', true)
            .order('start_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (newError) throw newError;
          
          if (newEvents && newEvents.length > 0) {
            eventsData = newEvents;
            console.log(`✅ Loaded ${newEvents.length} events from new system`);
          }
        } catch (newError) {
          console.log('New events not found, trying old system...');
          
          // Fallback к старой таблице
          try {
            const { data: oldEvents, error: oldError } = await supabase
              .from('events')
              .select('*')
              .eq('active', true)
              .order('start_at', { ascending: false });

            if (!isMountedRef.current) return;

            if (oldError) throw oldError;
            
            if (oldEvents) {
              // Конвертируем старые события
              eventsData = oldEvents.map(event => ({
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
              console.log(`✅ Loaded ${oldEvents.length} events from old system`);
            }
          } catch (oldError) {
            console.error('❌ Error fetching old events:', oldError);
            throw oldError;
          }
        }

        if (!isMountedRef.current) return;

        setEvents(eventsData);
        setFilteredEvents(eventsData);
        console.log('✅ Events loaded successfully');
        
      } catch (err: any) {
        console.error('❌ Error fetching events:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Ошибка при загрузке мероприятий');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей

  // ИСПРАВЛЕННАЯ ФИЛЬТРАЦИЯ - запускается только при изменении нужных данных
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    let filtered = [...events];

    // Фильтр по времени (прошедшие/будущие)
    if (!showPast) {
      const now = new Date();
      filtered = filtered.filter(event => new Date(event.start_at) >= now);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.short_description?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      );
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

    setFilteredEvents(filtered);
  }, [events, searchQuery, sortBy, showPast]); // Только нужные зависимости

  if (loading) {
    return (
      <Layout>
        <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Загрузка мероприятий...</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg">
                  <h2 className="text-lg font-semibold mb-2">Ошибка загрузки</h2>
                  <p>{error}</p>
                </div>
              </div>
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
          
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Мероприятия
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Найдено {filteredEvents.length} мероприятий
            </p>
          </div>

          {/* Поиск и фильтры */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск мероприятий..."
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
                onClick={() => setShowPast(!showPast)}
                className={`px-4 py-2 rounded-lg ${
                  showPast 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {showPast ? 'Все' : 'Только будущие'}
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

          {/* События */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Мероприятия не найдены
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Попробуйте изменить поисковый запрос или фильтры
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {filteredEvents.map((event) => (
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
          )}
        </div>
      </main>
    </Layout>
  );
};

export default EventsPage;
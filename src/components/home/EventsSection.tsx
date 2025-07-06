// src/components/home/EventsSection.tsx
// ИСПРАВЛЕННАЯ ВЕРСИЯ - устранение бесконечных циклов

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Globe, Users, ArrowRight, Clock, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatTimeFromTimestamp, formatRussianDate } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

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

const LANGUAGE_LABELS: Record<string, string> = {
  'sr': 'Српски',
  'en': 'English', 
  'ru': 'Русский',
};

type Event = {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  start_at: string;
  end_at: string;
  language_code?: string;
  event_type: string;
  age_category: string;
  cover_image_url?: string;
  base_price?: number;
  currency: string;
  payment_type: string;
  venue_name?: string;
  registrations_count?: number;
  // Legacy поля для совместимости
  languages?: string[];
  bg_image?: string;
  price?: number;
};

type HomepageSettings = {
  events_count: number; 
  show_title: boolean;
  show_date: boolean;
  show_time: boolean;
  show_language: boolean;
  show_type: boolean;
  show_age: boolean;
  show_image: boolean;
  show_price: boolean;
};

const EventsSection = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // ФУНКЦИЯ ПОЛУЧЕНИЯ ЦЕНЫ - ВСЕГДА ПОКАЗЫВАЕМ ЦЕНУ
  const getEventPrice = (event: Event): string => {
    if (event.payment_type === 'free') return 'Бесплатно';
    if (event.payment_type === 'donation') return 'Донейшн';
    
    if (event.payment_type === 'paid') {
      // Приоритет: новое поле base_price
      if (event.base_price && event.base_price > 0) {
        return `${event.base_price} ${event.currency || 'RSD'}`;
      }
      // Fallback: legacy поле price
      if (event.price && event.price > 0) {
        return `${event.price} ${event.currency || 'RSD'}`;
      }
      return 'Цена уточняется';
    }
    
    // Legacy логика для старых событий
    if (event.price === 0 || event.price === null) {
      return 'Бесплатно';
    }
    
    if (event.price && event.price > 0) {
      return `${event.price} ${event.currency || 'RSD'}`;
    }
    
    return 'Бесплатно';
  };

  // ФУНКЦИЯ ПОЛУЧЕНИЯ ЯЗЫКА
  const getEventLanguage = (event: Event): string => {
    // Приоритет: новое поле language_code
    if (event.language_code) {
      return LANGUAGE_LABELS[event.language_code] || event.language_code;
    }
    
    // Fallback: legacy поле languages
    if (event.languages && Array.isArray(event.languages) && event.languages.length > 0) {
      const firstLang = event.languages[0];
      return LANGUAGE_LABELS[firstLang] || firstLang;
    }
    
    return 'Не указан';
  };

  // ФУНКЦИЯ ПОЛУЧЕНИЯ ТИПА СОБЫТИЯ НА РУССКОМ
  const getEventType = (event: Event): string => {
    return EVENT_TYPE_LABELS[event.event_type] || event.event_type;
  };

  // ФУНКЦИЯ ПОЛУЧЕНИЯ ИЗОБРАЖЕНИЯ
  const getEventImage = (event: Event): string => {
    // Приоритет: новое поле cover_image_url
    if (event.cover_image_url) {
      return getSupabaseImageUrl(event.cover_image_url);
    }
    
    // Fallback: legacy поле bg_image
    if (event.bg_image) {
      return getSupabaseImageUrl(event.bg_image);
    }
    
    return 'https://via.placeholder.com/400x200?text=No+Image';
  };

  // ИСПРАВЛЕННАЯ ЗАГРУЗКА ДАННЫХ - ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        
        console.log('🚀 Fetching events section data...');
        
        // Получаем настройки сначала из новой системы
        let settingsData;
        let eventsCount = 3;

        try {
          const { data: newSettings } = await supabase
            .from('sh_site_settings')
            .select('homepage_events_section')
            .eq('is_active', true)
            .single();

          if (newSettings?.homepage_events_section) {
            settingsData = newSettings.homepage_events_section;
            console.log('✅ Found new settings');
          }
        } catch (newError) {
          console.log('New settings not found, trying old system...');
          
          // Fallback к старой системе
          try {
            const { data: oldSettings } = await supabase
              .from('site_settings')
              .select('homepage_settings')
              .single();

            if (oldSettings?.homepage_settings?.events_section) {
              settingsData = oldSettings.homepage_settings.events_section;
              console.log('✅ Found old settings');
            }
          } catch (oldError) {
            console.log('Old settings not found, using defaults');
          }
        }

        if (!isMountedRef.current) return;

        if (settingsData) {
          eventsCount = settingsData.events_count || 3;
          setSettings({
            events_count: eventsCount,
            show_title: settingsData.show_title ?? true,
            show_date: settingsData.show_date ?? true,
            show_time: settingsData.show_time ?? true,
            show_language: settingsData.show_language ?? true,
            show_type: settingsData.show_type ?? true,
            show_age: settingsData.show_age ?? true,
            show_image: settingsData.show_image ?? true,
            show_price: settingsData.show_price ?? true
          });
        } else {
          // Дефолтные настройки
          setSettings({
            events_count: 3,
            show_title: true,
            show_date: true,
            show_time: true,
            show_language: true,
            show_type: true,
            show_age: true,
            show_image: true,
            show_price: true
          });
        }

        // Получаем события из новых таблиц
        let eventsData = [];
        
        try {
          const { data: newEvents, error: newError } = await supabase
            .from('sh_events')
            .select(`
              id, title, short_description, description, start_at, end_at,
              language_code, event_type, age_category, cover_image_url,
              base_price, currency, payment_type, venue_name
            `)
            .eq('status', 'active')
            .gte('start_at', new Date().toISOString())
            .order('start_at', { ascending: true })
            .limit(eventsCount);

          if (newError) throw newError;
          
          if (newEvents && newEvents.length > 0) {
            eventsData = newEvents;
            console.log(`✅ Found ${newEvents.length} events from new system`);
          }
        } catch (newError) {
          console.log('New events not found, trying old system...');
          
          // Fallback к старым событиям
          try {
            const { data: oldEvents, error: oldError } = await supabase
              .from('events')
              .select(`
                id, title, description, start_at, end_at,
                languages, type, age, bg_image, price
              `)
              .eq('active', true)
              .gte('start_at', new Date().toISOString())
              .order('start_at', { ascending: true })
              .limit(eventsCount);

            if (oldError) throw oldError;
            
            if (oldEvents) {
              // Конвертируем старые события в новый формат
              eventsData = oldEvents.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                start_at: event.start_at,
                end_at: event.end_at,
                languages: event.languages,
                event_type: event.type || 'other',
                age_category: event.age || 'all',
                bg_image: event.bg_image,
                price: event.price,
                currency: 'RSD',
                payment_type: event.price > 0 ? 'paid' : 'free'
              }));
              console.log(`✅ Found ${oldEvents.length} events from old system`);
            }
          } catch (oldError) {
            console.error('Error fetching old events:', oldError);
          }
        }

        if (!isMountedRef.current) return;

        setEvents(eventsData);
        console.log('✅ Events section data loaded successfully');
        
      } catch (err: any) {
        console.error('❌ Error fetching events section data:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Ошибка при загрузке данных');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей - загружаем только один раз

  if (loading) {
    return (
      <section className="py-16 bg-white dark:bg-dark-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white dark:bg-dark-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-red-500 dark:text-red-400">
              <p>Ошибка загрузки: {error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white dark:bg-dark-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ближайшие мероприятия
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Присоединяйтесь к нашим событиям и будьте частью научного сообщества
          </p>
        </div>

        {events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Изображение */}
                  {settings?.show_image && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getEventImage(event)}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* ТИП СОБЫТИЯ НА РУССКОМ */}
                      {settings?.show_type && (
                        <div className="absolute top-3 right-3 bg-primary-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                          {getEventType(event)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    {/* Заголовок */}
                    {settings?.show_title && (
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {event.title}
                      </h3>
                    )}

                    {/* Описание */}
                    {event.short_description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {event.short_description}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      {/* Дата */}
                      {settings?.show_date && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatRussianDate(event.start_at)}
                        </div>
                      )}

                      {/* Время */}
                      {settings?.show_time && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatTimeFromTimestamp(event.start_at)}
                        </div>
                      )}

                      {/* Язык */}
                      {settings?.show_language && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Globe className="h-4 w-4 mr-2" />
                          {getEventLanguage(event)}
                        </div>
                      )}

                      {/* Место */}
                      {event.venue_name && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.venue_name}
                        </div>
                      )}

                      {/* Участники */}
                      {event.registrations_count !== undefined && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-2" />
                          {event.registrations_count} участников
                        </div>
                      )}
                    </div>

                    {/* ЦЕНА И КНОПКА - ВСЕГДА ОТОБРАЖАЕТСЯ */}
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                      {settings?.show_price && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {getEventPrice(event)}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="h-4 w-4 text-primary-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <span>Все мероприятия</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Мероприятий пока нет
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Следите за обновлениями - скоро появятся новые события!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsSection;
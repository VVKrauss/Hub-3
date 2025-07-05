// src/components/home/EventsSection.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';
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
  // Legacy значения
  'Русский': 'Русский',
  'Английский': 'English',
  'Сербский': 'Српски'
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
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
          }
        } catch (newError) {
          console.log('New settings not found, trying old system...');
          
          // Fallback к старой системе
          const { data: oldSettings } = await supabase
            .from('site_settings')
            .select('homepage_settings')
            .single();

          if (oldSettings?.homepage_settings?.events_section) {
            settingsData = oldSettings.homepage_settings.events_section;
          }
        }

        if (settingsData) {
          eventsCount = settingsData.events_count || 3;
          setSettings({
            events_count: eventsCount,
            show_title: settingsData.show_title !== false,
            show_date: settingsData.show_date !== false,
            show_time: settingsData.show_time !== false,
            show_language: settingsData.show_language !== false,
            show_type: settingsData.show_type !== false,
            show_age: settingsData.show_age !== false,
            show_image: settingsData.show_image !== false,
            show_price: settingsData.show_price !== false
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

        // Получаем события сначала из новой системы
        let eventsData;
        
        try {
          const { data: newEvents, error: newError } = await supabase
            .from('sh_events')
            .select(`
              id, slug, title, short_description, description,
              start_at, end_at, language_code, event_type, age_category,
              cover_image_url, base_price, currency, payment_type, venue_name,
              status, is_public
            `)
            .eq('status', 'active')
            .eq('is_public', true)
            .gte('end_at', new Date().toISOString())
            .order('start_at', { ascending: true })
            .limit(eventsCount);

          if (!newError && newEvents && newEvents.length > 0) {
            eventsData = newEvents;
          }
        } catch (newError) {
          console.log('New events table not found, trying legacy...');
        }

        // Fallback к legacy системе
        if (!eventsData) {
          const { data: legacyEvents, error: legacyError } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'active')
            .order('start_at', { ascending: true })
            .limit(eventsCount);

          if (!legacyError) {
            eventsData = legacyEvents;
          }
        }

        setEvents(eventsData || []);
        
      } catch (err) {
        console.error('Error fetching events data:', err);
        setError('Не удалось загрузить события');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Загрузка мероприятий...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white dark:bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Предстоящие мероприятия
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Не пропустите интересные события в нашем центре
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
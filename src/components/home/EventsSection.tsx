import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Globe, Users, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatTimeFromTimestamp, formatRussianDate } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type Event = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  languages: string[];
  event_type: string;
  age_category: string;
  bg_image: string;
  price: number | null;
  currency: string;
  payment_type: string;
  // Legacy fields for backward compatibility
  date?: string;
  start_time?: string;
  end_time?: string;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch settings from site_settings table
        const { data: siteSettingsData, error: settingsError } = await supabase
          .from('site_settings')
          .select('homepage_settings')
          .single();

        let eventsCount = 3; // дефолтное значение

        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          // Если нет настроек, используем дефолтные значения
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
        } else {
          // Извлекаем настройки из jsonb поля или используем дефолтные
          const homepageSettings = siteSettingsData?.homepage_settings || {};
          eventsCount = homepageSettings.events_count || 3;
          
          setSettings({
            events_count: eventsCount,
            show_title: homepageSettings.show_title !== false,
            show_date: homepageSettings.show_date !== false,
            show_time: homepageSettings.show_time !== false,
            show_language: homepageSettings.show_language !== false,
            show_type: homepageSettings.show_type !== false,
            show_age: homepageSettings.show_age !== false,
            show_image: homepageSettings.show_image !== false,
            show_price: homepageSettings.show_price !== false
          });
        }

        // Fetch upcoming events
        const now = new Date().toISOString();
        
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .gte('end_at', now)  // Фильтруем по времени окончания события
          .order('start_at', { ascending: true })  // Сортируем по времени начала
          .limit(eventsCount);

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загружаем события...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>Ошибка загрузки событий: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  const {
    show_title = true,
    show_date = true,
    show_time = true,
    show_language = true,
    show_type = true,
    show_age = true,
    show_image = true,
    show_price = true
  } = settings || {};

  return (
    <section className="py-16 bg-gray-50 dark:bg-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ближайшие мероприятия
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Присоединяйтесь к нашим увлекательным научным событиям
          </p>
        </div>

        {events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group bg-white dark:bg-dark-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {show_image && (
                    <div className="relative h-48">
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getSupabaseImageUrl(event.bg_image)})` }}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                      </div>
                      
                      {/* Title overlay */}
                      {show_title && (
                        <div className="absolute inset-0 flex items-end p-4">
                          <h3 className="text-white text-lg font-semibold drop-shadow-md">
                            {event.title}
                          </h3>
                        </div>
                      )}
                      
                      {show_age && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 bg-black/70 text-white rounded-full text-xs font-medium">
                            {event.age_category}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-5">
                    {show_date && event.start_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {event.start_at && new Date(event.start_at).getTime() 
                            ? formatRussianDate(event.start_at)
                            : 'Дата не указана'
                          }
                        </span>
                        {show_time && event.start_at && (
                          <>
                            <Clock className="h-4 w-4 flex-shrink-0 ml-2" />
                            <span>{formatTimeFromTimestamp(event.start_at)}</span>
                          </>
                        )}
                      </div>
                    )}

                    {!show_image && show_title && (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {event.title}
                      </h3>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {show_language && event.languages && event.languages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {event.languages.join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {show_type && event.event_type && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {event.event_type}
                        </span>
                      )}
                    </div>

                    {show_price && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {event.payment_type === 'free' ? 'Бесплатно' : 
                             event.price ? `${event.price} ${event.currency || 'RSD'}` : 'Цена не указана'}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-primary-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
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
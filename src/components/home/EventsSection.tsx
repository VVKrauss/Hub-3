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
        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('homepage_settings')
          .select('*')
          .single();

        if (settingsError) throw settingsError;
        setSettings(settingsData);

        // Fetch upcoming events - исправленная фильтрация
        const now = new Date().toISOString();
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .gte('end_at', now)  // Фильтруем по времени окончания события
          .order('start_at', { ascending: true })  // Сортируем по времени начала
          .limit(settingsData?.events_count || 3);

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
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-dark-700 rounded mb-8 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 dark:bg-dark-700"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
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
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (!settings) {
    return null;
  }

  const {
    show_title = true,
    show_date = true,
    show_time = true,
    show_language = true,
    show_type = true,
    show_age = true,
    show_image = true,
    show_price = true,
    events_count = 3,
  } = settings;

  return (
    <section className="py-16 bg-gray-50 dark:bg-dark-800">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-semibold mb-12 text-left text-gray-900 dark:text-white">
          Наши мероприятия
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map(event => (
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
                        ? formatRussianDate(event.start_at, 'd MMMM')
                        : 'Дата не указана'
                      }
                    </span>
                  </div>
                )}
                
                <div className="space-y-3">
                  {show_time && event.start_at && event.end_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{formatTimeFromTimestamp(event.start_at)} - {formatTimeFromTimestamp(event.end_at)}</span>
                    </div>
                  )}
                  
                  {show_language && event.languages.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span>{event.languages.join(', ')}</span>
                    </div>
                  )}
                  
                  {show_type && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>{event.event_type}</span>
                    </div>
                  )}
                </div>
                
                {show_price && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                    <div className="text-base font-medium text-primary-600 dark:text-primary-400">
                      {event.payment_type === 'free' 
                        ? 'Бесплатно'
                        : event.payment_type === 'donation'
                          ? 'Донейшн'
                          : event.price === null
                            ? 'Подробнее'
                            : `${event.price} ${event.currency}`
                      }
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
          
          {/* "All Events" card */}
          <Link 
            to="/events"
            className="group bg-white dark:bg-dark-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="mb-3 p-3 bg-gray-100 dark:bg-dark-800 rounded-full">
              <ArrowRight className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Все мероприятия
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Смотреть полное расписание
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default EventsSection; 
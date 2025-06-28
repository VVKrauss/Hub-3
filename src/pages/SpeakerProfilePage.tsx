import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Mail, Globe, MapPin, Link2, Calendar, Clock, Globe2, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRussianDate, formatTimeFromTimestamp, isValidDateString } from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  date_of_birth?: string;
  photos: { url: string; isMain?: boolean }[];
  contact_info?: {
    email?: string;
    website?: string;
    location?: string;
  };
  achievements?: string[];
  past_events?: Array<{
    title: string;
    date: string;
  }>;
  blog_visibility?: boolean;
  blogs?: string | Array<{ url: string; platform: string }>;
}

interface Event {
  id: string;
  title: string;
  description: string;
  short_description: string;
  start_at: string;
  end_at: string;
  location: string;
  event_type: string;
  languages: string[];
  speakers: { id: string; name: string }[];
  bg_image: string | null;
  original_bg_image?: string | null;
  status: 'active' | 'draft' | 'past';
}

const SpeakerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);

  // Безопасная функция форматирования даты
  const formatEventDate = (dateString: string | null | undefined): string => {
    if (!isValidDateString(dateString)) {
      return 'Дата не указана';
    }
    
    try {
      return formatRussianDate(dateString!, 'd MMMM yyyy');
    } catch (error) {
      console.error('Error formatting date in SpeakerProfile:', dateString, error);
      return 'Ошибка даты';
    }
  };

  // Безопасная функция форматирования времени
  const formatEventTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '--:--';
    
    try {
      return formatTimeFromTimestamp(timeString);
    } catch (error) {
      console.error('Error formatting time in SpeakerProfile:', timeString, error);
      return '--:--';
    }
  };

  // Функция для определения, прошло ли событие
  const isEventPast = (event: Event): boolean => {
    try {
      if (event.status === 'past') return true;
      
      if (!event.end_at) return false;
      
      const eventEndTime = new Date(event.end_at);
      if (isNaN(eventEndTime.getTime())) return false;
      
      return eventEndTime < new Date();
    } catch (error) {
      console.error('Error checking if event is past:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchSpeaker = async () => {
      try {
        const { data, error } = await supabase
          .from('speakers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        const uniquePhotos = data.photos ? 
          data.photos.filter((photo, index, self) => 
            index === self.findIndex((p) => p.url === photo.url)
          ) : [];
        
        setSpeaker({
          ...data,
          photos: uniquePhotos
        });
      } catch (error) {
        console.error('Error fetching speaker:', error);
        toast.error('Не удалось загрузить информацию о спикере');
      } finally {
        setLoading(false);
      }
    };

    fetchSpeaker();
  }, [id]);

  useEffect(() => {
    const fetchSpeakerEvents = async () => {
      if (!speaker) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            short_description,
            start_at,
            end_at,
            location,
            event_type,
            languages,
            speakers,
            bg_image,
            original_bg_image,
            status
          `)
          .or(`speakers.cs.["${speaker.id}"],speakers.cs.{"id":"${speaker.id}"}`);

        if (error) throw error;

        const upcoming: Event[] = [];
        const past: Event[] = [];

        data?.forEach(event => {
          isEventPast(event) ? past.push(event) : upcoming.push(event);
        });

        setUpcomingEvents(upcoming);
        setPastEvents(past);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Не удалось загрузить мероприятия спикера');
      } finally {
        setEventsLoading(false);
      }
    };

    if (speaker) {
      fetchSpeakerEvents();
    }
  }, [speaker]);

  useEffect(() => {
    if (!loading && photoRef.current) {
      photoRef.current.focus();
    }
  }, [loading]);

  const nextSlide = () => {
    if (!speaker) return;
    setCurrentSlide((prev) => 
      prev === speaker.photos.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    if (!speaker) return;
    setCurrentSlide((prev) => 
      prev === 0 ? speaker.photos.length - 1 : prev - 1
    );
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isFullscreen) {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, currentSlide]);

  const parseBlogs = (blogs: string | Array<{ url: string; platform: string }>) => {
    try {
      if (typeof blogs === 'string') {
        return JSON.parse(blogs) as Array<{ url: string; platform: string }>;
      }
      return blogs;
    } catch (error) {
      console.error('Error parsing blogs:', error);
      return null;
    }
  };

  const renderDescription = (description: string) => {
    if (!description) {
      return <p className="text-gray-500 dark:text-gray-400">Описание спикера отсутствует</p>;
    }

    // Разбиваем текст на части, сохраняя ссылки и обычный текст
    const parts = [];
    let lastIndex = 0;
    let match;

    // Регулярное выражение для поиска ссылок
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1(?:[^>]*?)>(.*?)<\/a>/g;

    while ((match = linkRegex.exec(description)) !== null) {
      // Текст до ссылки
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: description.substring(lastIndex, match.index)
        });
      }

      // Сама ссылка
      parts.push({
        type: 'link',
        url: match[2],
        text: match[3]
      });

      lastIndex = match.index + match[0].length;
    }

    // Текст после последней ссылки
    if (lastIndex < description.length) {
      parts.push({
        type: 'text',
        content: description.substring(lastIndex)
      });
    }

    return (
      <div className="text-dark-600 dark:text-dark-300">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          } else if (part.type === 'link') {
            return (
              <a
                key={index}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:opacity-80 underline"
              >
                {part.text}
              </a>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const getEventDescription = (event: Event) => {
    if (event.short_description) return event.short_description;
    if (event.description) {
      return event.description.length > 200 
        ? `${event.description.substring(0, 200)}...` 
        : event.description;
    }
    return 'Описание мероприятия отсутствует';
  };

  const renderEventCard = (event: Event) => {
    const isPast = isEventPast(event);
    
    return (
      <div 
        key={event.id}
        className="relative border border-gray-200 dark:border-dark-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 min-h-[250px] group"
      >
        {/* Фоновое изображение мероприятия */}
        <div className="absolute inset-0 z-0">
          {event.bg_image ? (
            <>
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image}`}
                alt={event.title}
                className="w-full h-full object-cover opacity-60 dark:opacity-50 group-hover:opacity-70 dark:group-hover:opacity-60 transition-opacity duration-300"
                onError={(e) => {
                  // Fallback на оригинальное изображение если есть
                  const img = e.target as HTMLImageElement;
                  if (event.original_bg_image && !img.dataset.triedOriginal) {
                    img.dataset.triedOriginal = 'true';
                    img.src = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.original_bg_image}`;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/70 to-white/50 dark:from-dark-900/90 dark:via-dark-900/70 dark:to-dark-900/50"></div>
            </>
          ) : (
            // Градиентный фон для карточек без изображения
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-700 opacity-50"></div>
          )}
        </div>
        
        <div className="relative z-10 p-5 h-full flex flex-col">
          {/* Заголовок и статус */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-dark-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {event.title}
            </h3>
            {isPast && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100/90 dark:bg-dark-700/90 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
                Прошедшее
              </span>
            )}
          </div>
          
          {/* Описание */}
          <p className="text-dark-600 dark:text-dark-300 mb-4 flex-grow line-clamp-3">
            {getEventDescription(event)}
          </p>
          
          {/* Информация о мероприятии */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-dark-600 dark:text-dark-400">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
              <span className="font-medium">{formatEventDate(event.start_at)}</span>
            </div>
            
            <div className="flex items-center text-dark-600 dark:text-dark-400">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
              <span>{formatEventTime(event.start_at)} - {formatEventTime(event.end_at)}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center text-dark-600 dark:text-dark-400">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.languages && event.languages.length > 0 && (
              <div className="flex items-center text-dark-600 dark:text-dark-400">
                <Globe2 className="h-4 w-4 mr-2 flex-shrink-0 text-primary-500" />
                <span>{event.languages.join(', ')}</span>
              </div>
            )}
          </div>
          
          {/* Кнопка подробнее */}
          <div className="mt-4 pt-4 border-t border-gray-200/80 dark:border-dark-700/80">
            <a
              href={`/events/${event.id}`}
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold group/link"
            >
              <span>Подробнее</span>
              <svg className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderGallery = () => {
    if (!speaker || speaker.photos.length === 0) {
      return (
        <div className="w-full h-64 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Нет фото</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Основное изображение */}
        <div 
          className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-700 cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos[currentSlide].url}`}
              alt={speaker.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>

          {speaker.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Миниатюры */}
        {speaker.photos.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {speaker.photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`aspect-square overflow-hidden rounded-md transition-all ${
                  index === currentSlide 
                    ? 'ring-2 ring-primary-500' 
                    : 'opacity-80 hover:opacity-100 hover:ring-1 hover:ring-gray-300'
                }`}
              >
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo.url}`}
                  alt={`Фото ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Полноэкранный просмотр */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreen(false)}
            >
              <button 
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(false);
                }}
              >
                <X className="h-8 w-8" />
              </button>

              <div className="relative w-full max-w-6xl h-full max-h-screen">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlide}
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos[currentSlide].url}`}
                    alt={speaker.name}
                    className="w-full h-full object-contain"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </AnimatePresence>

                {speaker.photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevSlide();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full z-10 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextSlide();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full z-10 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {speaker.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'w-6 bg-primary-500' 
                          : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!speaker) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-red-600">
          Спикер не найден
        </div>
      </Layout>
    );
  }

  const parsedBlogs = speaker.blog_visibility ? parseBlogs(speaker.blogs || '[]') : null;
  const hasBlogs = parsedBlogs && parsedBlogs.length > 0;

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-dark-800 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200 transition-colors mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            Назад к списку спикеров
          </button>

          <div className="bg-white dark:bg-dark-900 rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              <div 
                ref={photoRef}
                tabIndex={-1}
                className="w-full md:w-1/3 lg:w-1/4 p-6 outline-none"
              >
                {renderGallery()}
              </div>

              <div className="w-full md:w-2/3 lg:w-3/4 p-6 md:p-8 flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-bold text-dark-800 dark:text-white mb-2">
                  {speaker.name}
                </h1>
                <p className="text-xl text-primary-600 dark:text-primary-400 mb-6">
                  {speaker.field_of_expertise}
                </p>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  {speaker.contact_info?.email && (
                    <a 
                      href={`mailto:${speaker.contact_info.email}`}
                      className="flex items-center gap-2 text-dark-600 dark:text-dark-300 hover:text-primary-500 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>{speaker.contact_info.email}</span>
                    </a>
                  )}
                  {speaker.contact_info?.website && (
                    <a 
                      href={speaker.contact_info.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-dark-600 dark:text-dark-300 hover:text-primary-500 transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                      <span>{speaker.contact_info.website}</span>
                    </a>
                  )}
                  {speaker.contact_info?.location && (
                    <div className="flex items-center gap-2 text-dark-600 dark:text-dark-300">
                      <MapPin className="h-5 w-5" />
                      <span>{speaker.contact_info.location}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {renderDescription(speaker.description)}
                </div>

                {hasBlogs && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-dark-800 dark:text-white">
                      Блоги и социальные сети
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {parsedBlogs.map((blog, index) => (
                        <a
                          key={index}
                          href={blog.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors text-dark-700 dark:text-dark-200"
                        >
                          <Link2 className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{blog.platform}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {Array.isArray(speaker.achievements) && speaker.achievements.length > 0 && (
              <div className="bg-white dark:bg-dark-900 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Достижения</h2>
                <ul className="space-y-3">
                  {speaker.achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-primary-500 mr-2 mt-1">•</span>
                      <span className="text-dark-600 dark:text-dark-300">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white dark:bg-dark-900 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Ближайшие мероприятия</h2>
              {eventsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map(renderEventCard)}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Нет запланированных мероприятий
                </p>
              )}
            </div>

            {pastEvents.length > 0 && (
              <div className="bg-white dark:bg-dark-900 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Прошедшие мероприятия</h2>
                <div className="space-y-4">
                  {pastEvents.map(renderEventCard)}
                </div>
              </div>
            )}

            {Array.isArray(speaker.past_events) && speaker.past_events.length > 0 && (
              <div className="bg-white dark:bg-dark-900 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">История выступлений</h2>
                <div className="space-y-4">
                  {speaker.past_events.map((event, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-dark-700 last:border-0"
                    >
                      <span className="font-medium text-dark-800 dark:text-white">{event.title}</span>
                      <span className="text-dark-500 dark:text-dark-400">
                        {formatEventDate(event.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SpeakerProfilePage;
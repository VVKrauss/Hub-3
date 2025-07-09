// src/pages/SpeakerProfilePage.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  ExternalLink,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Github,
  BookOpen,
  GraduationCap,
  Play
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers } from '../hooks/useFavorites';
import FavoriteButton from '../components/favorites/FavoriteButton';
import { getSpeaker } from '../api/speakers';
import { getEventsBySpeaker } from '../api/events';
import { supabase } from '../lib/supabase';
import type { SpeakerWithSocials, EventWithDetails } from '../types/database';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

// Интерфейс для курсов
interface Course {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  course_type: 'offline' | 'online' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  duration_hours?: number;
  price?: number;
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url?: string;
  instructor_id?: string;
  is_featured: boolean;
  is_public: boolean;
  start_date?: string;
  end_date?: string;
  max_students?: number;
  current_students: number;
}

const SpeakerProfilePage = () => { 
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Функции форматирования
  const formatDate = (dateString: string): string => {
    return formatRussianDate(dateString, 'd MMMM yyyy');
  };

  const formatTime = (dateString: string): string => {
    return formatTimeFromTimestamp(dateString);
  };
  
  // Состояние
  const [speaker, setSpeaker] = useState<SpeakerWithSocials | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Хуки для избранного
  const { 
    toggleFavoriteSpeaker, 
    isFavoriteSpeaker, 
    loading: favLoading 
  } = useFavoriteSpeakers(user?.id);

  useEffect(() => {
    if (id) {
      fetchSpeaker(id);
      fetchSpeakerEvents(id);
      fetchSpeakerCourses(id);
    }
  }, [id]);

  const fetchSpeaker = async (speakerId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching speaker:', speakerId);
      
      const result = await getSpeaker(speakerId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Спикер не найден');
      }

      console.log('Speaker loaded successfully:', result.data);
      setSpeaker(result.data);

    } catch (err: any) {
      console.error('Error fetching speaker:', err);
      setError(err.message || 'Ошибка при загрузке спикера');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeakerEvents = async (speakerId: string) => {
    try {
      setEventsLoading(true);

      console.log('Fetching speaker events:', speakerId);
      
      const result = await getEventsBySpeaker(speakerId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        const now = new Date();
        const upcoming = result.data.filter(event => new Date(event.start_at) >= now);
        const past = result.data.filter(event => new Date(event.start_at) < now);
        
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      }

    } catch (err: any) {
      console.error('Error fetching speaker events:', err);
      // Не показываем ошибку пользователю, просто логируем
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchSpeakerCourses = async (speakerId: string) => {
    try {
      setCoursesLoading(true);

      console.log('Fetching speaker courses:', speakerId);
      
      // Получаем курсы где спикер является инструктором
      const { data, error } = await supabase
        .from('sh_courses')
        .select('*')
        .eq('instructor_id', speakerId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Courses loaded successfully:', data?.length || 0);
      setCourses(data || []);

    } catch (err: any) {
      console.error('Error fetching speaker courses:', err);
      // Не показываем ошибку пользователю, просто логируем
    } finally {
      setCoursesLoading(false);
    }
  };

  // Функция для получения иконки социальной сети
  const getSocialIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className={iconClass} />;
      case 'twitter': return <Twitter className={iconClass} />;
      case 'instagram': return <Instagram className={iconClass} />;
      case 'facebook': return <Facebook className={iconClass} />;
      case 'youtube': return <Youtube className={iconClass} />;
      case 'github': return <Github className={iconClass} />;
      case 'website':
      case 'blog':
      case 'site': return <Globe className={iconClass} />;
      default: return <Globe className={iconClass} />;
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user || !speaker) {
      toast.error('Войдите в аккаунт для добавления в избранное');
      return;
    }

    try {
      await toggleFavoriteSpeaker(speaker.id);
      const isNowFavorite = isFavoriteEvent(speaker.id);
      toast.success(isNowFavorite ? 'Добавлено в избранное' : 'Удалено из избранного');
    } catch (error) {
      toast.error('Ошибка при изменении избранного');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !speaker) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Спикер не найден'}
            </h2>
            <button
              onClick={() => navigate('/speakers')}
              className="btn-primary"
            >
              Вернуться к спикерам
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Кнопка назад */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => navigate('/speakers')}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к спикерам
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Главная секция с большой фотографией */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="md:flex">
              {/* Большая фотография */}
              <div className="md:w-1/3 lg:w-2/5">
                <div className="aspect-square md:aspect-auto md:h-96 relative">
                  {speaker.avatar_url ? (
                    <img
                      src={getSupabaseImageUrl(speaker.avatar_url)}
                      alt={speaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Информация о спикере */}
              <div className="md:w-2/3 lg:w-3/5 p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {speaker.name}
                    </h1>
                    
                    {speaker.field_of_expertise && (
                      <p className="text-xl text-primary-600 dark:text-primary-400 mb-4">
                        {speaker.field_of_expertise}
                      </p>
                    )}

                    {/* Статус и значки */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        speaker.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : speaker.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {speaker.status === 'active' ? 'Активный спикер' :
                         speaker.status === 'pending' ? 'На рассмотрении' :
                         speaker.status === 'inactive' ? 'Неактивный' : speaker.status}
                      </span>
                      
                      {speaker.is_featured && (
                        <span className="inline-flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                          ⭐ Рекомендуемый
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Кнопка избранного */}
                  {user && (
                    <FavoriteButton
                      isFavorite={isFavoriteEvent(speaker.id)}
                      onToggle={handleFavoriteToggle}
                      loading={favLoading}
                    />
                  )}
                </div>

                {/* Социальные ссылки */}
                {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-6">
                    {speaker.sh_speaker_social_links
                      .filter(link => link.is_public)
                      .map((social) => (
                        <a
                          key={social.id}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title={social.display_name || social.platform}
                        >
                          {getSocialIcon(social.platform)}
                          <span className="ml-2 capitalize">
                            {social.display_name || social.platform}
                          </span>
                        </a>
                      ))}
                  </div>
                )}

                {/* Краткая статистика */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {upcomingEvents.length + pastEvents.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Мероприятий</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {courses.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Курсов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {upcomingEvents.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Предстоящих</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Биография */}
          {speaker.bio && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                О спикере
              </h2>
              <div 
                className="prose prose-gray dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: speaker.bio }}
              />
            </div>
          )}

          {/* Курсы спикера */}
          {courses.length > 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Курсы
              </h2>
              
              {coursesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Изображение курса */}
                      <div className="aspect-video relative">
                        {course.cover_image_url ? (
                          <img
                            src={getSupabaseImageUrl(course.cover_image_url)}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Тип курса */}
                        <div className="absolute top-2 left-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            course.course_type === 'online'
                              ? 'bg-blue-100 text-blue-800'
                              : course.course_type === 'offline'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {course.course_type === 'online' ? 'Онлайн' :
                             course.course_type === 'offline' ? 'Очно' : 'Гибридный'}
                          </span>
                        </div>

                        {/* Уровень */}
                        <div className="absolute top-2 right-2">
                          <span className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs font-medium rounded">
                            {course.level === 'beginner' ? 'Начинающий' :
                             course.level === 'intermediate' ? 'Средний' : 'Продвинутый'}
                          </span>
                        </div>
                      </div>

                      {/* Информация о курсе */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        
                        {course.short_description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                            {course.short_description}
                          </p>
                        )}

                        {/* Детали курса */}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {course.duration_hours && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {course.duration_hours}ч
                            </span>
                          )}
                          
                          {course.max_students && (
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {course.current_students}/{course.max_students}
                            </span>
                          )}
                        </div>

                        {/* Цена и кнопка */}
                        <div className="flex items-center justify-between">
                          <div>
                            {course.payment_type === 'free' ? (
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                Бесплатно
                              </span>
                            ) : course.price ? (
                              <span className="text-gray-900 dark:text-white font-semibold">
                                {course.price} {course.currency}
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                Цена не указана
                              </span>
                            )}
                          </div>
                          
                          <Link
                            to={`/courses/${course.id}`}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm"
                          >
                            Подробнее
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Предстоящие мероприятия */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Предстоящие мероприятия
            </h2>
            
            {eventsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Предстоящих мероприятий нет
                </p>
              </div>
            )}
          </div>

          {/* Прошедшие мероприятия */}
          {pastEvents.length > 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Прошедшие мероприятия
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.slice(0, 6).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              
              {pastEvents.length > 6 && (
                <div className="text-center mt-6">
                  <Link
                    to={`/events?speaker=${speaker.id}`}
                    className="inline-flex items-center text-primary-600 hover:text-primary-700"
                  >
                    Показать все мероприятия
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default SpeakerProfilePage;
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Star,
  Award,
  BookOpen,
  Play,
  CheckCircle,
  Globe,
  Loader2,
  ArrowLeft,
  MonitorPlay,
  Building2,
  Zap,
  Download,
  ExternalLink,
  User,
  Target,
  List,
  GraduationCap
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { formatRussianDate } from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  course_type: 'online' | 'offline' | 'hybrid';
  status: 'draft' | 'active' | 'archived' | 'completed';
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  tags?: string[];
  language_code: string;
  duration_weeks?: number;
  duration_hours?: number;
  start_date?: string;
  end_date?: string;
  enrollment_start?: string;
  enrollment_end?: string;
  max_students?: number;
  current_students: number;
  price?: number;
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url?: string;
  gallery_images?: string[];
  video_url?: string;
  syllabus?: any;
  requirements?: string[];
  learning_outcomes?: string[];
  certificate_available: boolean;
  instructor_id?: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  online_platform?: string;
  online_meeting_url?: string;
  is_featured: boolean;
  is_public: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  // Связанные данные
  instructor?: {
    id: string;
    name: string;
    title?: string;
    bio?: string;
    avatar_url?: string;
    social_links?: any[];
  };
}

const CourseDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCourse();
    }
  }, [slug]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:speakers(
            id,
            name,
            title,
            bio,
            avatar_url,
            social_links:sh_speaker_social_links(
              platform,
              url,
              display_name,
              is_public
            )
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('is_public', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Курс не найден');
        } else {
          throw fetchError;
        }
        return;
      }

      setCourse(data);

      // Обновляем title страницы
      if (data?.meta_title) {
        document.title = data.meta_title;
      } else {
        document.title = `${data?.title} | Science Hub`;
      }

      // Обновляем meta description
      if (data?.meta_description) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', data.meta_description);
        }
      }

    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Ошибка при загрузке курса');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    try {
      setEnrolling(true);
      // Здесь будет логика записи на курс
      // Пока просто показываем уведомление
      alert('Функция записи на курс будет добавлена в ближайшее время');
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Ошибка при записи на курс');
    } finally {
      setEnrolling(false);
    }
  };

  // Форматирование цены
  const formatPrice = (course: Course): string => {
    if (course.payment_type === 'free') {
      return 'Бесплатно';
    }
    
    if (course.price && course.price > 0) {
      return `${course.price} ${course.currency || 'RUB'}`;
    }
    
    return 'По запросу';
  };

  // Форматирование продолжительности
  const formatDuration = (course: Course): string => {
    const parts = [];
    
    if (course.duration_weeks) {
      parts.push(`${course.duration_weeks} ${course.duration_weeks === 1 ? 'неделя' : course.duration_weeks < 5 ? 'недели' : 'недель'}`);
    }
    
    if (course.duration_hours) {
      parts.push(`${course.duration_hours} ${course.duration_hours === 1 ? 'час' : course.duration_hours < 5 ? 'часа' : 'часов'}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Не указано';
  };

  // Получение иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <MonitorPlay className="h-5 w-5" />;
      case 'offline':
        return <Building2 className="h-5 w-5" />;
      case 'hybrid':
        return <Zap className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  // Получение названия уровня на русском
  const getLevelName = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Начальный';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
      default:
        return level;
    }
  };

  // Получение цвета уровня
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Получение названия типа курса на русском
  const getCourseTypeName = (type: string) => {
    switch (type) {
      case 'online':
        return 'Онлайн курс';
      case 'offline':
        return 'Очный курс';
      case 'hybrid':
        return 'Гибридный курс';
      default:
        return 'Курс';
    }
  };

  // Проверка возможности записи
  const canEnroll = (course: Course): boolean => {
    if (!course.enrollment_start && !course.enrollment_end) return true;
    
    const now = new Date();
    const enrollStart = course.enrollment_start ? new Date(course.enrollment_start) : null;
    const enrollEnd = course.enrollment_end ? new Date(course.enrollment_end) : null;
    
    if (enrollStart && now < enrollStart) return false;
    if (enrollEnd && now > enrollEnd) return false;
    
    if (course.max_students && course.current_students >= course.max_students) return false;
    
    return true;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Загружаем курс...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error || 'Курс не найден'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Возможно, курс был удален или перемещен
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к курсам
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Хлебные крошки */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
                Главная
              </Link>
              <span className="text-gray-400">/</span>
              <Link to="/courses" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
                Курсы
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 dark:text-white font-medium">{course.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основной контент */}
            <div className="lg:col-span-2 space-y-8">
              {/* Заголовок и основная информация */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Изображение курса */}
                {course.cover_image_url && (
                  <div className="h-64 md:h-80 overflow-hidden">
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Бейджи */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.is_featured && (
                      <span className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        Рекомендуем
                      </span>
                    )}
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getLevelColor(course.level)}`}>
                      {getLevelName(course.level)}
                    </span>
                    <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      {getCourseTypeIcon(course.course_type)}
                      {getCourseTypeName(course.course_type)}
                    </span>
                    {course.certificate_available && (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Сертификат
                      </span>
                    )}
                  </div>

                  {/* Заголовок */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {course.title}
                  </h1>

                  {/* Краткое описание */}
                  {course.short_description && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                      {course.short_description}
                    </p>
                  )}

                  {/* Основная информация */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Продолжительность */}
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Продолжительность:</span>
                        <br />
                        <span>{formatDuration(course)}</span>
                      </div>
                    </div>

                    {/* Дата начала */}
                    {course.start_date && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Начало курса:</span>
                          <br />
                          <span>{formatRussianDate(course.start_date)}</span>
                        </div>
                      </div>
                    )}

                    {/* Количество студентов */}
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Студенты:</span>
                        <br />
                        <span>
                          {course.current_students} записалось
                          {course.max_students && ` из ${course.max_students} мест`}
                        </span>
                      </div>
                    </div>

                    {/* Локация или платформа */}
                    {course.location_type === 'online' && course.online_platform ? (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Globe className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Платформа:</span>
                          <br />
                          <span>{course.online_platform}</span>
                        </div>
                      </div>
                    ) : course.venue_name && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <MapPin className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Место проведения:</span>
                          <br />
                          <span>{course.venue_name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Прогресс бар заполненности */}
                  {course.max_students && course.max_students > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Заполненность курса
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round((course.current_students / course.max_students) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((course.current_students / course.max_students) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Описание курса */}
              {course.description && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    О курсе
                  </h2>
                  <div 
                    className="prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                </div>
              )}

              {/* Программа курса */}
              {course.syllabus && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <List className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Программа курса
                  </h2>
                  <div className="space-y-4">
                    {/* Здесь будет отображение программы курса из JSON */}
                    <p className="text-gray-600 dark:text-gray-400">
                      Детальная программа будет добавлена позже
                    </p>
                  </div>
                </div>
              )}

              {/* Результаты обучения */}
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Что вы изучите
                  </h2>
                  <ul className="space-y-3">
                    {course.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-400">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Требования */}
              {course.requirements && course.requirements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Требования
                  </h2>
                  <ul className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-600 dark:text-gray-400">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Инструктор */}
              {course.instructor && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Инструктор
                  </h2>
                  <div className="flex items-start gap-4">
                    {course.instructor.avatar_url ? (
                      <img
                        src={course.instructor.avatar_url}
                        alt={course.instructor.name}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">
                          {course.instructor.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {course.instructor.name}
                      </h3>
                      {course.instructor.title && (
                        <p className="text-primary-600 dark:text-primary-400 font-medium mb-2">
                          {course.instructor.title}
                        </p>
                      )}
                      {course.instructor.bio && (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {course.instructor.bio}
                        </p>
                      )}
                      <Link
                        to={`/speakers/${course.instructor.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium mt-3"
                      >
                        Подробнее об инструкторе
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Боковая панель */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Карточка записи */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                      {formatPrice(course)}
                    </div>
                    {course.payment_type !== 'free' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        За весь курс
                      </p>
                    )}
                  </div>

                  {canEnroll(course) ? (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Записываем...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-5 w-5" />
                          Записаться на курс
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-3 px-6 rounded-lg font-medium mb-2">
                        Запись недоступна
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {course.max_students && course.current_students >= course.max_students
                          ? 'Все места заняты'
                          : 'Запись временно закрыта'
                        }
                      </p>
                    </div>
                  )}

                  {/* Дополнительная информация */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {course.enrollment_end && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Запись до:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatRussianDate(course.enrollment_end)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Язык:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {course.language_code === 'ru' ? 'Русский' : course.language_code}
                      </span>
                    </div>

                    {course.certificate_available && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Сертификат:</span>
                        <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          Да
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Дополнительные действия */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Поделиться курсом
                  </h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors">
                      <Download className="h-4 w-4" />
                      Скачать программу
                    </button>
                    
                    <button 
                      onClick={() => navigator.share?.({ 
                        title: course.title, 
                        url: window.location.href 
                      })}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Поделиться
                    </button>
                  </div>
                </div>

                {/* Похожие курсы */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Похожие курсы
                  </h3>
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Скоро появятся рекомендации</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetailsPage;import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Star,
  Award,
  BookOpen,
  Play,
  CheckCircle,
  Globe,
  Loader2,
  ArrowLeft,
  MonitorPlay,
  Building2,
  Zap,
  Download,
  ExternalLink,
  User,
  Target,
  List,
  GraduationCap
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { formatRussianDate } from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  course_type: 'online' | 'offline' | 'hybrid';
  status: 'draft' | 'active' | 'archived' | 'completed';
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  tags?: string[];
  language_code: string;
  duration_weeks?: number;
  duration_hours?: number;
  start_date?: string;
  end_date?: string;
  enrollment_start?: string;
  enrollment_end?: string;
  max_students?: number;
  current_students: number;
  price?: number;
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url?: string;
  gallery_images?: string[];
  video_url?: string;
  syllabus?: any;
  requirements?: string[];
  learning_outcomes?: string[];
  certificate_available: boolean;
  instructor_id?: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  online_platform?: string;
  online_meeting_url?: string;
  is_featured: boolean;
  is_public: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  // Связанные данные
  instructor?: {
    id: string;
    name: string;
    title?: string;
    bio?: string;
    avatar_url?: string;
    social_links?: any[];
  };
}

const CourseDetailsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCourse();
    }
  }, [slug]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:speakers(
            id,
            name,
            title,
            bio,
            avatar_url,
            social_links:sh_speaker_social_links(
              platform,
              url,
              display_name,
              is_public
            )
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('is_public', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Курс не найден');
        } else {
          throw fetchError;
        }
        return;
      }

      setCourse(data);

      // Обновляем title страницы
      if (data?.meta_title) {
        document.title = data.meta_title;
      } else {
        document.title = `${data?.title} | Science Hub`;
      }

      // Обновляем meta description
      if (data?.meta_description) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', data.meta_description);
        }
      }

    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Ошибка при загрузке курса');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    try {
      setEnrolling(true);
      // Здесь будет логика записи на курс
      // Пока просто показываем уведомление
      alert('Функция записи на курс будет добавлена в ближайшее время');
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Ошибка при записи на курс');
    } finally {
      setEnrolling(false);
    }
  };

  // Форматирование цены
  const formatPrice = (course: Course): string => {
    if (course.payment_type === 'free') {
      return 'Бесплатно';
    }
    
    if (course.price && course.price > 0) {
      return `${course.price} ${course.currency || 'RUB'}`;
    }
    
    return 'По запросу';
  };

  // Форматирование продолжительности
  const formatDuration = (course: Course): string => {
    const parts = [];
    
    if (course.duration_weeks) {
      parts.push(`${course.duration_weeks} ${course.duration_weeks === 1 ? 'неделя' : course.duration_weeks < 5 ? 'недели' : 'недель'}`);
    }
    
    if (course.duration_hours) {
      parts.push(`${course.duration_hours} ${course.duration_hours === 1 ? 'час' : course.duration_hours < 5 ? 'часа' : 'часов'}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Не указано';
  };

  // Получение иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <MonitorPlay className="h-5 w-5" />;
      case 'offline':
        return <Building2 className="h-5 w-5" />;
      case 'hybrid':
        return <Zap className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  // Получение названия уровня на русском
  const getLevelName = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Начальный';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
      default:
        return level;
    }
  };

  // Получение цвета уровня
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Получение названия типа курса на русском
  const getCourseTypeName = (type: string) => {
    switch (type) {
      case 'online':
        return 'Онлайн курс';
      case 'offline':
        return 'Очный курс';
      case 'hybrid':
        return 'Гибридный курс';
      default:
        return 'Курс';
    }
  };

  // Проверка возможности записи
  const canEnroll = (course: Course): boolean => {
    if (!course.enrollment_start && !course.enrollment_end) return true;
    
    const now = new Date();
    const enrollStart = course.enrollment_start ? new Date(course.enrollment_start) : null;
    const enrollEnd = course.enrollment_end ? new Date(course.enrollment_end) : null;
    
    if (enrollStart && now < enrollStart) return false;
    if (enrollEnd && now > enrollEnd) return false;
    
    if (course.max_students && course.current_students >= course.max_students) return false;
    
    return true;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Загружаем курс...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error || 'Курс не найден'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Возможно, курс был удален или перемещен
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к курсам
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Хлебные крошки */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
                Главная
              </Link>
              <span className="text-gray-400">/</span>
              <Link to="/courses" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
                Курсы
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 dark:text-white font-medium">{course.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основной контент */}
            <div className="lg:col-span-2 space-y-8">
              {/* Заголовок и основная информация */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Изображение курса */}
                {course.cover_image_url && (
                  <div className="h-64 md:h-80 overflow-hidden">
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Бейджи */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.is_featured && (
                      <span className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        Рекомендуем
                      </span>
                    )}
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getLevelColor(course.level)}`}>
                      {getLevelName(course.level)}
                    </span>
                    <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      {getCourseTypeIcon(course.course_type)}
                      {getCourseTypeName(course.course_type)}
                    </span>
                    {course.certificate_available && (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Сертификат
                      </span>
                    )}
                  </div>

                  {/* Заголовок */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {course.title}
                  </h1>

                  {/* Краткое описание */}
                  {course.short_description && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                      {course.short_description}
                    </p>
                  )}

                  {/* Основная информация */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Продолжительность */}
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Продолжительность:</span>
                        <br />
                        <span>{formatDuration(course)}</span>
                      </div>
                    </div>

                    {/* Дата начала */}
                    {course.start_date && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Начало курса:</span>
                          <br />
                          <span>{formatRussianDate(course.start_date)}</span>
                        </div>
                      </div>
                    )}

                    {/* Количество студентов */}
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Студенты:</span>
                        <br />
                        <span>
                          {course.current_students} записалось
                          {course.max_students && ` из ${course.max_students} мест`}
                        </span>
                      </div>
                    </div>

                    {/* Локация или платформа */}
                    {course.location_type === 'online' && course.online_platform ? (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Globe className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Платформа:</span>
                          <br />
                          <span>{course.online_platform}</span>
                        </div>
                      </div>
                    ) : course.venue_name && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <MapPin className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Место проведения:</span>
                          <br />
                          <span>{course.venue_name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Прогресс бар заполненности */}
                  {course.max_students && course.max_students > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Заполненность курса
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round((course.current_students / course.max_students) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((course.current_students / course.max_students) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Описание курса */}
              {course.description && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    О курсе
                  </h2>
                  <div 
                    className="prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                </div>
              )}

              {/* Программа курса */}
              {course.syllabus && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <List className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Программа курса
                  </h2>
                  <div className="space-y-4">
                    {/* Здесь будет отображение программы курса из JSON */}
                    <p className="text-gray-600 dark:text-gray-400">
                      Детальная программа будет добавлена позже
                    </p>
                  </div>
                </div>
              )}

              {/* Результаты обучения */}
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Что вы изучите
                  </h2>
                  <ul className="space-y-3">
                    {course.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-400">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Требования */}
              {course.requirements && course.requirements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Требования
                  </h2>
                  <ul className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span className="text-gray-600 dark:text-gray-400">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Инструктор */}
              {course.instructor && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Инструктор
                  </h2>
                  <div className="flex items-start gap-4">
                    {course.instructor.avatar_url ? (
                      <img
                        src={course.instructor.avatar_url}
                        alt={course.instructor.name}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">
                          {course.instructor.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {course.instructor.name}
                      </h3>
                      {course.instructor.title && (
                        <p className="text-primary-600 dark:text-primary-400 font-medium mb-2">
                          {course.instructor.title}
                        </p>
                      )}
                      {course.instructor.bio && (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {course.instructor.bio}
                        </p>
                      )}
                      <Link
                        to={`/speakers/${course.instructor.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium mt-3"
                      >
                        Подробнее об инструкторе
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Боковая панель */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Карточка записи */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                      {formatPrice(course)}
                    </div>
                    {course.payment_type !== 'free' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        За весь курс
                      </p>
                    )}
                  </div>

                  {canEnroll(course) ? (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Записываем...
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-5 w-5" />
                          Записаться на курс
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-3 px-6 rounded-lg font-medium mb-2">
                        Запись недоступна
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {course.max_students && course.current_students >= course.max_students
                          ? 'Все места заняты'
                          : 'Запись временно закрыта'
                        }
                      </p>
                    </div>
                  )}

                  {/* Дополнительная информация */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {course.enrollment_end && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Запись до:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatRussianDate(course.enrollment_end)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Язык:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {course.language_code === 'ru' ? 'Русский' : course.language_code}
                      </span>
                    </div>

                    {course.certificate_available && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Сертификат:</span>
                        <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          Да
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Дополнительные действия */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Поделиться курсом
                  </h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors">
                      <Download className="h-4 w-4" />
                      Скачать программу
                    </button>
                    
                    <button 
                      onClick={() => navigator.share?.({ 
                        title: course.title, 
                        url: window.location.href 
                      })}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Поделиться
                    </button>
                  </div>
                </div>

                {/* Похожие курсы */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Похожие курсы
                  </h3>
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Скоро появятся рекомендации</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetailsPage;
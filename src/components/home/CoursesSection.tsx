import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Users, 
  Star,
  Award,
  MonitorPlay,
  Building2,
  Zap,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatRussianDate } from '../../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  course_type: 'online' | 'offline' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks?: number;
  duration_hours?: number;
  start_date?: string;
  max_students?: number;
  current_students: number;
  price?: number;
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url?: string;
  certificate_available: boolean;
  is_featured: boolean;
  instructor?: {
    id: string;
    name: string;
    title?: string;
    avatar_url?: string;
  };
}

interface CoursesSettings {
  courses_count: number;
  show_title: boolean;
  show_description: boolean;
  show_instructor: boolean;
  show_duration: boolean;
  show_start_date: boolean;
  show_students: boolean;
  show_price: boolean;
  show_level: boolean;
  show_type: boolean;
  show_certificate: boolean;
}

const CoursesSection = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CoursesSettings>({
    courses_count: 3,
    show_title: true,
    show_description: true,
    show_instructor: true,
    show_duration: true,
    show_start_date: true,
    show_students: true,
    show_price: true,
    show_level: true,
    show_type: true,
    show_certificate: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let coursesCount = 3;

        // Получаем настройки отображения курсов из site_settings
        const { data: siteSettingsData } = await supabase
          .from('site_settings')
          .select('homepage_settings')
          .single();

        if (siteSettingsData?.homepage_settings) {
          const homepageSettings = siteSettingsData.homepage_settings.courses || {};
          coursesCount = homepageSettings.courses_count || 3;
          
          setSettings({
            courses_count: coursesCount,
            show_title: homepageSettings.show_title !== false,
            show_description: homepageSettings.show_description !== false,
            show_instructor: homepageSettings.show_instructor !== false,
            show_duration: homepageSettings.show_duration !== false,
            show_start_date: homepageSettings.show_start_date !== false,
            show_students: homepageSettings.show_students !== false,
            show_price: homepageSettings.show_price !== false,
            show_level: homepageSettings.show_level !== false,
            show_type: homepageSettings.show_type !== false,
            show_certificate: homepageSettings.show_certificate !== false
          });
        }

        // Получаем активные курсы
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            instructor:speakers(
              id,
              name,
              title,
              avatar_url
            )
          `)
          .eq('status', 'active')
          .eq('is_public', true)
          .order('is_featured', { ascending: false })
          .order('start_date', { ascending: true })
          .limit(coursesCount);

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);
        
      } catch (err) {
        console.error('Error fetching courses data:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      parts.push(`${course.duration_weeks} нед.`);
    }
    
    if (course.duration_hours) {
      parts.push(`${course.duration_hours} ч.`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Не указано';
  };

  // Получение иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <MonitorPlay className="h-4 w-4" />;
      case 'offline':
        return <Building2 className="h-4 w-4" />;
      case 'hybrid':
        return <Zap className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
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
        return 'Онлайн';
      case 'offline':
        return 'Очно';
      case 'hybrid':
        return 'Гибрид';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загружаем курсы...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>Ошибка загрузки курсов: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Не показываем секцию, если нет курсов
  if (courses.length === 0) {
    return null;
  }

  const {
    show_title = true,
    show_description = true,
    show_instructor = true,
    show_duration = true,
    show_start_date = true,
    show_students = true,
    show_price = true,
    show_level = true,
    show_type = true,
    show_certificate = true
  } = settings;

  return (
    <section className="py-16 bg-white dark:bg-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Образовательные курсы
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Углубленное изучение научных дисциплин с практическими занятиями и сертификацией
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="group bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Изображение курса */}
              <div className="relative h-48 overflow-hidden">
                {course.cover_image_url ? (
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                
                {/* Бейджи */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {course.is_featured && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Рекомендуем
                    </span>
                  )}
                  {show_level && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(course.level)}`}>
                      {getLevelName(course.level)}
                    </span>
                  )}
                </div>

                {/* Тип курса */}
                {show_type && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      {getCourseTypeIcon(course.course_type)}
                      {getCourseTypeName(course.course_type)}
                    </span>
                  </div>
                )}

                {/* Сертификат */}
                {show_certificate && course.certificate_available && (
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      Сертификат
                    </span>
                  </div>
                )}
              </div>

              {/* Контент карточки */}
              <div className="p-6">
                {/* Заголовок */}
                {show_title && (
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {course.title}
                  </h3>
                )}

                {/* Описание */}
                {show_description && course.short_description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {course.short_description}
                  </p>
                )}

                {/* Информация о курсе */}
                <div className="space-y-2 mb-4">
                  {/* Продолжительность */}
                  {show_duration && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <Clock className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                      <span>{formatDuration(course)}</span>
                    </div>
                  )}

                  {/* Дата начала */}
                  {show_start_date && course.start_date && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                      <span>Начало: {formatRussianDate(course.start_date)}</span>
                    </div>
                  )}

                  {/* Количество студентов */}
                  {show_students && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <Users className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                      <span>
                        {course.current_students} студентов
                        {course.max_students && ` / ${course.max_students} мест`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Инструктор */}
                {show_instructor && course.instructor && (
                  <div className="flex items-center mb-4 p-3 bg-white dark:bg-gray-600 rounded-lg">
                    {course.instructor.avatar_url ? (
                      <img
                        src={course.instructor.avatar_url}
                        alt={course.instructor.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3">
                        <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                          {course.instructor.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {course.instructor.name}
                      </p>
                      {course.instructor.title && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {course.instructor.title}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Футер карточки */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                  {show_price && (
                    <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {formatPrice(course)}
                    </div>
                  )}
                  <div className="text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Подробнее
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Кнопка "Все курсы" */}
        <div className="text-center">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            <BookOpen className="h-5 w-5" />
            Все курсы
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;   
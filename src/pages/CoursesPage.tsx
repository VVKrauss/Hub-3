import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Search, 
  Filter, 
  ChevronDown, 
  Star,
  Award,
  BookOpen,
  Play,
  CheckCircle,
  Globe,
  Loader2,
  X,
  MonitorPlay,
  Building2,
  Zap
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Типы данных
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
    avatar_url?: string;
  };
}

interface CourseFilters {
  search?: string;
  category?: string;
  level?: string;
  course_type?: string;
  payment_type?: string;
  featured?: boolean;
  status?: string;
  date_from?: string;
  date_to?: string;
}

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры и поиск
  const [filters, setFilters] = useState<CourseFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Настройки пагинации
  const [pageSettings] = useState({
    itemsPerPage: 12,
    currentPage: 1
  });

  // Статистика
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    featured: 0,
    categories: 0
  });

  useEffect(() => {
    fetchCourses(true);
    fetchCategories();
  }, [filters]);

  const fetchCourses = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      // Основной запрос
      let query = supabase
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
        .eq('is_public', true);

      // Применяем фильтры
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.course_type) {
        query = query.eq('course_type', filters.course_type);
      }

      if (filters.payment_type) {
        query = query.eq('payment_type', filters.payment_type);
      }

      if (filters.featured) {
        query = query.eq('is_featured', true);
      }

      if (filters.date_from) {
        query = query.gte('start_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('start_date', filters.date_to);
      }

      // Сортировка
      query = query.order('is_featured', { ascending: false })
                   .order('start_date', { ascending: true });

      // Пагинация
      const from = reset ? 0 : courses.length;
      const to = from + pageSettings.itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const newCourses = data || [];
      
      if (reset) {
        setCourses(newCourses);
      } else {
        setCourses(prev => [...prev, ...newCourses]);
      }

      setHasMore(newCourses.length === pageSettings.itemsPerPage);
      
      // Обновляем статистику только при сбросе
      if (reset) {
        updateStats(count || 0);
      }

    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Ошибка при загрузке курсов');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('category')
        .eq('status', 'active')
        .eq('is_public', true)
        .not('category', 'is', null);

      if (error) throw error;

      const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const updateStats = async (totalCount: number) => {
    try {
      const [activeResult, featuredResult] = await Promise.all([
        supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_public', true),
        supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_public', true)
          .eq('is_featured', true)
      ]);

      setStats({
        total: totalCount,
        active: activeResult.count || 0,
        featured: featuredResult.count || 0,
        categories: categories.length
      });
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  };

  const handleFilterChange = (key: keyof CourseFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCourses(false);
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

  if (loading && courses.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Загружаем курсы...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Hero секция */}
        <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Научные курсы
              </h1>
              <p className="text-xl md:text-2xl text-primary-100 mb-8 leading-relaxed">
                Изучайте науку структурированно и глубоко с нашими экспертными курсами
              </p>
              
              {/* Статистика */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.active}</div>
                  <div className="text-primary-200 text-sm">Активных курсов</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.featured}</div>
                  <div className="text-primary-200 text-sm">Рекомендуемых</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{categories.length}</div>
                  <div className="text-primary-200 text-sm">Категорий</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">∞</div>
                  <div className="text-primary-200 text-sm">Знаний</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Боковая панель с фильтрами */}
            <aside className="lg:w-80">
              <div className="sticky top-8 space-y-6">
                {/* Поиск */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Поиск</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Поиск курсов..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleFilterChange('search', e.target.value || undefined);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Фильтры */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Фильтры
                    </h3>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showFilters && (
                    <div className="px-6 pb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      {/* Категория */}
                      {categories.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Категория
                          </label>
                          <select
                            value={filters.category || ''}
                            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">Все категории</option>
                            {categories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Уровень сложности */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Уровень сложности
                        </label>
                        <select
                          value={filters.level || ''}
                          onChange={(e) => handleFilterChange('level', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Любой уровень</option>
                          <option value="beginner">Начальный</option>
                          <option value="intermediate">Средний</option>
                          <option value="advanced">Продвинутый</option>
                        </select>
                      </div>

                      {/* Тип курса */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Формат обучения
                        </label>
                        <select
                          value={filters.course_type || ''}
                          onChange={(e) => handleFilterChange('course_type', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Любой формат</option>
                          <option value="online">Онлайн</option>
                          <option value="offline">Очно</option>
                          <option value="hybrid">Гибридный</option>
                        </select>
                      </div>

                      {/* Тип оплаты */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Стоимость
                        </label>
                        <select
                          value={filters.payment_type || ''}
                          onChange={(e) => handleFilterChange('payment_type', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">Любая стоимость</option>
                          <option value="free">Бесплатные</option>
                          <option value="paid">Платные</option>
                        </select>
                      </div>

                      {/* Только рекомендуемые */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="featured"
                          checked={filters.featured || false}
                          onChange={(e) => handleFilterChange('featured', e.target.checked ? true : undefined)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="featured" className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Только рекомендуемые
                          {stats.featured > 0 && (
                            <span className="text-gray-500">({stats.featured})</span>
                          )}
                        </label>
                      </div>

                      {/* Кнопка сброса */}
                      <button
                        onClick={clearFilters}
                        className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Основной контент */}
            <main className="flex-1">
              {/* Заголовок секции */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Доступные курсы
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Найдено {courses.length} из {stats.total} курсов
                  </p>
                </div>
              </div>

              {/* Сообщение об ошибке */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <X className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Список курсов */}
              {courses.length > 0 ? (
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
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
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(course.level)}`}>
                              {getLevelName(course.level)}
                            </span>
                          </div>

                          {/* Тип курса */}
                          <div className="absolute top-3 right-3">
                            <span className="bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              {getCourseTypeIcon(course.course_type)}
                              {getCourseTypeName(course.course_type)}
                            </span>
                          </div>

                          {/* Сертификат */}
                          {course.certificate_available && (
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
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {course.title}
                          </h3>

                          {/* Описание */}
                          {course.short_description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                              {course.short_description}
                            </p>
                          )}

                          {/* Информация о курсе */}
                          <div className="space-y-2 mb-4">
                            {/* Продолжительность */}
                            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                              <Clock className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                              <span>{formatDuration(course)}</span>
                            </div>

                            {/* Дата начала */}
                            {course.start_date && (
                              <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                                <Calendar className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                                <span>Начало: {formatRussianDate(course.start_date)}</span>
                              </div>
                            )}

                            {/* Количество студентов */}
                            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                              <Users className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                              <span>
                                {course.current_students} студентов
                                {course.max_students && ` / ${course.max_students} мест`}
                              </span>
                            </div>

                            {/* Локация */}
                            {course.location_type !== 'online' && course.venue_name && (
                              <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                                <MapPin className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                                <span className="truncate">{course.venue_name}</span>
                              </div>
                            )}

                            {/* Онлайн платформа */}
                            {course.location_type === 'online' && course.online_platform && (
                              <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                                <Globe className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                                <span>{course.online_platform}</span>
                              </div>
                            )}
                          </div>

                          {/* Инструктор */}
                          {course.instructor && (
                            <div className="flex items-center mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                              {formatPrice(course)}
                            </div>
                            <Link
                              to={`/courses/${course.slug}`}
                              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              Подробнее
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Кнопка загрузки еще */}
                  {hasMore && (
                    <div className="text-center mt-12">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg border border-gray-300 dark:border-gray-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Загрузка...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Загрузить еще курсы
                          </>
                        )}
                      </button>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Показано {courses.length} из {stats.total} курсов
                      </p>
                    </div>
                  )}

                  {/* Информация о завершении списка */}
                  {!hasMore && courses.length > pageSettings.itemsPerPage && (
                    <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">
                        Вы просмотрели все доступные курсы ({courses.length})
                      </p>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                      >
                        ↑ Вернуться к началу
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                /* Пустое состояние */
                <div className="text-center py-16">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Курсы не найдены
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Попробуйте изменить фильтры или поисковый запрос
                  </p>
                  <button
                    onClick={clearFilters}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              )}

              {/* Call to Action */}
              {courses.length > 0 && (
                <section className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-white text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    Хотите предложить свой курс?
                  </h2>
                  <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                    Если у вас есть экспертиза в области науки и желание делиться знаниями, 
                    свяжитесь с нами для обсуждения возможности проведения курса.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      to="/contact"
                      className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Предложить курс
                    </Link>
                    <Link
                      to="/about"
                      className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      О нас
                    </Link>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoursesPage;
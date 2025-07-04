import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Globe, 
  Tag, 
  DollarSign, 
  X,
  BookOpen,
  GraduationCap,
  Play,
  Star
} from 'lucide-react';
import Layout from '../components/layout/Layout';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Типы для курсов (используем только существующие в БД)
// Основываемся на схеме из MD файла
type CourseType = 'offline' | 'online' | 'hybrid';
type CourseStatus = 'draft' | 'active' | 'archived'; // Изменили published на active
type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
type CoursePaymentType = 'free' | 'paid' | 'subscription';

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  course_type: CourseType;
  status: CourseStatus;
  level: CourseLevel;
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
  payment_type: CoursePaymentType;
  cover_image_url?: string;
  gallery_images?: string[];
  video_url?: string;
  instructor_id?: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  online_platform?: string;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// Лейблы для фильтров
const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  offline: 'Очно',
  online: 'Онлайн',
  hybrid: 'Гибридный'
};

const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый'
};

const PAYMENT_TYPE_LABELS: Record<CoursePaymentType, string> = {
  free: 'Бесплатно',
  paid: 'Платно',
  subscription: 'Подписка'
};

// Список всех возможных категорий
const COURSE_CATEGORIES = [
  'Программирование',
  'Наука',
  'Математика',
  'Физика',
  'Биология',
  'Химия',
  'Инженерия',
  'Дизайн',
  'Бизнес',
  'Языки'
];

const CoursesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние фильтров
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTypes, setSelectedTypes] = useState<CourseType[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<CourseLevel[]>([]);
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<CoursePaymentType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Загрузка курсов
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Загружаем курсы из sh_courses...');

      const { data, error: fetchError } = await supabase
        .from('sh_courses')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      console.log('Результат запроса курсов:', { data, error: fetchError });

      if (fetchError) {
        console.error('Ошибка при загрузке курсов:', fetchError);
        throw fetchError;
      }

      console.log('Загружено курсов:', data?.length || 0);
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Ошибка при загрузке курсов: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация курсов
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Поиск по названию и описанию
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = course.title.toLowerCase().includes(query);
        const descMatch = course.short_description?.toLowerCase().includes(query) || 
                         course.description?.toLowerCase().includes(query);
        const categoryMatch = course.category?.toLowerCase().includes(query);
        
        if (!titleMatch && !descMatch && !categoryMatch) {
          return false;
        }
      }

      // Фильтр по типу
      if (selectedTypes.length > 0 && !selectedTypes.includes(course.course_type)) {
        return false;
      }

      // Фильтр по уровню
      if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) {
        return false;
      }

      // Фильтр по типу оплаты
      if (selectedPaymentTypes.length > 0 && !selectedPaymentTypes.includes(course.payment_type)) {
        return false;
      }

      // Фильтр по категории
      if (selectedCategories.length > 0 && course.category && !selectedCategories.includes(course.category)) {
        return false;
      }

      return true;
    });
  }, [courses, searchQuery, selectedTypes, selectedLevels, selectedPaymentTypes, selectedCategories]);

  const hasActiveFilters = () => {
    return searchQuery || 
           selectedTypes.length > 0 || 
           selectedLevels.length > 0 || 
           selectedPaymentTypes.length > 0 || 
           selectedCategories.length > 0;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedLevels([]);
    setSelectedPaymentTypes([]);
    setSelectedCategories([]);
    setSearchParams({});
  };

  // Обработчики фильтров
  const handleTypeFilter = (type: CourseType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleLevelFilter = (level: CourseLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handlePaymentFilter = (paymentType: CoursePaymentType) => {
    setSelectedPaymentTypes(prev => 
      prev.includes(paymentType) 
        ? prev.filter(p => p !== paymentType)
        : [...prev, paymentType]
    );
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Компонент карточки курса
  const CourseCard = ({ course }: { course: Course }) => (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden hover:shadow-md transition-shadow">
      {/* Изображение курса */}
      <div className="relative h-48 bg-gradient-to-br from-primary-500 to-secondary-500">
        {course.cover_image_url ? (
          <img 
            src={course.cover_image_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="h-16 w-16 text-white opacity-70" />
          </div>
        )}
        
        {/* Бейджи */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${
            course.payment_type === 'free' ? 'bg-green-500' : 
            course.payment_type === 'paid' ? 'bg-blue-500' : 'bg-purple-500'
          }`}>
            {PAYMENT_TYPE_LABELS[course.payment_type]}
          </span>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-black/30 text-white">
            {COURSE_TYPE_LABELS[course.course_type]}
          </span>
        </div>

        {course.is_featured && (
          <div className="absolute top-3 right-3">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
              {course.title}
            </h3>
            
            {course.category && (
              <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                {course.category}
              </span>
            )}
          </div>
        </div>

        {course.short_description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
            {course.short_description}
          </p>
        )}

        {/* Детали курса */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <GraduationCap className="h-4 w-4" />
            <span>Уровень: {COURSE_LEVEL_LABELS[course.level]}</span>
          </div>

          {course.duration_weeks && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>
                {course.duration_weeks} {course.duration_weeks === 1 ? 'неделя' : 
                 course.duration_weeks < 5 ? 'недели' : 'недель'}
                {course.duration_hours && ` (${course.duration_hours} часов)`}
              </span>
            </div>
          )}

          {course.max_students && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {course.current_students} / {course.max_students} студентов
              </span>
            </div>
          )}

          {course.venue_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{course.venue_name}</span>
            </div>
          )}
        </div>

        {/* Цена и кнопка */}
        <div className="flex items-center justify-between">
          <div>
            {course.payment_type === 'free' ? (
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                Бесплатно
              </span>
            ) : course.price ? (
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {course.price.toLocaleString()} {course.currency}
              </span>
            ) : (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Цена по запросу
              </span>
            )}
          </div>

          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Заголовок страницы */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-600">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Курсы и обучение
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Изучайте новые навыки и расширяйте знания с нашими экспертными курсами
              </p>
            </div>

            {/* Поиск и фильтры */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Поиск */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск курсов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Управление */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters 
                      ? 'bg-primary-600 text-white border-primary-600' 
                      : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  {hasActiveFilters() && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      !
                    </span>
                  )}
                </button>

                <div className="flex rounded-lg border border-gray-300 dark:border-dark-600 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-600'
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-600'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Активные фильтры */}
            {hasActiveFilters() && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Активные фильтры:</span>
                
                {selectedTypes.map(type => (
                  <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 text-sm rounded-full">
                    {COURSE_TYPE_LABELS[type]}
                    <button onClick={() => handleTypeFilter(type)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {selectedLevels.map(level => (
                  <span key={level} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    {COURSE_LEVEL_LABELS[level]}
                    <button onClick={() => handleLevelFilter(level)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {selectedPaymentTypes.map(paymentType => (
                  <span key={paymentType} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full">
                    {PAYMENT_TYPE_LABELS[paymentType]}
                    <button onClick={() => handlePaymentFilter(paymentType)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {selectedCategories.map(category => (
                  <span key={category} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm rounded-full">
                    {category}
                    <button onClick={() => handleCategoryFilter(category)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
                >
                  Очистить все
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Боковая панель фильтров */}
            {showFilters && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6 sticky top-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Фильтры</h3>

                  {/* Тип курса */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Тип курса</h4>
                    <div className="space-y-2">
                      {Object.entries(COURSE_TYPE_LABELS).map(([type, label]) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type as CourseType)}
                            onChange={() => handleTypeFilter(type as CourseType)}
                            className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Уровень */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Уровень</h4>
                    <div className="space-y-2">
                      {Object.entries(COURSE_LEVEL_LABELS).map(([level, label]) => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLevels.includes(level as CourseLevel)}
                            onChange={() => handleLevelFilter(level as CourseLevel)}
                            className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Тип оплаты */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Стоимость</h4>
                    <div className="space-y-2">
                      {Object.entries(PAYMENT_TYPE_LABELS).map(([paymentType, label]) => (
                        <label key={paymentType} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPaymentTypes.includes(paymentType as CoursePaymentType)}
                            onChange={() => handlePaymentFilter(paymentType as CoursePaymentType)}
                            className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Категории */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Категория</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {COURSE_CATEGORIES.map(category => (
                        <label key={category} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleCategoryFilter(category)}
                            className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Основной контент */}
            <div className="flex-1">
              {/* Результаты */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 dark:text-gray-400">
                    {loading ? 'Загрузка...' : `Найдено ${filteredCourses.length} курсов`}
                  </p>
                </div>
              </div>

              {/* Список курсов */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
                  <button
                    onClick={fetchCourses}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : (
                <div>
                  {/* Отладочная информация */}
                  <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Отладка: Всего курсов загружено: {courses.length}
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      После фильтрации: {filteredCourses.length}
                    </p>
                    {courses.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Показать данные курсов</summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-40">
                          {JSON.stringify(courses.slice(0, 2), null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {hasActiveFilters() ? 'Курсы не найдены' : 'Курсов пока нет'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        {hasActiveFilters() 
                          ? 'Попробуйте изменить параметры поиска или очистить фильтры'
                          : 'Скоро здесь появятся интересные курсы. Следите за обновлениями!'
                        }
                      </p>
                      
                      {hasActiveFilters() && (
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                        >
                          Очистить фильтры
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={
                      viewMode === 'grid' 
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "space-y-6"
                    }>
                      {filteredCourses.map(course => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoursesPage;
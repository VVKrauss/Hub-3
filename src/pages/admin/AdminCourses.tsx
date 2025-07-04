import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Edit, Eye, Calendar, Users, MapPin, Trash2, Filter, Loader2, BookOpen, Award, MonitorPlay, Building2, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { formatRussianDate, formatTimeFromTimestamp, formatTimeRange, isPastEvent, formatDateTimeForDisplay } from '../../utils/dateTimeUtils';

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
  created_by?: string;
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

type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'chronological';
type FilterStatus = 'active' | 'draft' | 'archived' | 'completed';

const statusColors = {
  active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
  draft: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
  archived: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-400',
  completed: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400'
};

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const formatCourseTitle = (title: string) => {
  const maxLength = 50;
  const maxLineLength = 30;
  
  if (title.length <= maxLength) {
    const words = title.split(' ');
    if (words.length <= 2) {
      return {
        line1: words[0] || ' ',
        line2: words[1] || ' '
      };
    }
    
    const middle = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, middle).join(' '),
      line2: words.slice(middle).join(' ')
    };
  }
  
  return {
    line1: title.substring(0, maxLineLength),
    line2: title.substring(maxLineLength, maxLength - 3) + '...'
  };
};

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('chronological');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [sortBy, statusFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // Получаем курсы с их инструкторами
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
        `);

      // Фильтрация по статусу
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Сортировка
      switch (sortBy) {
        case 'chronological':
          if (statusFilter === 'active') {
            // Активные сортируем по дате начала (ближайшие первыми)
            filteredData.sort((a, b) => {
              const dateA = new Date(a.start_date || 0);
              const dateB = new Date(b.start_date || 0);
              return dateA.getTime() - dateB.getTime();
            });
          } else {
            // Остальные сортируем по дате создания
            filteredData.sort((a, b) => {
              const dateA = new Date(a.created_at || 0);
              const dateB = new Date(b.created_at || 0);
              return dateB.getTime() - dateA.getTime();
            });
          }
          break;
        case 'date-asc':
          filteredData.sort((a, b) => {
            const dateA = new Date(a.start_date || 0);
            const dateB = new Date(b.start_date || 0);
            return dateA.getTime() - dateB.getTime();
          });
          break;
        case 'date-desc':
          filteredData.sort((a, b) => {
            const dateA = new Date(a.start_date || 0);
            const dateB = new Date(b.start_date || 0);
            return dateB.getTime() - dateA.getTime();
          });
          break;
        case 'title-asc':
          filteredData.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title-desc':
          filteredData.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }

      setCourses(filteredData);
      setSelectedCourses([]);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Ошибка при загрузке курсов');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCourses.length === 0) return;
    
    const count = selectedCourses.length;
    if (!confirm(`Вы уверены, что хотите удалить ${count} ${count === 1 ? 'курс' : 'курсов'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', selectedCourses);

      if (error) throw error;

      toast.success(`Успешно удалено ${count} ${count === 1 ? 'курс' : 'курсов'}`);
      fetchCourses();
    } catch (error) {
      console.error('Error deleting courses:', error);
      toast.error('Ошибка при удалении курсов');
    }
  };

  const toggleCourseSelection = (courseId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Фильтрация курсов по поисковому запросу
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.short_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Функция для отображения даты и времени
  const formatCourseDateTime = (course: Course): string => {
    if (!course.start_date) return 'Время не указано';
    
    const dateStr = formatRussianDate(course.start_date);
    
    if (course.end_date) {
      const endDateStr = formatRussianDate(course.end_date);
      return `${dateStr} — ${endDateStr}`;
    }
    
    return dateStr;
  };

  // Получение иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <MonitorPlay className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      case 'offline':
        return <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      case 'hybrid':
        return <Zap className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      default:
        return <BookOpen className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
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

  const tabs = [
    { id: 'active', label: 'Активные', count: courses.filter(c => c.status === 'active').length },
    { id: 'draft', label: 'Черновики', count: courses.filter(c => c.status === 'draft').length },
    { id: 'completed', label: 'Завершенные', count: courses.filter(c => c.status === 'completed').length },
    { id: 'archived', label: 'Архивные', count: courses.filter(c => c.status === 'archived').length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление курсами
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Создавайте, редактируйте и управляйте образовательными курсами
          </p>
        </div>

        {/* Кнопка создания */}
        <div className="flex justify-center mb-10">
          <Link 
            to="/admin/courses/new"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-6 h-6" />
            Создать новый курс
          </Link>
        </div>

        {/* Вкладки фильтрации по статусу */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as FilterStatus)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    statusFilter === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      statusFilter === tab.id
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Поиск */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск курсов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center gap-4">
                {/* Сортировка */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                >
                  <option value="chronological">Хронологический</option>
                  <option value="date-asc">Дата: сначала старые</option>
                  <option value="date-desc">Дата: сначала новые</option>
                  <option value="title-asc">Название: А-Я</option>
                  <option value="title-desc">Название: Я-А</option>
                </select>

                {/* Кнопка удаления выбранных */}
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить ({selectedCourses.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Загрузка */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">Загружаем курсы...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Список курсов */}
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => {
                  const { line1, line2 } = formatCourseTitle(course.title);
                  const isPastCourse = course.end_date ? isPastEvent(course.end_date) : false;
                  
                  return (
                    <div 
                      key={course.id} 
                      className="group relative bg-white dark:bg-dark-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 cursor-pointer"
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowDetailsModal(true);
                      }}
                    >
                      {/* Чекбокс */}
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={(e) => e.stopPropagation()}
                          onClick={(e) => toggleCourseSelection(course.id, e)}
                          className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:checked:bg-primary-600 shadow-lg"
                        />
                      </div>
                      
                      {/* Изображение курса */}
                      <div 
                        className="h-48 bg-cover bg-center relative"
                        style={{ 
                          backgroundImage: course.cover_image_url 
                            ? `url(${course.cover_image_url})` 
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        {!course.cover_image_url && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-white opacity-30" />
                          </div>
                        )}
                        
                        {/* Статус */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isPastCourse && course.status === 'active' 
                              ? statusColors.completed
                              : statusColors[course.status as keyof typeof statusColors]
                          }`}>
                            {isPastCourse ? 'Завершен' : 
                             course.status === 'active' ? 'Активен' : 
                             course.status === 'draft' ? 'Черновик' : 
                             course.status === 'completed' ? 'Завершен' : 'Архивный'}
                          </span>
                        </div>

                        {/* Дополнительные бейджи */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {course.is_featured && (
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Рекомендуем
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${levelColors[course.level as keyof typeof levelColors]}`}>
                            {getLevelName(course.level)}
                          </span>
                        </div>
                      </div>

                      {/* Контент карточки */}
                      <div className="p-6">
                        {/* Заголовок */}
                        <div className="h-[4rem] mb-4 overflow-hidden">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {line1}
                            {line2 && (
                              <>
                                <br />
                                {line2}
                              </>
                            )}
                          </h3>
                        </div>
                        
                        {/* Детали курса */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="truncate font-medium">{formatCourseDateTime(course)}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                              {getCourseTypeIcon(course.course_type)}
                            </div>
                            <span className="truncate font-medium">{getCourseTypeName(course.course_type)}</span>
                          </div>
                          
                          {course.venue_name && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <span className="truncate font-medium">{course.venue_name}</span>
                            </div>
                          )}
                          
                          {/* Информация о студентах */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                  <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                </div>
                                <span className="font-medium">
                                  Студенты: {course.current_students}
                                  {course.max_students && ` / ${course.max_students}`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Прогресс бар для заполненности */}
                            {course.max_students && course.max_students > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-11">
                                <div
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min((course.current_students / course.max_students) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            )}
                          </div>
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
                          <div className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {formatPrice(course)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/courses/${course.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                              title="Посмотреть курс"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/courses/${course.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                              title="Редактировать курс"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Пустое состояние */
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'Курсы не найдены' : 'Пока нет курсов'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchQuery 
                    ? 'Попробуйте изменить поисковый запрос или фильтры'
                    : 'Создайте первый курс, чтобы начать обучение'
                  }
                </p>
                {!searchQuery && (
                  <Link
                    to="/admin/courses/new"
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Создать первый курс
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Edit, Eye, Calendar, Users, MapPin, Trash2, Filter, Loader2, BookOpen, Award, MonitorPlay, Building2, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { formatRussianDate, formatTimeFromTimestamp, formatTimeRange, isPastEvent, formatDateTimeForDisplay } from '../../utils/dateTimeUtils';

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
  created_by?: string;
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

type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'chronological';
type FilterStatus = 'active' | 'draft' | 'archived' | 'completed';

const statusColors = {
  active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
  draft: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
  archived: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-400',
  completed: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400'
};

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const formatCourseTitle = (title: string) => {
  const maxLength = 50;
  const maxLineLength = 30;
  
  if (title.length <= maxLength) {
    const words = title.split(' ');
    if (words.length <= 2) {
      return {
        line1: words[0] || ' ',
        line2: words[1] || ' '
      };
    }
    
    const middle = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, middle).join(' '),
      line2: words.slice(middle).join(' ')
    };
  }
  
  return {
    line1: title.substring(0, maxLineLength),
    line2: title.substring(maxLineLength, maxLength - 3) + '...'
  };
};

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('chronological');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [sortBy, statusFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // Получаем курсы с их инструкторами
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
        `);

      // Фильтрация по статусу
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Сортировка
      switch (sortBy) {
        case 'chronological':
          if (statusFilter === 'active') {
            // Активные сортируем по дате начала (ближайшие первыми)
            filteredData.sort((a, b) => {
              const dateA = new Date(a.start_date || 0);
              const dateB = new Date(b.start_date || 0);
              return dateA.getTime() - dateB.getTime();
            });
          } else {
            // Остальные сортируем по дате создания
            filteredData.sort((a, b) => {
              const dateA = new Date(a.created_at || 0);
              const dateB = new Date(b.created_at || 0);
              return dateB.getTime() - dateA.getTime();
            });
          }
          break;
        case 'date-asc':
          filteredData.sort((a, b) => {
            const dateA = new Date(a.start_date || 0);
            const dateB = new Date(b.start_date || 0);
            return dateA.getTime() - dateB.getTime();
          });
          break;
        case 'date-desc':
          filteredData.sort((a, b) => {
            const dateA = new Date(a.start_date || 0);
            const dateB = new Date(b.start_date || 0);
            return dateB.getTime() - dateA.getTime();
          });
          break;
        case 'title-asc':
          filteredData.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title-desc':
          filteredData.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }

      setCourses(filteredData);
      setSelectedCourses([]);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Ошибка при загрузке курсов');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCourses.length === 0) return;
    
    const count = selectedCourses.length;
    if (!confirm(`Вы уверены, что хотите удалить ${count} ${count === 1 ? 'курс' : 'курсов'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', selectedCourses);

      if (error) throw error;

      toast.success(`Успешно удалено ${count} ${count === 1 ? 'курс' : 'курсов'}`);
      fetchCourses();
    } catch (error) {
      console.error('Error deleting courses:', error);
      toast.error('Ошибка при удалении курсов');
    }
  };

  const toggleCourseSelection = (courseId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Фильтрация курсов по поисковому запросу
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.short_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Функция для отображения даты и времени
  const formatCourseDateTime = (course: Course): string => {
    if (!course.start_date) return 'Время не указано';
    
    const dateStr = formatRussianDate(course.start_date);
    
    if (course.end_date) {
      const endDateStr = formatRussianDate(course.end_date);
      return `${dateStr} — ${endDateStr}`;
    }
    
    return dateStr;
  };

  // Получение иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <MonitorPlay className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      case 'offline':
        return <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      case 'hybrid':
        return <Zap className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
      default:
        return <BookOpen className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
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

  const tabs = [
    { id: 'active', label: 'Активные', count: courses.filter(c => c.status === 'active').length },
    { id: 'draft', label: 'Черновики', count: courses.filter(c => c.status === 'draft').length },
    { id: 'completed', label: 'Завершенные', count: courses.filter(c => c.status === 'completed').length },
    { id: 'archived', label: 'Архивные', count: courses.filter(c => c.status === 'archived').length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление курсами
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Создавайте, редактируйте и управляйте образовательными курсами
          </p>
        </div>

        {/* Кнопка создания */}
        <div className="flex justify-center mb-10">
          <Link 
            to="/admin/courses/new"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-6 h-6" />
            Создать новый курс
          </Link>
        </div>

        {/* Вкладки фильтрации по статусу */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as FilterStatus)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    statusFilter === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      statusFilter === tab.id
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Поиск */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск курсов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                />
              </div>

              <div className="flex items-center gap-4">
                {/* Сортировка */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                >
                  <option value="chronological">Хронологический</option>
                  <option value="date-asc">Дата: сначала старые</option>
                  <option value="date-desc">Дата: сначала новые</option>
                  <option value="title-asc">Название: А-Я</option>
                  <option value="title-desc">Название: Я-А</option>
                </select>

                {/* Кнопка удаления выбранных */}
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить ({selectedCourses.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Загрузка */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">Загружаем курсы...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Список курсов */}
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => {
                  const { line1, line2 } = formatCourseTitle(course.title);
                  const isPastCourse = course.end_date ? isPastEvent(course.end_date) : false;
                  
                  return (
                    <div 
                      key={course.id} 
                      className="group relative bg-white dark:bg-dark-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 cursor-pointer"
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowDetailsModal(true);
                      }}
                    >
                      {/* Чекбокс */}
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={(e) => e.stopPropagation()}
                          onClick={(e) => toggleCourseSelection(course.id, e)}
                          className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:checked:bg-primary-600 shadow-lg"
                        />
                      </div>
                      
                      {/* Изображение курса */}
                      <div 
                        className="h-48 bg-cover bg-center relative"
                        style={{ 
                          backgroundImage: course.cover_image_url 
                            ? `url(${course.cover_image_url})` 
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        {!course.cover_image_url && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-white opacity-30" />
                          </div>
                        )}
                        
                        {/* Статус */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isPastCourse && course.status === 'active' 
                              ? statusColors.completed
                              : statusColors[course.status as keyof typeof statusColors]
                          }`}>
                            {isPastCourse ? 'Завершен' : 
                             course.status === 'active' ? 'Активен' : 
                             course.status === 'draft' ? 'Черновик' : 
                             course.status === 'completed' ? 'Завершен' : 'Архивный'}
                          </span>
                        </div>

                        {/* Дополнительные бейджи */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {course.is_featured && (
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Рекомендуем
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${levelColors[course.level as keyof typeof levelColors]}`}>
                            {getLevelName(course.level)}
                          </span>
                        </div>
                      </div>

                      {/* Контент карточки */}
                      <div className="p-6">
                        {/* Заголовок */}
                        <div className="h-[4rem] mb-4 overflow-hidden">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {line1}
                            {line2 && (
                              <>
                                <br />
                                {line2}
                              </>
                            )}
                          </h3>
                        </div>
                        
                        {/* Детали курса */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="truncate font-medium">{formatCourseDateTime(course)}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                              {getCourseTypeIcon(course.course_type)}
                            </div>
                            <span className="truncate font-medium">{getCourseTypeName(course.course_type)}</span>
                          </div>
                          
                          {course.venue_name && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <span className="truncate font-medium">{course.venue_name}</span>
                            </div>
                          )}
                          
                          {/* Информация о студентах */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                  <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                </div>
                                <span className="font-medium">
                                  Студенты: {course.current_students}
                                  {course.max_students && ` / ${course.max_students}`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Прогресс бар для заполненности */}
                            {course.max_students && course.max_students > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-11">
                                <div
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min((course.current_students / course.max_students) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            )}
                          </div>
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
                          <div className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {formatPrice(course)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/courses/${course.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                              title="Посмотреть курс"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/courses/${course.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                              title="Редактировать курс"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Пустое состояние */
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'Курсы не найдены' : 'Пока нет курсов'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchQuery 
                    ? 'Попробуйте изменить поисковый запрос или фильтры'
                    : 'Создайте первый курс, чтобы начать обучение'
                  }
                </p>
                {!searchQuery && (
                  <Link
                    to="/admin/courses/new"
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Создать первый курс
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
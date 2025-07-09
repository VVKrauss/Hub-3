// src/components/courses/CourseCard.tsx - Компонент карточки курса
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  ExternalLink,
  Calendar,
  MapPin,
  Monitor,
  Building,
  Blend
} from 'lucide-react';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import { formatRussianDate } from '../../utils/dateTimeUtils';
import type { Course } from '../../api/courses';

interface CourseCardProps {
  course: Course;
  showInstructor?: boolean;
  compact?: boolean;
}

const CourseCard = ({ course, showInstructor = false, compact = false }: CourseCardProps) => {
  
  // Функция для получения иконки типа курса
  const getCourseTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Monitor className="w-4 h-4" />;
      case 'offline':
        return <Building className="w-4 h-4" />;
      case 'hybrid':
        return <Blend className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  // Функция для получения текста типа курса
  const getCourseTypeText = (type: string) => {
    switch (type) {
      case 'online':
        return 'Онлайн';
      case 'offline':
        return 'Очно';
      case 'hybrid':
        return 'Гибридный';
      default:
        return type;
    }
  };

  // Функция для получения текста уровня
  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Начинающий';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
      default:
        return level;
    }
  };

  // Функция для получения цвета уровня
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Функция для получения цвета типа курса
  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case 'online':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'offline':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Функция для форматирования цены
  const formatPrice = () => {
    if (course.payment_type === 'free') {
      return (
        <span className="text-green-600 dark:text-green-400 font-semibold">
          Бесплатно
        </span>
      );
    } else if (course.price) {
      return (
        <span className="text-gray-900 dark:text-white font-semibold">
          {course.price} {course.currency}
        </span>
      );
    } else {
      return (
        <span className="text-gray-500 dark:text-gray-400">
          Цена не указана
        </span>
      );
    }
  };

  // Проверяем доступность мест
  const spotsAvailable = course.max_students ? course.max_students - course.current_students : null;
  const isFullyBooked = spotsAvailable !== null && spotsAvailable <= 0;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Изображение курса */}
      <div className={`aspect-video relative overflow-hidden ${compact ? 'aspect-square' : ''}`}>
        {course.cover_image_url ? (
          <img
            src={getSupabaseImageUrl(course.cover_image_url)}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary-400" />
          </div>
        )}
        
        {/* Оверлей с badges */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300" />
        
        {/* Тип курса */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getCourseTypeColor(course.course_type)}`}>
            {getCourseTypeIcon(course.course_type)}
            <span className="ml-1">{getCourseTypeText(course.course_type)}</span>
          </span>
        </div>

        {/* Рекомендуемый курс */}
        {course.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 text-xs font-medium rounded-full">
              <Star className="w-3 h-3 mr-1" />
              Топ
            </span>
          </div>
        )}

        {/* Уровень */}
        <div className="absolute bottom-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(course.level)}`}>
            {getLevelText(course.level)}
          </span>
        </div>

        {/* Статус заполненности */}
        {isFullyBooked && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-red-500 text-white px-2 py-1 text-xs font-medium rounded-full">
              Мест нет
            </span>
          </div>
        )}
      </div>

      {/* Содержимое карточки */}
      <div className="p-6">
        {/* Категория */}
        {course.category && (
          <div className="mb-2">
            <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
              {course.category}
            </span>
          </div>
        )}

        {/* Заголовок */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {course.title}
        </h3>
        
        {/* Описание */}
        {course.short_description && !compact && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {course.short_description}
          </p>
        )}

        {/* Метрики курса */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          {course.duration_hours && (
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{course.duration_hours}ч</span>
            </div>
          )}
          
          {course.max_students && (
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{course.current_students}/{course.max_students}</span>
            </div>
          )}

          {course.start_date && (
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{formatRussianDate(course.start_date, 'd MMM')}</span>
            </div>
          )}
        </div>

        {/* Инструктор */}
        {showInstructor && course.instructor_id && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Инструктор
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {course.instructor_id.slice(0, 8)}...
              </p>
            </div>
          </div>
        )}

        {/* Нижняя часть: цена и кнопка */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {formatPrice()}
          </div>
          
          <Link
            to={`/courses/${course.id}`}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {compact ? 'Подробнее' : 'Записаться'}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
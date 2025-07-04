import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  ArrowLeft, 
  Upload, 
  X, 
  Plus,
  Trash2,
  Eye,
  BookOpen,
  MonitorPlay,
  Building2,
  Zap
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface CourseFormData {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  course_type: 'online' | 'offline' | 'hybrid';
  status: 'draft' | 'active' | 'archived' | 'completed';
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  language_code: string;
  duration_weeks: number | '';
  duration_hours: number | '';
  start_date: string;
  end_date: string;
  enrollment_start: string;
  enrollment_end: string;
  max_students: number | '';
  price: number | '';
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url: string;
  gallery_images: string[];
  video_url: string;
  requirements: string[];
  learning_outcomes: string[];
  certificate_available: boolean;
  instructor_id: string;
  location_type: string;
  venue_name: string;
  venue_address: string;
  online_platform: string;
  online_meeting_url: string;
  is_featured: boolean;
  is_public: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
}

interface Speaker {
  id: string;
  name: string;
  title?: string;
  avatar_url?: string;
}

const CreateEditCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    course_type: 'offline',
    status: 'draft',
    level: 'beginner',
    category: '',
    tags: [],
    language_code: 'ru',
    duration_weeks: '',
    duration_hours: '',
    start_date: '',
    end_date: '',
    enrollment_start: '',
    enrollment_end: '',
    max_students: '',
    price: '',
    currency: 'RUB',
    payment_type: 'free',
    cover_image_url: '',
    gallery_images: [],
    video_url: '',
    requirements: [],
    learning_outcomes: [],
    certificate_available: false,
    instructor_id: '',
    location_type: 'offline',
    venue_name: '',
    venue_address: '',
    online_platform: '',
    online_meeting_url: '',
    is_featured: false,
    is_public: true,
    meta_title: '',
    meta_description: '',
    meta_keywords: []
  });

  // Состояния для массивов
  const [newTag, setNewTag] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchSpeakers();
    if (isEditing) {
      fetchCourse();
    }
  }, [id]);

  const fetchSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('id, name, title, avatar_url')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      toast.error('Ошибка при загрузке спикеров');
    }
  };

  const fetchCourse = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          short_description: data.short_description || '',
          description: data.description || '',
          course_type: data.course_type || 'offline',
          status: data.status || 'draft',
          level: data.level || 'beginner',
          category: data.category || '',
          tags: data.tags || [],
          language_code: data.language_code || 'ru',
          duration_weeks: data.duration_weeks || '',
          duration_hours: data.duration_hours || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          enrollment_start: data.enrollment_start || '',
          enrollment_end: data.enrollment_end || '',
          max_students: data.max_students || '', 
          price: data.price || '',
          currency: data.currency || 'RUB',
          payment_type: data.payment_type || 'free',
          cover_image_url: data.cover_image_url || '',
          gallery_images: data.gallery_images || [],
          video_url: data.video_url || '',
          requirements: data.requirements || [],
          learning_outcomes: data.learning_outcomes || [],
          certificate_available: data.certificate_available || false,
          instructor_id: data.instructor_id || '',
          location_type: data.location_type || 'offline',
          venue_name: data.venue_name || '',
          venue_address: data.venue_address || '',
          online_platform: data.online_platform || '',
          online_meeting_url: data.online_meeting_url || '',
          is_featured: data.is_featured || false,
          is_public: data.is_public !== false,
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          meta_keywords: data.meta_keywords || []
        });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Ошибка при загрузке курса');
      navigate('/admin/courses');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[а-я]/g, (char) => {
        const translitMap: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return translitMap[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Автогенерация slug при изменении title
    if (field === 'title' && !isEditing) {
      const newSlug = generateSlug(value);
      setFormData(prev => ({
        ...prev,
        slug: newSlug
      }));
    }
  };

  const handleImageUpload = async (file: File, type: 'cover' | 'gallery') => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `courses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('courses')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('courses')
        .getPublicUrl(filePath);

      if (type === 'cover') {
        handleInputChange('cover_image_url', publicUrl);
      } else {
        handleInputChange('gallery_images', [...formData.gallery_images, publicUrl]);
      }

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = formData.gallery_images.filter((_, i) => i !== index);
    handleInputChange('gallery_images', newGallery);
  };

  const addArrayItem = (field: 'tags' | 'requirements' | 'learning_outcomes' | 'meta_keywords', value: string) => {
    if (value.trim()) {
      const currentArray = formData[field] as string[];
      if (!currentArray.includes(value.trim())) {
        handleInputChange(field, [...currentArray, value.trim()]);
      }
    }
  };

  const removeArrayItem = (field: 'tags' | 'requirements' | 'learning_outcomes' | 'meta_keywords', index: number) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.filter((_, i) => i !== index);
    handleInputChange(field, newArray);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Название курса обязательно');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('URL-адрес курса обязателен');
      return;
    }

    try {
      setSaving(true);
      
      // Подготовка данных для сохранения
      const courseData = {
        ...formData,
        duration_weeks: formData.duration_weeks === '' ? null : Number(formData.duration_weeks),
        duration_hours: formData.duration_hours === '' ? null : Number(formData.duration_hours),
        max_students: formData.max_students === '' ? null : Number(formData.max_students),
        price: formData.price === '' ? null : Number(formData.price),
        instructor_id: formData.instructor_id || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        enrollment_start: formData.enrollment_start || null,
        enrollment_end: formData.enrollment_end || null,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Курс успешно обновлен');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            ...courseData,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast.success('Курс успешно создан');
      }

      navigate('/admin/courses');
    } catch (error: any) {
      console.error('Error saving course:', error);
      if (error.code === '23505') {
        toast.error('Курс с таким URL уже существует');
      } else {
        toast.error('Ошибка при сохранении курса');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/courses')}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Редактировать курс' : 'Создать новый курс'}
            </h1>
          </div>
          
          {isEditing && formData.slug && (
            <div className="flex items-center gap-4">
              <a
                href={`/courses/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Eye className="h-4 w-4" />
                Посмотреть курс
              </a>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Основная информация */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Основная информация
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название курса *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите название курса"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL-адрес *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="url-adres-kursa"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Будет использоваться в адресе: /courses/{formData.slug}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Краткое описание
                </label>
                <textarea
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Краткое описание курса для карточек"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип курса
                </label>
                <select
                  value={formData.course_type}
                  onChange={(e) => handleInputChange('course_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="offline">Очный</option>
                  <option value="online">Онлайн</option>
                  <option value="hybrid">Гибридный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="draft">Черновик</option>
                  <option value="active">Активный</option>
                  <option value="completed">Завершен</option>
                  <option value="archived">Архивный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Уровень сложности
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="beginner">Начальный</option>
                  <option value="intermediate">Средний</option>
                  <option value="advanced">Продвинутый</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Физика, Биология, Химия..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Инструктор
                </label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) => handleInputChange('instructor_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Выберите инструктора</option>
                  {speakers.map(speaker => (
                    <option key={speaker.id} value={speaker.id}>
                      {speaker.name} {speaker.title && `(${speaker.title})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Язык
                </label>
                <select
                  value={formData.language_code}
                  onChange={(e) => handleInputChange('language_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                  <option value="sr">Српски</option>
                </select>
              </div>
            </div>
          </div>

          {/* Продолжительность и даты */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Продолжительность и расписание
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Продолжительность (недель)
                </label>
                <input
                  type="number"
                  value={formData.duration_weeks}
                  onChange={(e) => handleInputChange('duration_weeks', e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="8"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Общее количество часов
                </label>
                <input
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => handleInputChange('duration_hours', e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="24"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата начала курса
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата окончания курса
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Начало записи
                </label>
                <input
                  type="datetime-local"
                  value={formData.enrollment_start}
                  onChange={(e) => handleInputChange('enrollment_start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Окончание записи
                </label>
                <input
                  type="datetime-local"
                  value={formData.enrollment_end}
                  onChange={(e) => handleInputChange('enrollment_end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Стоимость и ограничения */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Стоимость и ограничения
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип оплаты
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => handleInputChange('payment_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="free">Бесплатно</option>
                  <option value="paid">Разовая оплата</option>
                  <option value="subscription">Подписка</option>
                </select>
              </div>

              {formData.payment_type !== 'free' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="5000"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="RUB">RUB</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="RSD">RSD</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Максимум студентов
                </label>
                <input
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => handleInputChange('max_students', e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="20"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Кнопки сохранения */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/admin/courses')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Отменить
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing ? 'Обновить курс' : 'Создать курс'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditCoursePage;
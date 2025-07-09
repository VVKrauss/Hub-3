// src/pages/admin/CreateEditEventPage.tsx
// Полный файл для создания и редактирования мероприятий с поддержкой медиафайлов
// Часть 1: Импорты и типы

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Info, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Globe, 
  Image,
  Save, 
  Loader2, 
  Trash2,
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';

// Импорты для работы с данными
import { supabase } from '../../lib/supabase';
import { formatDateTimeForInput } from '../../utils/dateTimeUtils';

// Импорт медиа-компонентов
import { EventMediaSection } from '../../components/events/media';
import type { EventMediaData } from '../../components/events/media';

// Типы для событий
import type { 
  ShEvent, 
  ShEventType, 
  ShEventStatus, 
  ShAgeCategory, 
  ShPaymentType 
} from '../../types/database';

// Типы для табов
type ActiveTab = 'basic' | 'details' | 'location' | 'media' | 'registration' | 'program' | 'seo';

// Тип для режима локации
type LocationType = 'physical' | 'online' | 'hybrid';

// Интерфейс для элемента программы фестиваля
interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}

// Расширенный интерфейс события для формы
interface EventFormData extends Omit<ShEvent, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  // Дополнительные поля для совместимости
  speakers?: string[];
  festival_program?: FestivalProgramItem[];
  hide_speakers_gallery?: boolean;
  photo_gallery?: string;
}

// Конфигурация для типов событий
const EVENT_TYPES: { value: ShEventType; label: string }[] = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'workshop', label: 'Мастер-класс' },
  { value: 'conference', label: 'Конференция' },
  { value: 'seminar', label: 'Семинар' },
  { value: 'festival', label: 'Фестиваль' },
  { value: 'discussion', label: 'Дискуссия' },
  { value: 'concert', label: 'Концерт' },
  { value: 'standup', label: 'Стендап' },
  { value: 'excursion', label: 'Экскурсия' },
  { value: 'quiz', label: 'Викторина' },
  { value: 'swap', label: 'Обмен' },
  { value: 'movie_discussion', label: 'Обсуждение фильма' },
  { value: 'conversation_club', label: 'Разговорный клуб' },
  { value: 'other', label: 'Другое' }
];

// Статусы событий
const EVENT_STATUSES: { value: ShEventStatus; label: string }[] = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активное' },
  { value: 'past', label: 'Прошедшее' },
  { value: 'cancelled', label: 'Отменено' }
];

// Возрастные категории
const AGE_CATEGORIES: { value: ShAgeCategory; label: string }[] = [
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' }
];

// Типы оплаты
const PAYMENT_TYPES: { value: ShPaymentType; label: string }[] = [
  { value: 'free', label: 'Бесплатно' },
  { value: 'paid', label: 'Платно' },
  { value: 'donation', label: 'Донейшн' }
];

// Типы локации
const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'physical', label: 'Физическое место' },
  { value: 'online', label: 'Онлайн' },
  { value: 'hybrid', label: 'Гибридное' }
];

// Валюты
const CURRENCIES = [
  { value: 'RSD', label: 'RSD (Сербский динар)' },
  { value: 'EUR', label: 'EUR (Евро)' },
  { value: 'USD', label: 'USD (Доллар США)' },
  { value: 'RUB', label: 'RUB (Российский рубль)' }
];

// Языки
const LANGUAGES = [
  { value: 'sr', label: 'Сербский' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'Английский' },
  { value: 'de', label: 'Немецкий' },
  { value: 'fr', label: 'Французский' }
];

// Часовые пояса
const TIMEZONES = [
  { value: 'Europe/Belgrade', label: 'Белград (CET)' },
  { value: 'Europe/Moscow', label: 'Москва (MSK)' },
  { value: 'Europe/London', label: 'Лондон (GMT)' },
  { value: 'Europe/Berlin', label: 'Берлин (CET)' },
  { value: 'UTC', label: 'UTC' }
];

// Утилиты для работы со slug
const generateSlug = (title: string): string => {
  const cyrillicToLatin = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => cyrillicToLatin[char] || char)
    .replace(/[^a-z0-9\s-]/g, '') // Убираем специальные символы
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/-+/g, '-') // Убираем повторяющиеся дефисы
    .replace(/^-|-$/g, ''); // Убираем дефисы в начале и конце
};

// Проверка уникальности slug
const checkSlugUniqueness = async (slug: string, currentEventId?: string): Promise<boolean> => {
  if (!slug) return false;
  
  try {
    let query = supabase
      .from('sh_events')
      .select('id')
      .eq('slug', slug);
    
    if (currentEventId) {
      query = query.neq('id', currentEventId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking slug uniqueness:', error);
      return false;
    }
    
    return data.length === 0;
  } catch (error) {
    console.error('Error in checkSlugUniqueness:', error);
    return false;
  }
};

// Генерация уникального slug
const generateUniqueSlug = async (title: string, currentEventId?: string): Promise<string> => {
  const baseSlug = generateSlug(title);
  if (!baseSlug) return '';
  
  let slug = baseSlug;
  let counter = 1;
  
  while (!(await checkSlugUniqueness(slug, currentEventId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Защита от бесконечного цикла
    if (counter > 100) {
      const timestamp = Date.now().toString().slice(-6);
      slug = `${baseSlug}-${timestamp}`;
      break;
    }
  }
  
  return slug;
};

// Часть 2: Основной компонент и состояние

const CreateEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Основные состояния
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('basic');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  
  // Начальное состояние события
  const [event, setEvent] = useState<EventFormData>({
    slug: '',
    title: '',
    short_description: '',
    description: '',
    event_type: 'lecture',
    status: 'draft',
    age_category: '0+',
    tags: [],
    language_code: 'sr',
    start_at: '',
    end_at: '',
    timezone: 'Europe/Belgrade',
    location_type: 'physical',
    venue_name: '',
    venue_address: '',
    online_meeting_url: '',
    online_platform: '',
    cover_image_url: '',
    cover_image_original_url: '',
    gallery_images: [],
    video_url: '',
    payment_type: 'free',
    base_price: 0,
    currency: 'RSD',
    price_description: '',
    registration_required: true,
    registration_enabled: true,
    max_attendees: undefined,
    attendee_limit_per_registration: 5,
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    is_featured: false,
    is_public: true,
    show_attendees_count: true,
    allow_waitlist: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Дополнительные поля
    speakers: [],
    festival_program: [],
    hide_speakers_gallery: false,
    photo_gallery: ''
  });

  // Состояние для медиафайлов
  const [mediaData, setMediaData] = useState<EventMediaData>({
    coverImage: {},
    galleryImages: []
  });

  // Состояние для генерации slug
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string>('');

  // Автоматическая генерация slug при изменении заголовка
  const handleTitleChange = useCallback(async (newTitle: string) => {
    setEvent(prev => ({ ...prev, title: newTitle }));

    // Генерируем slug только для новых событий или если slug пустой
    if ((!id || !event.slug) && newTitle.trim()) {
      setIsGeneratingSlug(true);
      setSlugError('');
      
      try {
        const newSlug = await generateUniqueSlug(newTitle, id);
        if (newSlug) {
          setEvent(prev => ({ ...prev, slug: newSlug }));
        }
      } catch (error) {
        console.error('Error generating slug:', error);
        setSlugError('Ошибка при генерации URL');
      } finally {
        setIsGeneratingSlug(false);
      }
    }
  }, [id, event.slug]);

  // Обработка изменения slug вручную
  const handleSlugChange = useCallback(async (newSlug: string) => {
    setEvent(prev => ({ ...prev, slug: newSlug }));
    setSlugError('');

    if (newSlug.trim()) {
      // Проверяем уникальность с задержкой
      const timeoutId = setTimeout(async () => {
        const isUnique = await checkSlugUniqueness(newSlug, id);
        if (!isUnique) {
          setSlugError('Этот URL уже используется');
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [id]);

  // Инициализация медиафайлов при загрузке события
  const initializeMediaData = useCallback((loadedEvent: EventFormData) => {
    const initialMediaData: EventMediaData = {
      coverImage: {
        croppedUrl: loadedEvent.cover_image_url,
        originalUrl: loadedEvent.cover_image_original_url
      },
      galleryImages: (loadedEvent.gallery_images || []).map((url, index) => ({
        id: `existing_${index}`,
        url
      }))
    };
    setMediaData(initialMediaData);
  }, []);

  // Загрузка события
  const loadEvent = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sh_events')
        .select(`
          *,
          sh_event_speakers(
            id,
            speaker:sh_speakers(
              id,
              name,
              avatar_url,
              field_of_expertise
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Мероприятие не найдено');

      // Преобразуем данные для формы
      const formData: EventFormData = {
        ...data,
        // Преобразуем массивы и JSON поля
        tags: data.tags || [],
        meta_keywords: data.meta_keywords || [],
        gallery_images: data.gallery_images || [],
        speakers: data.sh_event_speakers?.map((es: any) => es.speaker?.id).filter(Boolean) || [],
        festival_program: data.festival_program || [],
        hide_speakers_gallery: data.hide_speakers_gallery || false,
        photo_gallery: data.gallery_images?.join(',') || ''
      };

      setEvent(formData);
      initializeMediaData(formData);
      
      console.log('Event loaded successfully:', formData);
      
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Ошибка при загрузке мероприятия');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  }, [initializeMediaData, navigate]);

  // Загрузка спикеров
  const loadSpeakers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sh_speakers')
        .select('id, name, avatar_url, field_of_expertise')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error loading speakers:', error);
    }
  }, []);

  // Эффекты для загрузки данных
  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
    loadSpeakers();
  }, [id, loadEvent, loadSpeakers]);

  // Обработчик изменений медиафайлов
  const handleMediaDataChange = useCallback((newMediaData: EventMediaData) => {
    setMediaData(newMediaData);
    
    // Обновляем основные данные события
    setEvent(prev => ({
      ...prev,
      cover_image_url: newMediaData.coverImage.croppedUrl || '',
      cover_image_original_url: newMediaData.coverImage.originalUrl || '',
      gallery_images: newMediaData.galleryImages.map(img => img.url)
    }));
  }, []);

  // Обработчик изменений основных полей
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'title') {
      handleTitleChange(value);
      return;
    }
    
    if (name === 'slug') {
      handleSlugChange(value);
      return;
    }

    let processedValue: any = value;
    
    // Специальная обработка для разных типов полей
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    } else if (name === 'tags' || name === 'meta_keywords') {
      // Обработка тегов (разделенных запятыми)
      processedValue = value.split(',').map(tag => tag.trim()).filter(Boolean);
    }

    setEvent(prev => ({
      ...prev,
      [name]: processedValue
    }));
  }, [handleTitleChange, handleSlugChange]);

  // Обработчик для программы фестиваля
  const handleFestivalProgramChange = useCallback((newProgram: FestivalProgramItem[]) => {
    setEvent(prev => ({
      ...prev,
      festival_program: newProgram
    }));
  }, []);

  // Валидация формы
  const validateForm = useCallback((): boolean => {
    const errors: string[] = [];

    // Обязательные поля
    if (!event.title.trim()) errors.push('Заголовок обязателен');
    if (!event.slug.trim()) errors.push('URL (slug) обязателен');
    if (!event.start_at) errors.push('Дата и время начала обязательны');
    if (!event.end_at) errors.push('Дата и время окончания обязательны');

    // Валидация slug
    if (event.slug && !/^[a-z0-9-]+$/.test(event.slug)) {
      errors.push('URL может содержать только строчные буквы, цифры и дефисы');
    }

    if (slugError) {
      errors.push(slugError);
    }

    // Валидация дат
    if (event.start_at && event.end_at) {
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      if (endDate <= startDate) {
        errors.push('Дата окончания должна быть позже даты начала');
      }
    }

    // Валидация локации
    if (event.location_type === 'physical' && !event.venue_name?.trim()) {
      errors.push('Для физического мероприятия требуется указать место проведения');
    }

    if (event.location_type === 'online' && !event.online_meeting_url?.trim()) {
      errors.push('Для онлайн мероприятия требуется указать ссылку на встречу');
    }

    // Валидация оплаты
    if (event.payment_type === 'paid' && (!event.base_price || event.base_price <= 0)) {
      errors.push('Для платного мероприятия требуется указать цену');
    }

    // Валидация медиафайлов
    if (!mediaData.coverImage.croppedUrl && !mediaData.coverImage.originalUrl) {
      errors.push('Фоновое изображение обязательно');
    }

    // Валидация регистрации
    if (event.registration_enabled && event.max_attendees && event.max_attendees < 1) {
      errors.push('Максимальное количество участников должно быть больше 0');
    }

    if (errors.length > 0) {
      toast.error(`Ошибки валидации:\n${errors.join('\n')}`);
      return false;
    }

    return true;
  }, [event, mediaData, slugError]);

  // Показать загрузку
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
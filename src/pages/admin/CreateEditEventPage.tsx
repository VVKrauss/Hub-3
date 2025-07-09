// src/pages/admin/CreateEditEventPage.tsx
// Полный файл для создания и редактирования мероприятий с поддержкой медиафайлов

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

import { supabase } from '../../lib/supabase';
import { formatDateTimeForInput } from '../../utils/dateTimeUtils';
import { EventMediaSection } from '../../components/events/media';
import type { EventMediaData } from '../../components/events/media';
import type { 
  ShEvent, 
  ShEventType, 
  ShEventStatus, 
  ShAgeCategory, 
  ShPaymentType 
} from '../../types/database';

type ActiveTab = 'basic' | 'details' | 'location' | 'media' | 'registration' | 'program' | 'seo';
type LocationType = 'physical' | 'online' | 'hybrid';

interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}

interface EventFormData extends Omit<ShEvent, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  speakers?: string[];
  festival_program?: FestivalProgramItem[];
  hide_speakers_gallery?: boolean;
  photo_gallery?: string;
}

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

const EVENT_STATUSES: { value: ShEventStatus; label: string }[] = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активное' },
  { value: 'past', label: 'Прошедшее' },
  { value: 'cancelled', label: 'Отменено' }
];

const AGE_CATEGORIES: { value: ShAgeCategory; label: string }[] = [
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' }
];

const PAYMENT_TYPES: { value: ShPaymentType; label: string }[] = [
  { value: 'free', label: 'Бесплатно' },
  { value: 'paid', label: 'Платно' },
  { value: 'donation', label: 'Донейшн' }
];

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'physical', label: 'Физическое место' },
  { value: 'online', label: 'Онлайн' },
  { value: 'hybrid', label: 'Гибридное' }
];

const CURRENCIES = [
  { value: 'RSD', label: 'RSD (Сербский динар)' },
  { value: 'EUR', label: 'EUR (Евро)' },
  { value: 'USD', label: 'USD (Доллар США)' },
  { value: 'RUB', label: 'RUB (Российский рубль)' }
];

const LANGUAGES = [
  { value: 'sr', label: 'Сербский' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'Английский' },
  { value: 'de', label: 'Немецкий' },
  { value: 'fr', label: 'Французский' }
];

const TIMEZONES = [
  { value: 'Europe/Belgrade', label: 'Белград (CET)' },
  { value: 'Europe/Moscow', label: 'Москва (MSK)' },
  { value: 'Europe/London', label: 'Лондон (GMT)' },
  { value: 'Europe/Berlin', label: 'Берлин (CET)' },
  { value: 'UTC', label: 'UTC' }
];

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
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

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

const generateUniqueSlug = async (title: string, currentEventId?: string): Promise<string> => {
  const baseSlug = generateSlug(title);
  if (!baseSlug) return '';
  
  let slug = baseSlug;
  let counter = 1;
  
  while (!(await checkSlugUniqueness(slug, currentEventId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    if (counter > 100) {
      const timestamp = Date.now().toString().slice(-6);
      slug = `${baseSlug}-${timestamp}`;
      break;
    }
  }
  
  return slug;
};
const CreateEditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('basic');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  
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
    speakers: [],
    festival_program: [],
    hide_speakers_gallery: false,
    photo_gallery: ''
  });

  const [mediaData, setMediaData] = useState<EventMediaData>({
    coverImage: {},
    galleryImages: []
  });

  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string>('');

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setEvent(prev => ({ ...prev, title: newTitle }));

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

  const handleSlugChange = useCallback(async (newSlug: string) => {
    setEvent(prev => ({ ...prev, slug: newSlug }));
    setSlugError('');

    if (newSlug.trim()) {
      const timeoutId = setTimeout(async () => {
        const isUnique = await checkSlugUniqueness(newSlug, id);
        if (!isUnique) {
          setSlugError('Этот URL уже используется');
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [id]);

  const initializeMediaData = useCallback((loadedEvent: EventFormData) => {
    const initialMediaData: EventMediaData = {
      coverImage: {
        url: loadedEvent.cover_image_url,
        originalUrl: loadedEvent.cover_image_original_url
      },
      galleryImages: (loadedEvent.gallery_images || []).map((url, index) => ({
        id: `existing_${index}`,
        url
      }))
    };
    setMediaData(initialMediaData);
  }, []);

  // ✅ ИСПРАВЛЕННАЯ функция loadEvent
  const loadEvent = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      
      // ✅ ИСПРАВЛЕНО: Используем простой запрос без join'ов
      const { data, error } = await supabase
        .from('sh_events')
        .select('*')  // Просто получаем основные данные события
        .eq('id', eventId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Мероприятие не найдено');

      // ✅ ОТДЕЛЬНО загружаем спикеров события
      const { data: eventSpeakers, error: speakersError } = await supabase
        .from('sh_event_speakers')
        .select('speaker_id')
        .eq('event_id', eventId)
        .order('display_order');

      if (speakersError) {
        console.warn('Error loading event speakers:', speakersError);
      }

      const formData: EventFormData = {
        ...data,
        tags: data.tags || [],
        meta_keywords: data.meta_keywords || [],
        gallery_images: data.gallery_images || [],
        speakers: eventSpeakers?.map(es => es.speaker_id).filter(Boolean) || [],
        festival_program: data.festival_program || [],
        hide_speakers_gallery: data.hide_speakers_gallery || false,
        photo_gallery: data.gallery_images?.join(',') || ''
      };

      setEvent(formData);
      initializeMediaData(formData);
      
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Ошибка при загрузке мероприятия');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  }, [initializeMediaData, navigate]);

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

  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
    loadSpeakers();
  }, [id, loadEvent, loadSpeakers]);

  // ✅ ИСПРАВЛЕННАЯ функция handleMediaDataChange
  const handleMediaDataChange = useCallback((newMediaData: {
    cover_image_url?: string;
    gallery_images?: string[];
    video_url?: string;
  }) => {
    // Обновляем mediaData в старом формате для совместимости
    setMediaData({
      coverImage: {
        url: newMediaData.cover_image_url || '',
        originalUrl: newMediaData.cover_image_url || ''
      },
      galleryImages: (newMediaData.gallery_images || []).map((url, index) => ({
        id: `img_${index}`,
        url
      }))
    });
    
    // Обновляем event
    setEvent(prev => ({
      ...prev,
      cover_image_url: newMediaData.cover_image_url || '',
      cover_image_original_url: newMediaData.cover_image_url || '',
      gallery_images: newMediaData.gallery_images || [],
      video_url: newMediaData.video_url || ''
    }));
  }, []);

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
    
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    } else if (name === 'tags' || name === 'meta_keywords') {
      processedValue = value.split(',').map(tag => tag.trim()).filter(Boolean);
    }

    setEvent(prev => ({
      ...prev,
      [name]: processedValue
    }));
  }, [handleTitleChange, handleSlugChange]);

  const handleFestivalProgramChange = useCallback((newProgram: FestivalProgramItem[]) => {
    setEvent(prev => ({
      ...prev,
      festival_program: newProgram
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: string[] = [];

    if (!event.title.trim()) errors.push('Заголовок обязателен');
    if (!event.slug.trim()) errors.push('URL (slug) обязателен');
    if (!event.start_at) errors.push('Дата и время начала обязательны');
    if (!event.end_at) errors.push('Дата и время окончания обязательны');

    if (event.slug && !/^[a-z0-9-]+$/.test(event.slug)) {
      errors.push('URL может содержать только строчные буквы, цифры и дефисы');
    }

    if (slugError) {
      errors.push(slugError);
    }

    if (event.start_at && event.end_at) {
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      if (endDate <= startDate) {
        errors.push('Дата окончания должна быть позже даты начала');
      }
    }

    if (event.location_type === 'physical' && !event.venue_name?.trim()) {
      errors.push('Для физического мероприятия требуется указать место проведения');
    }

    if (event.location_type === 'online' && !event.online_meeting_url?.trim()) {
      errors.push('Для онлайн мероприятия требуется указать ссылку на встречу');
    }

    if (event.payment_type === 'paid' && (!event.base_price || event.base_price <= 0)) {
      errors.push('Для платного мероприятия требуется указать цену');
    }

    if (!mediaData.coverImage.url && !mediaData.coverImage.originalUrl) {
      errors.push('Фоновое изображение обязательно');
    }

    if (event.registration_enabled && event.max_attendees && event.max_attendees < 1) {
      errors.push('Максимальное количество участников должно быть больше 0');
    }

    if (errors.length > 0) {
      toast.error(`Ошибки валидации:\n${errors.join('\n')}`);
      return false;
    }

    return true;
  }, [event, mediaData, slugError]);
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (!await checkSlugUniqueness(event.slug, id)) {
        toast.error('URL уже используется другим мероприятием');
        return;
      }

      const eventData = {
        ...event,
        cover_image_url: mediaData.coverImage.url || null, 
        cover_image_original_url: mediaData.coverImage.originalUrl || null,
        gallery_images: mediaData.galleryImages.map(img => img.url),
        venue_name: event.location_type === 'physical' ? event.venue_name : null,
        venue_address: event.location_type === 'physical' ? event.venue_address : null,
        online_meeting_url: event.location_type !== 'physical' ? event.online_meeting_url : null,
        online_platform: event.location_type !== 'physical' ? event.online_platform : null,
        base_price: event.payment_type === 'paid' ? event.base_price : null,
        price_description: event.payment_type === 'paid' ? event.price_description : null,
        max_attendees: event.registration_enabled ? event.max_attendees : null,
        attendee_limit_per_registration: event.registration_enabled ? event.attendee_limit_per_registration : 5,
        tags: event.tags || [],
        meta_keywords: event.meta_keywords || [],
        updated_at: new Date().toISOString(),
        speakers: undefined,
        festival_program: undefined,
        hide_speakers_gallery: undefined,
        photo_gallery: undefined
      };

      if (id) {
        const { error } = await supabase
          .from('sh_events')
          .update(eventData)
          .eq('id', id);

        if (error) throw error;
        
        await updateEventSpeakers(id, event.speakers || []);
        
        if (event.event_type === 'festival' && event.festival_program) {
          await updateFestivalProgram(id, event.festival_program);
        }
        
        toast.success('Мероприятие успешно обновлено');
      } else {
        const { data: newEvent, error } = await supabase
          .from('sh_events')
          .insert([eventData])
          .select()
          .single();

        if (error) throw error;
        
        if (event.speakers && event.speakers.length > 0) {
          await updateEventSpeakers(newEvent.id, event.speakers);
        }
        
        if (event.event_type === 'festival' && event.festival_program) {
          await updateFestivalProgram(newEvent.id, event.festival_program);
        }
        
        toast.success('Мероприятие успешно создано');
        navigate(`/admin/events/${newEvent.id}/edit`);
      }

    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Ошибка при сохранении мероприятия');
    } finally {
      setSaving(false);
    }
  }, [event, mediaData, id, validateForm, navigate]);

  const updateEventSpeakers = useCallback(async (eventId: string, speakerIds: string[]) => {
    try {
      const { error: deleteError } = await supabase
        .from('sh_event_speakers')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      if (speakerIds.length > 0) {
        const speakerData = speakerIds.map((speakerId, index) => ({
          event_id: eventId,
          speaker_id: speakerId,
          role: 'speaker',
          display_order: index + 1
        }));

        const { error: insertError } = await supabase
          .from('sh_event_speakers')
          .insert(speakerData);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating event speakers:', error);
      throw error;
    }
  }, []);

  const updateFestivalProgram = useCallback(async (eventId: string, program: FestivalProgramItem[]) => {
    try {
      const { error: deleteError } = await supabase
        .from('sh_event_schedule')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      if (program.length > 0) {
        const scheduleData = program.map((item, index) => ({
          event_id: eventId,
          title: item.title,
          description: item.description,
          start_time: item.start_time,
          end_time: item.end_time,
          date: event.start_at.split('T')[0],
          speaker_id: item.lecturer_id || null,
          display_order: index + 1
        }));

        const { error: insertError } = await supabase
          .from('sh_event_schedule')
          .insert(scheduleData);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating festival program:', error);
      throw error;
    }
  }, [event.start_at]);

  const handleDelete = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      await Promise.all([
        supabase.from('sh_event_speakers').delete().eq('event_id', id),
        supabase.from('sh_event_schedule').delete().eq('event_id', id),
        supabase.from('sh_registrations').delete().eq('event_id', id)
      ]);

      const { error } = await supabase
        .from('sh_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Мероприятие удалено');
      navigate('/admin/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка при удалении мероприятия');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [id, navigate]);

  const tabs = [
    { id: 'basic', label: 'Основное', icon: Info },
    { id: 'details', label: 'Детали', icon: Calendar },
    { id: 'location', label: 'Место', icon: MapPin },
    { id: 'media', label: 'Медиафайлы', icon: Image },
    { id: 'registration', label: 'Регистрация', icon: Users },
    ...(event.event_type === 'festival' ? [{ id: 'program', label: 'Программа', icon: Clock }] : []),
    { id: 'seo', label: 'SEO', icon: Globe }
  ];

  const DeleteConfirmModal = () => (
    showDeleteConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Подтверждение удаления
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Вы уверены, что хотите удалить мероприятие "{event.title}"? 
            Это действие нельзя отменить.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/events')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {id ? 'Редактирование мероприятия' : 'Создание мероприятия'}
            </h1>
            {event.title && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {event.title}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {id && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || isGeneratingSlug}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {id ? 'Обновить' : 'Создать'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-dark-700 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700">
        {activeTab === 'basic' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок мероприятия *
                </label>
                <input
                  type="text"
                  name="title"
                  value={event.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Введите заголовок мероприятия"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL (slug) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="slug"
                    value={event.slug}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white ${
                      slugError 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-dark-600'
                    }`}
                    placeholder="url-dlya-meropriyatiya"
                    pattern="^[a-z0-9-]+$"
                    required
                  />
                  {isGeneratingSlug && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {slugError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {slugError}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  URL мероприятия: /events/{event.slug}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Краткое описание
                </label>
                <textarea
                  name="short_description"
                  value={event.short_description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Краткое описание мероприятия для анонсов и списков"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип мероприятия *
                </label>
                <select
                  name="event_type"
                  value={event.event_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус *
                </label>
                <select
                  name="status"
                  value={event.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {EVENT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Возрастная категория *
                </label>
                <select
                  name="age_category"
                  value={event.age_category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {AGE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Язык мероприятия *
                </label>
                <select
                  name="language_code"
                  value={event.language_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Теги
                </label>
                <input
                  type="text"
                  name="tags"
                  value={event.tags?.join(', ') || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="тег1, тег2, тег3"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Разделите теги запятыми
                </p>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={event.is_featured}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Рекомендуемое
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={event.is_public}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Публичное
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="show_attendees_count"
                    checked={event.show_attendees_count}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Показывать количество участников
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата и время начала *
                </label>
                <input
                  type="datetime-local"
                  name="start_at"
                  value={event.start_at ? formatDateTimeForInput(event.start_at) : ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата и время окончания *
                </label>
                <input
                  type="datetime-local"
                  name="end_at"
                  value={event.end_at ? formatDateTimeForInput(event.end_at) : ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Часовой пояс *
                </label>
                <select
                  name="timezone"
                  value={event.timezone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ссылка на видео
                </label>
                <input
                  type="url"
                  name="video_url"
                  value={event.video_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное описание
                </label>
                <textarea
                  name="description"
                  value={event.description}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Подробное описание мероприятия"
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'location' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип локации *
                </label>
                <select
                  name="location_type"
                  value={event.location_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  required
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {(event.location_type === 'physical' || event.location_type === 'hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Название места {event.location_type === 'physical' ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      name="venue_name"
                      value={event.venue_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Название места проведения"
                      required={event.location_type === 'physical'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Адрес
                    </label>
                    <input
                      type="text"
                      name="venue_address"
                      value={event.venue_address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Адрес места проведения"
                    />
                  </div>
                </>
              )}

              {(event.location_type === 'online' || event.location_type === 'hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ссылка на встречу {event.location_type === 'online' ? '*' : ''}
                    </label>
                    <input
                      type="url"
                      name="online_meeting_url"
                      value={event.online_meeting_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="https://zoom.us/j/..."
                      required={event.location_type === 'online'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Платформа
                    </label>
                    <input
                      type="text"
                      name="online_platform"
                      value={event.online_platform}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Zoom, Teams, Meet..."
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-6">
            <EventMediaSection
              eventId={id}
              eventSlug={event.slug}
              initialMediaData={mediaData}
              onMediaDataChange={handleMediaDataChange}
              disabled={saving}
            />
          </div>
        )}

        {activeTab === 'registration' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="registration_enabled"
                    checked={event.registration_enabled}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Включить систему регистрации
                  </span>
                </label>
              </div>

              {event.registration_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Максимальное количество участников
                    </label>
                    <input
                      type="number"
                      name="max_attendees"
                      value={event.max_attendees || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Оставьте пустым для неограниченного количества"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Максимум билетов на одну регистрацию
                    </label>
                    <input
                      type="number"
                      name="attendee_limit_per_registration"
                      value={event.attendee_limit_per_registration}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      min="1"
                      max="10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Тип оплаты *
                    </label>
                    <select
                      name="payment_type"
                      value={event.payment_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      required
                    >
                      {PAYMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта *
                    </label>
                    <select
                      name="currency"
                      value={event.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      required
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {event.payment_type === 'paid' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Цена *
                        </label>
                        <input
                          type="number"
                          name="base_price"
                          value={event.base_price || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Описание цены
                        </label>
                        <input
                          type="text"
                          name="price_description"
                          value={event.price_description}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="За один билет, включает материалы..."
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="registration_required"
                        checked={event.registration_required}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Регистрация обязательна
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="allow_waitlist"
                        checked={event.allow_waitlist}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Разрешить лист ожидания
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeTab === 'program' && event.event_type === 'festival' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Программа фестиваля
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newItem: FestivalProgramItem = {
                    title: `Пункт программы ${(event.festival_program?.length || 0) + 1}`,
                    description: '',
                    image_url: '',
                    start_time: '10:00',
                    end_time: '11:00',
                    lecturer_id: ''
                  };
                  handleFestivalProgramChange([...(event.festival_program || []), newItem]);
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Добавить пункт
              </button>
            </div>

            {event.festival_program && event.festival_program.length > 0 ? (
              <div className="space-y-4">
                {event.festival_program.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Пункт {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newProgram = event.festival_program?.filter((_, i) => i !== index);
                          handleFestivalProgramChange(newProgram || []);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Название
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const newProgram = [...(event.festival_program || [])];
                            newProgram[index] = { ...item, title: e.target.value };
                            handleFestivalProgramChange(newProgram);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="Название пункта программы"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Спикер
                        </label>
                        <select
                          value={item.lecturer_id}
                          onChange={(e) => {
                            const newProgram = [...(event.festival_program || [])];
                            newProgram[index] = { ...item, lecturer_id: e.target.value };
                            handleFestivalProgramChange(newProgram);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        >
                          <option value="">Выберите спикера</option>
                          {speakers.map((speaker: any) => (
                            <option key={speaker.id} value={speaker.id}>
                              {speaker.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Время начала
                        </label>
                        <input
                          type="time"
                          value={item.start_time}
                          onChange={(e) => {
                            const newProgram = [...(event.festival_program || [])];
                            newProgram[index] = { ...item, start_time: e.target.value };
                            handleFestivalProgramChange(newProgram);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Время окончания
                        </label>
                        <input
                          type="time"
                          value={item.end_time}
                          onChange={(e) => {
                            const newProgram = [...(event.festival_program || [])];
                            newProgram[index] = { ...item, end_time: e.target.value };
                            handleFestivalProgramChange(newProgram);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Описание
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            const newProgram = [...(event.festival_program || [])];
                            newProgram[index] = { ...item, description: e.target.value };
                            handleFestivalProgramChange(newProgram);
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="Описание пункта программы"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Программа фестиваля пока не добавлена</p>
                <p className="text-sm">Нажмите "Добавить пункт" для создания программы</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">О программе фестиваля:</p>
                  <p>
                    Программа сохраняется в таблице sh_event_schedule. 
                    Каждый пункт программы может быть привязан к спикеру и содержать время проведения.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta заголовок
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={event.meta_title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Если не указан, будет использован заголовок мероприятия"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Рекомендуется: 50-60 символов
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta описание
                </label>
                <textarea
                  name="meta_description"
                  value={event.meta_description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Если не указано, будет использовано краткое описание"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Рекомендуется: 150-160 символов
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta ключевые слова
                </label>
                <input
                  type="text"
                  name="meta_keywords"
                  value={event.meta_keywords?.join(', ') || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="ключевое слово 1, ключевое слово 2, ключевое слово 3"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Разделите ключевые слова запятыми
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-dark-700 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || isGeneratingSlug}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {id ? 'Обновить мероприятие' : 'Создать мероприятие'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmModal />
    </div>
  );
};

export default CreateEditEventPage;
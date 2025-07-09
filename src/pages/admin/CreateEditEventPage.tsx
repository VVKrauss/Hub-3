// src/pages/admin/CreateEditEventPage.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, Info, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatDateTimeForInput } from '../../utils/dateTimeUtils';
import { EventMediaSection } from '../../components/events/media';

// Constants
const TITLE_MAX_LENGTH = 255;
const SHORT_DESC_MAX_LENGTH = 500;
const DESC_MAX_LENGTH = 5000;
const SLUG_MAX_LENGTH = 100;

// Event types
const eventTypes = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'workshop', label: 'Мастер-класс' },
  { value: 'discussion', label: 'Дискуссия' },
  { value: 'conference', label: 'Конференция' },
  { value: 'seminar', label: 'Семинар' },
  { value: 'festival', label: 'Фестиваль' },
  { value: 'concert', label: 'Концерт' },
  { value: 'standup', label: 'Стенд-ап' },
  { value: 'excursion', label: 'Экскурсия' },
  { value: 'quiz', label: 'Квиз' },
  { value: 'swap', label: 'Своп' },
  { value: 'meetup', label: 'Митап' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'training', label: 'Тренинг' },
  { value: 'other', label: 'Другое' },
];

const eventStatuses = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активное' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'past', label: 'Прошедшее' },
];

const ageCategories = [
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' },
];

const paymentTypes = [
  { value: 'free', label: 'Бесплатно' },
  { value: 'paid', label: 'Платно' },
  { value: 'donation', label: 'Донаты' },
];

const locationTypes = [
  { value: 'physical', label: 'Физическое место' },
  { value: 'online', label: 'Онлайн' },
  { value: 'hybrid', label: 'Гибридное' },
];

// Interfaces
interface ShEvent {
  id?: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  event_type: string;
  status: string;
  age_category: string;
  tags: string[];
  language_code: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: string;
  venue_name: string;
  venue_address: string;
  online_meeting_url: string;
  online_platform: string;
  cover_image_url: string;
  gallery_images: string[];
  video_url: string;
  payment_type: string;
  base_price: number;
  currency: string;
  price_description: string;
  registration_required: boolean;
  registration_enabled: boolean;
  registration_start_at?: string;
  registration_end_at?: string;
  max_attendees?: number;
  attendee_limit_per_registration: number;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  is_featured: boolean;
  is_public: boolean;
  show_attendees_count: boolean;
  allow_waitlist: boolean;
  // Legacy fields for backward compatibility
  speakers?: string[];
  festival_program?: FestivalProgramItem[];
  hide_speakers_gallery?: boolean;
  photo_gallery?: string;
}

interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}

const CreateEditEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'location' | 'registration' | 'program' | 'seo'>('basic');

  // Initialize event with new sh_ structure
  const [event, setEvent] = useState<ShEvent>({
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
    // Legacy fields
    speakers: [],
    festival_program: [],
    hide_speakers_gallery: false
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .trim()
      .substring(0, SLUG_MAX_LENGTH);
  };

  // Load event data for editing
  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && event.title) {
      const newSlug = generateSlug(event.title);
      setEvent(prev => ({ ...prev, slug: newSlug }));
    }
  }, [event.title, slugManuallyEdited]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      console.log('Loading event with ID:', id);
      
      // Try to load from new sh_events table first
      let { data, error } = await supabase
        .from('sh_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      console.log('sh_events query result:', { data, error });
      
      if (data) {
        console.log('Loaded from sh_events:', data);
        setEvent({
          ...data,
          tags: Array.isArray(data.tags) ? data.tags : [],
          gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : [],
          meta_keywords: Array.isArray(data.meta_keywords) ? data.meta_keywords : [],
        });
      } else if (error && error.code === 'PGRST116') {
        console.log('Event not found in sh_events, trying old events table...');
        
        // Fallback to old events table
        const { data: oldData, error: oldError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (oldError) {
          throw oldError;
        }

        if (oldData) {
          console.log('Loaded from old events table:', oldData);
          // Convert old event structure to new structure
          const convertedEvent = convertOldEventToNew(oldData);
          setEvent(convertedEvent);
        }
      } else if (error) {
        throw error;
      }

      setSlugManuallyEdited(true);
    } catch (err: any) {
      console.error('Error loading event:', err);
      toast.error(`Ошибка загрузки мероприятия: ${err.message}`);
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  // Convert old event format to new format
  const convertOldEventToNew = (oldEvent: any): ShEvent => {
    return {
      id: oldEvent.id,
      slug: oldEvent.slug || generateSlug(oldEvent.title || ''),
      title: oldEvent.title || '',
      short_description: oldEvent.description || '',
      description: oldEvent.description || '',
      event_type: oldEvent.event_type || 'lecture',
      status: oldEvent.status || 'draft',
      age_category: oldEvent.age_category || '0+',
      tags: Array.isArray(oldEvent.tags) ? oldEvent.tags : [],
      language_code: oldEvent.language_code || 'sr',
      start_at: oldEvent.start_at || '',
      end_at: oldEvent.end_at || '',
      timezone: 'Europe/Belgrade',
      location_type: oldEvent.location_type || 'physical',
      venue_name: oldEvent.venue_name || oldEvent.location || '',
      venue_address: oldEvent.venue_address || oldEvent.address || '',
      online_meeting_url: oldEvent.online_meeting_url || oldEvent.video_url || '',
      online_platform: oldEvent.online_platform || '',
      cover_image_url: oldEvent.cover_image_url || oldEvent.bg_image || oldEvent.main_image || '',
      gallery_images: Array.isArray(oldEvent.gallery_images) ? oldEvent.gallery_images : 
                      (typeof oldEvent.photo_gallery === 'string' ? oldEvent.photo_gallery.split(',') : []),
      video_url: oldEvent.video_url || '',
      payment_type: oldEvent.payment_type || 'free',
      base_price: Number(oldEvent.base_price || oldEvent.price || 0),
      currency: oldEvent.currency || 'RSD',
      price_description: oldEvent.price_description || oldEvent.price_comment || '',
      registration_required: oldEvent.registration_required !== false,
      registration_enabled: oldEvent.registration_enabled !== false,
      registration_start_at: oldEvent.registration_start_at,
      registration_end_at: oldEvent.registration_end_at || oldEvent.registration_deadline,
      max_attendees: oldEvent.max_attendees || oldEvent.max_registrations,
      attendee_limit_per_registration: oldEvent.attendee_limit_per_registration || oldEvent.registration_limit_per_user || 5,
      meta_title: oldEvent.meta_title || '',
      meta_description: oldEvent.meta_description || '',
      meta_keywords: Array.isArray(oldEvent.meta_keywords) ? oldEvent.meta_keywords : [],
      is_featured: oldEvent.is_featured || false,
      is_public: oldEvent.is_public !== false,
      show_attendees_count: oldEvent.show_attendees_count !== false,
      allow_waitlist: oldEvent.allow_waitlist || false,
      speakers: oldEvent.speakers || [],
      festival_program: oldEvent.festival_program || [],
      hide_speakers_gallery: oldEvent.hide_speakers_gallery || false
    };
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'slug') {
      setSlugManuallyEdited(true);
    }

    setEvent(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? (value === '' ? undefined : Number(value)) : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  // Handle tags change
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setEvent(prev => ({ ...prev, tags }));
  };

  // Handle datetime change
  const handleDateTimeChange = (field: 'start_at' | 'end_at' | 'registration_start_at' | 'registration_end_at', value: string) => {
    const isoDateTime = value ? new Date(value).toISOString() : '';
    setEvent(prev => ({ ...prev, [field]: isoDateTime }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  // Handle media data change from EventMediaSection
  const handleMediaDataChange = (mediaData: {
    cover_image_url?: string;
    gallery_images?: string[];
    video_url?: string;
  }) => {
    console.log('Media data changed:', mediaData);
    
    setEvent(prevEvent => ({
      ...prevEvent,
      cover_image_url: mediaData.cover_image_url || prevEvent.cover_image_url,
      gallery_images: mediaData.gallery_images || prevEvent.gallery_images,
      video_url: mediaData.video_url || prevEvent.video_url
    }));
  };

  // Handle festival program change
  const handleFestivalProgramChange = (newProgram: FestivalProgramItem[]) => {
    setEvent(prev => ({ ...prev, festival_program: newProgram }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!event.title.trim()) newErrors.title = true;
    if (!event.slug.trim()) newErrors.slug = true;
    if (!event.start_at) newErrors.start_at = true;
    if (!event.end_at) newErrors.end_at = true;
    if (event.start_at && event.end_at && new Date(event.start_at) >= new Date(event.end_at)) {
      newErrors.end_at = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save event
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    try {
      setSaving(true);

      // Clean event data
      const cleanEventData = {
        ...event,
        tags: Array.isArray(event.tags) ? event.tags : [],
        gallery_images: Array.isArray(event.gallery_images) ? event.gallery_images : [],
        meta_keywords: Array.isArray(event.meta_keywords) ? event.meta_keywords : [],
        base_price: Number(event.base_price) || 0,
        updated_at: new Date().toISOString(),
        ...(id ? {} : { created_at: new Date().toISOString() })
      };

      let result;
      if (id) {
        // Update existing event
        result = await supabase
          .from('sh_events')
          .update(cleanEventData)
          .eq('id', id)
          .select()
          .single();
      } else {
        // Create new event
        result = await supabase
          .from('sh_events')
          .insert(cleanEventData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(id ? 'Мероприятие обновлено' : 'Мероприятие создано');
      navigate('/admin/events');

    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!id) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('sh_events')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('Мероприятие удалено');
      navigate('/admin/events');

    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error(`Ошибка удаления: ${error.message}`);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Назад к мероприятиям
            </button>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {id ? 'Редактировать мероприятие' : 'Создать мероприятие'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {id && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white dark:bg-dark-800 rounded-lg p-1 shadow-sm">
          {[
            { key: 'basic', label: 'Основное' },
            { key: 'details', label: 'Детали' },
            { key: 'location', label: 'Место' },
            { key: 'registration', label: 'Регистрация' },
            { key: 'program', label: 'Программа' },
            { key: 'seo', label: 'SEO' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Дата и время
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата и время начала *
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateTimeForInput(event.start_at)}
                    onChange={(e) => handleDateTimeChange('start_at', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                      errors.start_at ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                    }`}
                  />
                  {errors.start_at && (
                    <p className="text-sm text-red-600 mt-1">Дата начала обязательна</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата и время окончания *
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateTimeForInput(event.end_at)}
                    onChange={(e) => handleDateTimeChange('end_at', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                      errors.end_at ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                    }`}
                  />
                  {errors.end_at && (
                    <p className="text-sm text-red-600 mt-1">Дата окончания обязательна и должна быть после начала</p>
                  )}
                </div>

                {/* Age Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Возрастная категория
                  </label>
                  <select
                    name="age_category"
                    value={event.age_category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    {ageCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Язык мероприятия
                  </label>
                  <select
                    name="language_code"
                    value={event.language_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="sr">Сербский</option>
                    <option value="ru">Русский</option>
                    <option value="en">Английский</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Оплата
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип оплаты
                  </label>
                  <select
                    name="payment_type"
                    value={event.payment_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    {paymentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                {event.payment_type === 'paid' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Цена
                      </label>
                      <div className="flex">
                        <input
                          type="number"
                          name="base_price"
                          value={event.base_price || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="0"
                        />
                        <select
                          name="currency"
                          value={event.currency}
                          onChange={handleInputChange}
                          className="px-3 py-2 border border-l-0 border-gray-300 dark:border-dark-600 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        >
                          <option value="RSD">RSD</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Описание цены
                      </label>
                      <input
                        type="text"
                        name="price_description"
                        value={event.price_description}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        placeholder="Например: Включает кофе-брейк"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Настройки видимости
              </h3>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={event.is_public}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Публичное мероприятие (видно всем посетителям)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={event.is_featured}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Рекомендованное мероприятие (показывать в топе)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="show_attendees_count"
                    checked={event.show_attendees_count}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Показывать количество участников
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Место проведения
              </h3>

              <div className="space-y-6">
                {/* Location Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип места проведения
                  </label>
                  <select
                    name="location_type"
                    value={event.location_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    {locationTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Physical Location */}
                {(event.location_type === 'physical' || event.location_type === 'hybrid') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Название места
                      </label>
                      <input
                        type="text"
                        name="venue_name"
                        value={event.venue_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        placeholder="Например: Конференц-зал отеля Москва"
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
                        placeholder="Полный адрес места проведения"
                      />
                    </div>
                  </div>
                )}

                {/* Online Location */}
                {(event.location_type === 'online' || event.location_type === 'hybrid') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ссылка на онлайн-трансляцию
                      </label>
                      <input
                        type="url"
                        name="online_meeting_url"
                        value={event.online_meeting_url}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        placeholder="https://zoom.us/j/..."
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
                        placeholder="Zoom, Teams, YouTube и т.д."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Registration Tab */}
        {activeTab === 'registration' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Настройки регистрации
              </h3>

              <div className="space-y-6">
                {/* Registration Toggle */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="registration_required"
                    checked={event.registration_required}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Требуется регистрация для участия
                  </span>
                </label>

                {event.registration_required && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="registration_enabled"
                        checked={event.registration_enabled}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Регистрация открыта
                      </span>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Registration Start */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Начало регистрации
                        </label>
                        <input
                          type="datetime-local"
                          value={formatDateTimeForInput(event.registration_start_at)}
                          onChange={(e) => handleDateTimeChange('registration_start_at', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                      </div>

                      {/* Registration End */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Окончание регистрации
                        </label>
                        <input
                          type="datetime-local"
                          value={formatDateTimeForInput(event.registration_end_at)}
                          onChange={(e) => handleDateTimeChange('registration_end_at', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                      </div>

                      {/* Max Attendees */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Максимальное количество участников
                        </label>
                        <input
                          type="number"
                          name="max_attendees"
                          value={event.max_attendees || ''}
                          onChange={handleInputChange}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                          placeholder="Оставьте пустым для неограниченного"
                        />
                      </div>

                      {/* Limit Per Registration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Максимум мест на одну регистрацию
                        </label>
                        <input
                          type="number"
                          name="attendee_limit_per_registration"
                          value={event.attendee_limit_per_registration}
                          onChange={handleInputChange}
                          min="1"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="allow_waitlist"
                        checked={event.allow_waitlist}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Разрешить лист ожидания при превышении лимита
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Program Tab */}
        {activeTab === 'program' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Программа мероприятия
              </h3>

              {event.event_type === 'festival' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Программа фестиваля с расписанием по времени
                  </p>

                  {event.festival_program && event.festival_program.length > 0 && (
                    <div className="space-y-4">
                      {event.festival_program.map((item, index) => (
                        <div key={index} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const newProgram = [...(event.festival_program || [])];
                                newProgram[index] = { ...item, title: e.target.value };
                                handleFestivalProgramChange(newProgram);
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                              placeholder="Название пункта программы"
                            />
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={item.start_time}
                                onChange={(e) => {
                                  const newProgram = [...(event.festival_program || [])];
                                  newProgram[index] = { ...item, start_time: e.target.value };
                                  handleFestivalProgramChange(newProgram);
                                }}
                                className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                              />
                              <input
                                type="time"
                                value={item.end_time}
                                onChange={(e) => {
                                  const newProgram = [...(event.festival_program || [])];
                                  newProgram[index] = { ...item, end_time: e.target.value };
                                  handleFestivalProgramChange(newProgram);
                                }}
                                className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newProgram = event.festival_program?.filter((_, i) => i !== index) || [];
                                  handleFestivalProgramChange(newProgram);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={item.description}
                            onChange={(e) => {
                              const newProgram = [...(event.festival_program || [])];
                              newProgram[index] = { ...item, description: e.target.value };
                              handleFestivalProgramChange(newProgram);
                            }}
                            rows={2}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                            placeholder="Описание пункта программы"
                          />
                        </div>
                      ))}
                    </div>
                  )}

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
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <Plus className="h-5 w-5" />
                    Добавить пункт программы
                  </button>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">О программе фестиваля:</p>
                        <p>
                          Программа сохраняется в новой структуре БД (sh_event_schedule). 
                          В будущих версиях будет добавлен полноценный редактор с поддержкой изображений и расширенных настроек.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Программа доступна только для мероприятий типа "Фестиваль"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                SEO настройки
              </h3>

              <div className="space-y-6">
                {/* Meta Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO заголовок
                  </label>
                  <input
                    type="text"
                    name="meta_title"
                    value={event.meta_title}
                    onChange={handleInputChange}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Оставьте пустым для автогенерации из названия"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {event.meta_title.length}/60 (рекомендуется до 60 символов)
                  </p>
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO описание
                  </label>
                  <textarea
                    name="meta_description"
                    value={event.meta_description}
                    onChange={handleInputChange}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Оставьте пустым для автогенерации из краткого описания"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {event.meta_description.length}/160 (рекомендуется до 160 символов)
                  </p>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ключевые слова
                  </label>
                  <input
                    type="text"
                    value={event.meta_keywords.join(', ')}
                    onChange={(e) => {
                      const keywords = e.target.value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
                      setEvent(prev => ({ ...prev, meta_keywords: keywords }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="ключевое слово, еще одно, третье (через запятую)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Разделяйте ключевые слова запятыми. Автоматически добавляются из тегов.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Предпросмотр в поиске</h4>
                  <div className="space-y-1">
                    <div className="text-blue-600 dark:text-blue-400 text-lg font-medium line-clamp-1">
                      {event.meta_title || event.title || 'Название мероприятия'}
                    </div>
                    <div className="text-green-600 dark:text-green-400 text-sm">
                      yoursite.com/events/{event.slug || 'event-url'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {event.meta_description || event.short_description || 'Описание мероприятия появится здесь...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Подтвердите удаление
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {saving ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEditEventPage; 
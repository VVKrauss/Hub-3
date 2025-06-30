import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Globe, 
  Tag, 
  DollarSign, 
  Link, 
  Info, 
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
  Video,
  Camera,
  Globe2,
  Building2,
  Monitor,
  Hash,
  Eye
} from 'lucide-react';
import { parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
// Import existing components (will need to be adapted)
// import EventSpeakersSection from '../../components/admin/EventSpeakersSection';
// import EventFestivalProgramSection from '../../components/admin/EventFestivalProgramSection';

// Updated types for sh_ system
type ShEventType = 'lecture' | 'workshop' | 'festival' | 'conference' | 'seminar' | 'other';
type ShEventStatus = 'draft' | 'active' | 'past' | 'cancelled';
type ShAgeCategory = '0+' | '6+' | '12+' | '16+' | '18+';
type ShPaymentType = 'free' | 'paid' | 'donation';
type LocationType = 'physical' | 'online' | 'hybrid';

// Updated constants for new system
const eventTypes = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'workshop', label: 'Мастер-класс' },
  { value: 'festival', label: 'Фестиваль' },
  { value: 'conference', label: 'Конференция' },
  { value: 'seminar', label: 'Семинар' },
  { value: 'other', label: 'Другое' }
];

const eventStatuses = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активное' },
  { value: 'past', label: 'Завершенное' },
  { value: 'cancelled', label: 'Отмененное' }
];

const ageCategories = [
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' }
];

const paymentTypes = [
  { value: 'free', label: 'Бесплатно' },
  { value: 'paid', label: 'Платно' },
  { value: 'donation', label: 'Донейшн' }
];

const locationTypes = [
  { value: 'physical', label: 'Очно', icon: Building2 },
  { value: 'online', label: 'Онлайн', icon: Monitor },
  { value: 'hybrid', label: 'Гибрид', icon: Globe2 }
];

const languages = [
  { value: 'sr', label: 'Српски' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' }
];

const currencies = [
  { value: 'RSD', label: 'RSD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' }
];

// Length constants
const TITLE_MAX_LENGTH = 200;
const SHORT_DESC_MAX_LENGTH = 300;
const DESC_MAX_LENGTH = 5000;
const SLUG_MAX_LENGTH = 100;

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Updated interface for sh_events
interface ShEvent {
  id?: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  event_type: ShEventType;
  status: ShEventStatus;
  age_category: ShAgeCategory;
  tags: string[];
  language_code: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: LocationType;
  venue_name: string;
  venue_address: string;
  venue_coordinates?: any;
  online_meeting_url: string;
  online_platform: string;
  cover_image_url: string;
  gallery_images: string[];
  video_url: string;
  payment_type: ShPaymentType;
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
  // Legacy fields for backward compatibility - will be migrated to separate tables
  speakers?: string[];
  festival_program?: FestivalProgramItem[]; // Keep for now, will save to sh_event_schedule
  hide_speakers_gallery?: boolean;
  photo_gallery?: string;
}

// Festival program item type (compatible with existing EventFestivalProgramSection)
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
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
      
      // Try to load from new sh_events table first
      let { data, error } = await supabase
        .from('sh_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') {
        // If not found in sh_events, try old events table for migration
        const { data: oldData, error: oldError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (oldError) {
          throw oldError;
        }

        // Convert old event to new format
        data = convertOldEventToNew(oldData);
      } else if (error) {
        throw error;
      }

      if (data) {
        // Load additional data for new system
        const [scheduleData, speakersData] = await Promise.all([
          loadEventSchedule(data.id),
          loadEventSpeakers(data.id)
        ]);

        setEvent({
          ...data,
          tags: data.tags || [],
          gallery_images: data.gallery_images || [],
          meta_keywords: data.meta_keywords || [],
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          speakers: speakersData,
          festival_program: scheduleData
        });
        setSlugManuallyEdited(true); // Assume existing events have custom slugs
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Ошибка при загрузке мероприятия');
    } finally {
      setLoading(false);
    }
  };

  // Load event schedule (festival program)
  const loadEventSchedule = async (eventId: string): Promise<FestivalProgramItem[]> => {
    try {
      const { data, error } = await supabase
        .from('sh_event_schedule')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Convert schedule items to festival program format
      return (data || []).map(item => ({
        title: item.title,
        description: item.description || '',
        image_url: '', // Schedule doesn't have images yet
        start_time: item.start_time,
        end_time: item.end_time,
        lecturer_id: item.speaker_id || ''
      }));
    } catch (error) {
      console.warn('Error loading event schedule:', error);
      return [];
    }
  };

  // Load event speakers
  const loadEventSpeakers = async (eventId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('sh_event_speakers')
        .select('speaker_id')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => item.speaker_id);
    } catch (error) {
      console.warn('Error loading event speakers:', error);
      return [];
    }
  };

  // Convert old event format to new sh_ format
  const convertOldEventToNew = (oldEvent: any): ShEvent => {
    return {
      id: oldEvent.id,
      slug: oldEvent.slug || generateSlug(oldEvent.title || ''),
      title: oldEvent.title || '',
      short_description: oldEvent.short_description || '',
      description: oldEvent.description || '',
      event_type: oldEvent.event_type || 'lecture',
      status: oldEvent.status || 'draft',
      age_category: oldEvent.age_category || '0+',
      tags: oldEvent.tags || [],
      language_code: Array.isArray(oldEvent.languages) ? oldEvent.languages[0] || 'sr' : 'sr',
      start_at: oldEvent.start_at || '',
      end_at: oldEvent.end_at || '',
      timezone: 'Europe/Belgrade',
      location_type: oldEvent.location ? 'physical' : 'online',
      venue_name: oldEvent.location || '',
      venue_address: oldEvent.location || '',
      online_meeting_url: oldEvent.video_url || '',
      online_platform: '',
      cover_image_url: oldEvent.bg_image || '',
      gallery_images: typeof oldEvent.photo_gallery === 'string' ? 
        oldEvent.photo_gallery.split(',').filter(Boolean) : [],
      video_url: oldEvent.video_url || '',
      payment_type: oldEvent.payment_type === 'free' ? 'free' : 'paid',
      base_price: Number(oldEvent.price) || 0,
      currency: oldEvent.currency || 'RSD',
      price_description: oldEvent.price_comment || '',
      registration_required: oldEvent.registration_enabled !== false,
      registration_enabled: oldEvent.registration_enabled !== false,
      registration_end_at: oldEvent.registration_deadline || undefined,
      max_attendees: oldEvent.max_registrations || undefined,
      attendee_limit_per_registration: oldEvent.registration_limit_per_user || 5,
      meta_title: oldEvent.title || '',
      meta_description: oldEvent.short_description || '',
      meta_keywords: [],
      is_featured: false,
      is_public: true,
      show_attendees_count: true,
      allow_waitlist: false,
      speakers: oldEvent.speakers || [],
      festival_program: oldEvent.festival_program || [],
      hide_speakers_gallery: oldEvent.hide_speakers_gallery || false
    };
  };

  // Load speakers list
  useEffect(() => {
    loadSpeakers();
  }, []);

  const loadSpeakers = async () => {
    try {
      // Try new sh_speakers table first
      let { data, error } = await supabase
        .from('sh_speakers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error && error.code === 'PGRST116') {
        // Fallback to old speakers table
        const { data: oldData, error: oldError } = await supabase
          .from('speakers')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (!oldError) {
          data = oldData;
        }
      }

      setSpeakers(data || []);
    } catch (error) {
      console.error('Error loading speakers:', error);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!event.title.trim()) newErrors.title = true;
    if (!event.slug.trim()) newErrors.slug = true;
    if (!event.start_at) newErrors.start_at = true;
    if (!event.end_at) newErrors.end_at = true;
    
    if (event.location_type === 'physical' && !event.venue_name.trim()) {
      newErrors.venue_name = true;
    }
    
    if (event.location_type === 'online' && !event.online_meeting_url.trim()) {
      newErrors.online_meeting_url = true;
    }

    if (event.payment_type === 'paid' && (!event.base_price || event.base_price <= 0)) {
      newErrors.base_price = true;
    }

    if (new Date(event.start_at) >= new Date(event.end_at)) {
      newErrors.start_at = true;
      newErrors.end_at = true;
      toast.error('Время начала должно быть раньше времени окончания');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'title' && value.length > TITLE_MAX_LENGTH) return;
    if (name === 'short_description' && value.length > SHORT_DESC_MAX_LENGTH) return;
    if (name === 'description' && value.length > DESC_MAX_LENGTH) return;
    if (name === 'slug' && value.length > SLUG_MAX_LENGTH) return;
    
    setEvent(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'slug') {
      setSlugManuallyEdited(true);
    }
    
    if (name === 'title' && !event.meta_title) {
      setEvent(prev => ({
        ...prev,
        meta_title: value
      }));
    }
    
    if (name === 'short_description' && !event.meta_description) {
      setEvent(prev => ({
        ...prev,
        meta_description: value
      }));
    }
    
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleDateTimeChange = (field: 'start_at' | 'end_at', value: string) => {
    if (!value) return;
    
    const timestamp = new Date(value).toISOString();
    
    setEvent(prev => ({
      ...prev,
      [field]: timestamp
    }));
    
    setErrors(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEvent(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setEvent(prev => ({
      ...prev,
      tags
    }));
  };

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keywords = e.target.value.split(',').map(keyword => keyword.trim()).filter(Boolean);
    setEvent(prev => ({
      ...prev,
      meta_keywords: keywords
    }));
  };

  // Festival program handlers
  const handleFestivalProgramChange = (program: FestivalProgramItem[]) => {
    setEvent(prev => ({
      ...prev,
      festival_program: program
    }));
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setEvent(prev => {
      const speakers = [...(prev.speakers || [])];
      
      if (speakers.includes(speakerId)) {
        return {
          ...prev,
          speakers: speakers.filter(id => id !== speakerId)
        };
      } else {
        return {
          ...prev,
          speakers: [...speakers, speakerId]
        };
      }
    });
  };

  // Save event
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      setSaving(true);
      
      // Check if slug is unique
      if (!id || slugManuallyEdited) {
        const { data: existingEvent } = await supabase
          .from('sh_events')
          .select('id')
          .eq('slug', event.slug)
          .neq('id', id || '')
          .single();

        if (existingEvent) {
          setErrors(prev => ({ ...prev, slug: true }));
          toast.error('Slug уже используется, выберите другой');
          return;
        }
      }

      // Prepare event data - exclude legacy fields that don't exist in sh_events
      const {
        speakers,
        festival_program,
        hide_speakers_gallery,
        photo_gallery,
        ...cleanEventData
      } = event;

      const eventData = {
        ...cleanEventData,
        updated_at: new Date().toISOString(),
        ...(id ? {} : { created_at: new Date().toISOString() })
      };

      let savedEventId = id;

      if (id) {
        const { error } = await supabase
          .from('sh_events')
          .update(eventData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data: newEvent, error } = await supabase
          .from('sh_events')
          .insert([eventData])
          .select('id')
          .single();

        if (error) throw error;
        savedEventId = newEvent.id;
      }

      // Save festival program to sh_event_schedule if it exists
      if (festival_program && festival_program.length > 0 && savedEventId) {
        await saveFestivalProgramToSchedule(savedEventId, festival_program);
      }

      // Save speakers to sh_event_speakers if they exist
      if (speakers && speakers.length > 0 && savedEventId) {
        await saveEventSpeakers(savedEventId, speakers);
      }
      
      toast.success(id ? 'Мероприятие обновлено' : 'Мероприятие создано');
      navigate('/admin/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`Ошибка при сохранении мероприятия: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to save festival program to sh_event_schedule
  const saveFestivalProgramToSchedule = async (eventId: string, program: FestivalProgramItem[]) => {
    try {
      // First, delete existing schedule items for this event
      await supabase
        .from('sh_event_schedule')
        .delete()
        .eq('event_id', eventId);

      // Convert festival program items to schedule format
      const scheduleItems = program.map((item, index) => ({
        event_id: eventId,
        title: item.title,
        description: item.description || null,
        start_time: item.start_time,
        end_time: item.end_time,
        date: new Date(event.start_at).toISOString().split('T')[0], // Use event date
        speaker_id: item.lecturer_id || null,
        display_order: index,
        created_at: new Date().toISOString()
      }));

      // Insert new schedule items
      if (scheduleItems.length > 0) {
        const { error } = await supabase
          .from('sh_event_schedule')
          .insert(scheduleItems);

        if (error) {
          console.warn('Failed to save festival program to schedule:', error);
          // Don't throw error, just log it as this is not critical
        }
      }
    } catch (error) {
      console.warn('Error saving festival program:', error);
    }
  };

  // Helper function to save event speakers
  const saveEventSpeakers = async (eventId: string, speakerIds: string[]) => {
    try {
      // First, delete existing speakers for this event
      await supabase
        .from('sh_event_speakers')
        .delete()
        .eq('event_id', eventId);

      // Insert new speakers
      const eventSpeakers = speakerIds.map((speakerId, index) => ({
        event_id: eventId,
        speaker_id: speakerId,
        role: 'speaker',
        display_order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (eventSpeakers.length > 0) {
        const { error } = await supabase
          .from('sh_event_speakers')
          .insert(eventSpeakers);

        if (error) {
          console.warn('Failed to save event speakers:', error);
        }
      }
    } catch (error) {
      console.warn('Error saving event speakers:', error);
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
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
  };

  // Format datetime for input
  const formatDateTimeForInput = (isoString: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Основное', icon: Info },
    { id: 'details', label: 'Детали', icon: Calendar },
    { id: 'location', label: 'Место', icon: MapPin },
    { id: 'registration', label: 'Регистрация', icon: Users },
    ...(event.event_type === 'festival' ? [{ id: 'program', label: 'Программа', icon: Clock }] : []),
    { id: 'seo', label: 'SEO', icon: Globe }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Редактирование мероприятия' : 'Создание мероприятия'}
        </h1>
        
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
            disabled={saving}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Основная информация
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название мероприятия *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={event.title}
                    onChange={handleInputChange}
                    maxLength={TITLE_MAX_LENGTH}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                      errors.title ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                    }`}
                    placeholder="Введите название мероприятия"
                  />
                  <div className="flex justify-between mt-1">
                    {errors.title && (
                      <p className="text-sm text-red-600">Название обязательно для заполнения</p>
                    )}
                    <p className="text-sm text-gray-500 ml-auto">
                      {event.title.length}/{TITLE_MAX_LENGTH}
                    </p>
                  </div>
                </div>

                {/* Slug */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL адрес (slug) *
                  </label>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">/events/</span>
                    <input
                      type="text"
                      name="slug"
                      value={event.slug}
                      onChange={handleInputChange}
                      maxLength={SLUG_MAX_LENGTH}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                        errors.slug ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                      }`}
                      placeholder="url-адрес-мероприятия"
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-sm text-red-600 mt-1">URL адрес обязателен и должен быть уникальным</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    URL будет: yoursite.com/events/{event.slug}
                  </p>
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип мероприятия *
                  </label>
                  <select
                    name="event_type"
                    value={event.event_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Статус *
                  </label>
                  <select
                    name="status"
                    value={event.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    {eventStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
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
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Short Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Краткое описание
                  </label>
                  <textarea
                    name="short_description"
                    value={event.short_description}
                    onChange={handleInputChange}
                    maxLength={SHORT_DESC_MAX_LENGTH}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Краткое описание для анонса и поиска"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {event.short_description.length}/{SHORT_DESC_MAX_LENGTH}
                  </p>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Полное описание
                  </label>
                  <textarea
                    name="description"
                    value={event.description}
                    onChange={handleInputChange}
                    maxLength={DESC_MAX_LENGTH}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Полное описание мероприятия"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {event.description.length}/{DESC_MAX_LENGTH}
                  </p>
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Теги
                  </label>
                  <input
                    type="text"
                    value={event.tags.join(', ')}
                    onChange={handleTagsChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="наука, образование, инновации (через запятую)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Теги помогают в поиске и категоризации мероприятий
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
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
                    <p className="text-sm text-red-600 mt-1">Дата окончания обязательна</p>
                  )}
                </div>

                {/* Timezone */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Часовой пояс
                  </label>
                  <select
                    name="timezone"
                    value={event.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  >
                    <option value="Europe/Belgrade">Europe/Belgrade (UTC+1/+2)</option>
                    <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                    <option value="UTC">UTC (UTC+0)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media Section */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Медиа файлы
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cover Image */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Обложка мероприятия
                  </label>
                  <input
                    type="url"
                    name="cover_image_url"
                    value={event.cover_image_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                  {event.cover_image_url && (
                    <div className="mt-2">
                      <img
                        src={event.cover_image_url}
                        alt="Превью обложки"
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Video URL */}
                <div className="md:col-span-2">
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
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Стоимость участия
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип оплаты *
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

                {/* Base Price */}
                {event.payment_type === 'paid' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Цена *
                      </label>
                      <input
                        type="number"
                        name="base_price"
                        value={event.base_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                          errors.base_price ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.base_price && (
                        <p className="text-sm text-red-600 mt-1">Цена обязательна для платных мероприятий</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Валюта
                      </label>
                      <select
                        name="currency"
                        value={event.currency}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      >
                        {currencies.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Price Description */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание стоимости
                  </label>
                  <textarea
                    name="price_description"
                    value={event.price_description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Дополнительная информация о стоимости, скидках и т.д."
                  />
                </div>
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
              
              {/* Location Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Тип проведения *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {locationTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setEvent(prev => ({ ...prev, location_type: type.value as LocationType }))}
                        className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                          event.location_type === type.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                        }`}
                      >
                        <Icon className="h-8 w-8" />
                        <span className="font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical Location Fields */}
              {(event.location_type === 'physical' || event.location_type === 'hybrid') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Название места *
                    </label>
                    <input
                      type="text"
                      name="venue_name"
                      value={event.venue_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                        errors.venue_name ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                      }`}
                      placeholder="Science Hub, Конференц-зал..."
                    />
                    {errors.venue_name && (
                      <p className="text-sm text-red-600 mt-1">Название места обязательно</p>
                    )}
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
                      placeholder="ул. Примерная, 123, Город"
                    />
                  </div>
                </div>
              )}

              {/* Online Location Fields */}
              {(event.location_type === 'online' || event.location_type === 'hybrid') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ссылка на онлайн-трансляцию {event.location_type === 'online' && '*'}
                    </label>
                    <input
                      type="url"
                      name="online_meeting_url"
                      value={event.online_meeting_url}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white ${
                        errors.online_meeting_url ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                      }`}
                      placeholder="https://zoom.us/j/... или https://youtube.com/..."
                    />
                    {errors.online_meeting_url && (
                      <p className="text-sm text-red-600 mt-1">Ссылка обязательна для онлайн мероприятий</p>
                    )}
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
                      placeholder="Zoom, YouTube Live, Teams..."
                    />
                  </div>
                </div>
              )}
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
                {/* Registration Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="registration_required"
                      checked={event.registration_required}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Требуется регистрация
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="registration_enabled"
                      checked={event.registration_enabled}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Регистрация открыта
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="show_attendees_count"
                      checked={event.show_attendees_count}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Показывать количество участников
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="allow_waitlist"
                      checked={event.allow_waitlist}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Разрешить лист ожидания
                    </label>
                  </div>
                </div>

                {/* Registration Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Максимум участников
                    </label>
                    <input
                      type="number"
                      name="max_attendees"
                      value={event.max_attendees || ''}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Без ограничений"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Билетов на одну регистрацию
                    </label>
                    <input
                      type="number"
                      name="attendee_limit_per_registration"
                      value={event.attendee_limit_per_registration}
                      onChange={handleInputChange}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Registration Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Начало регистрации
                    </label>
                    <input
                      type="datetime-local"
                      name="registration_start_at"
                      value={formatDateTimeForInput(event.registration_start_at || '')}
                      onChange={(e) => setEvent(prev => ({ ...prev, registration_start_at: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Окончание регистрации
                    </label>
                    <input
                      type="datetime-local"
                      name="registration_end_at"
                      value={formatDateTimeForInput(event.registration_end_at || '')}
                      onChange={(e) => setEvent(prev => ({ ...prev, registration_end_at: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Видимость мероприятия
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={event.is_public}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Публичное мероприятие
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={event.is_featured}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Рекомендуемое мероприятие
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Program Tab - only for festivals */}
        {activeTab === 'program' && event.event_type === 'festival' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Программа фестиваля
              </h3>
              
              <div className="space-y-4">
                {/* Festival Program Items */}
                {event.festival_program && event.festival_program.length > 0 ? (
                  <div className="space-y-4">
                    {event.festival_program.map((item, index) => {
                      const speaker = speakers.find(s => s.id === item.lecturer_id);
                      
                      return (
                        <div 
                          key={index}
                          className="bg-gray-50 dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{item.start_time} - {item.end_time}</span>
                                </div>
                                {speaker && (
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-1" />
                                    <span>{speaker.name}</span>
                                  </div>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedProgram = [...(event.festival_program || [])];
                                  updatedProgram.splice(index, 1);
                                  handleFestivalProgramChange(updatedProgram);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-dark-700 rounded-xl">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-dark-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Нет пунктов программы
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Добавьте пункты, чтобы создать программу фестиваля
                    </p>
                  </div>
                )}

                {/* Add Program Item Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Simple add - in future can be expanded to modal form
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
                    value={event.meta_title || ''}
                    onChange={handleInputChange}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Заголовок для поисковых систем"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {(event.meta_title || '').length}/60 (рекомендуется до 60 символов)
                  </p>
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SEO описание
                  </label>
                  <textarea
                    name="meta_description"
                    value={event.meta_description || ''}
                    onChange={handleInputChange}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="Описание для поисковых систем"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {(event.meta_description || '').length}/160 (рекомендуется до 160 символов)
                  </p>
                </div>

                {/* Meta Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ключевые слова
                  </label>
                  <input
                    type="text"
                    value={(event.meta_keywords || []).join(', ')}
                    onChange={handleKeywordsChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                    placeholder="наука, образование, лекция (через запятую)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Ключевые слова помогают поисковым системам лучше понимать содержание мероприятия
                  </p>
                </div>

                {/* URL Preview */}
                <div className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-gray-50 dark:bg-dark-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Превью в поисковой выдаче:
                  </h4>
                  <div className="space-y-1">
                    <div className="text-blue-600 dark:text-blue-400 text-sm">
                      yoursite.com/events/{event.slug || 'event-slug'}
                    </div>
                    <div className="text-purple-600 dark:text-purple-400 font-medium">
                      {event.meta_title || event.title || 'Название мероприятия'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {event.meta_description || event.short_description || 'Описание мероприятия появится здесь...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Удалить мероприятие
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Это действие нельзя отменить
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Вы уверены, что хотите удалить мероприятие "{event.title}"? 
              Все данные о регистрациях и участниках также будут удалены.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEditEventPage;
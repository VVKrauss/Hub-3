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
  Camera
} from 'lucide-react';
import { parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  eventTypes, 
  paymentTypes, 
  languages, 
  ageCategories, 
  currencies, 
  statuses, 
  TITLE_MAX_LENGTH, 
  SHORT_DESC_MAX_LENGTH, 
  DESC_MAX_LENGTH 
} from './constants';
import EventSpeakersSection from '../../components/admin/EventSpeakersSection';
import EventFestivalProgramSection from '../../components/admin/EventFestivalProgramSection';
import { 
  formatDateTimeForDatabase,
  formatTimeFromTimestamp,
  BELGRADE_TIMEZONE 
} from '../../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  
  const [event, setEvent] = useState({
    id: '',
    title: '',
    short_description: '',
    description: '',
    event_type: 'Lecture',
    bg_image: '',
    original_bg_image: '',
    start_at: '', // Обновлено с start_time на start_at
    end_at: '',   // Обновлено с end_time на end_at
    location: '',
    age_category: '0+',
    price: '',
    currency: 'RSD',
    status: 'draft',
    payment_type: 'cost',
    payment_link: '',
    payment_widget_id: '',
    widget_chooser: false,
    languages: ['Русский'],
    speakers: [],
    hide_speakers_gallery: true,
    couple_discount: '',
    child_half_price: false,
    festival_program: [],
    video_url: '',
    photo_gallery: []
  });

  const [errors, setErrors] = useState({
    title: false,
    start_at: false,  // Обновлено с start_time на start_at
    end_at: false,    // Обновлено с end_time на end_at
    location: false,
    price: false,
    payment_link: false
  });

  useEffect(() => {
    fetchSpeakers();
    
    if (id) {
      fetchEvent(id);
    } else {
      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setHours(18, 0, 0, 0);
      const defaultEnd = new Date(now);
      defaultEnd.setHours(20, 0, 0, 0);
      
      setEvent(prev => ({
        ...prev,
        id: crypto.randomUUID(),
        start_at: defaultStart.toISOString(), // Обновлено
        end_at: defaultEnd.toISOString()      // Обновлено
      }));
    }
  }, [id]);

  const fetchSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      toast.error('Ошибка при загрузке спикеров');
    }
  };

  const fetchEvent = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      let photoGallery = data.photo_gallery || [];
      if (typeof photoGallery === 'string') {
        try {
          photoGallery = JSON.parse(photoGallery);
        } catch (e) {
          console.error('Error parsing photo_gallery:', e);
          photoGallery = [];
        }
      }
      if (!Array.isArray(photoGallery)) {
        photoGallery = [];
      }

      // Обновленная логика для работы с новыми полями start_at/end_at
      let startAt = data.start_at || '';
      let endAt = data.end_at || '';

      // Fallback для legacy данных
      if (!startAt && data.start_time) {
        startAt = data.start_time;
      }
      if (!endAt && data.end_time) {
        endAt = data.end_time;
      }
      
      // Дополнительный fallback для очень старых данных
      if (!startAt && data.date && data.start_time) {
        startAt = formatDateTimeForDatabase(parseISO(data.date), data.start_time);
      }
      if (!endAt && data.date && data.end_time) {
        endAt = formatDateTimeForDatabase(parseISO(data.date), data.end_time);
      }

      setEvent({
        ...data,
        price: data.price !== null ? String(data.price) : '',
        couple_discount: data.couple_discount || '',
        languages: data.languages || ['Русский'],
        speakers: data.speakers || [],
        hide_speakers_gallery: data.hide_speakers_gallery !== false,
        festival_program: data.festival_program || [],
        video_url: data.video_url || '',
        photo_gallery: photoGallery,
        start_at: startAt, // Обновлено
        end_at: endAt     // Обновлено
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Ошибка при загрузке мероприятия');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {
      title: !event.title.trim(),
      start_at: !event.start_at,  // Обновлено
      end_at: !event.end_at,      // Обновлено
      location: !event.location.trim(),
      price: false,
      payment_link: false
    };

    if (event.start_at && event.end_at) {
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      
      if (endDate <= startDate) {
        newErrors.end_at = true;
        toast.error('Время окончания должно быть позже времени начала');
      }
    }

    if (event.status === 'active' && event.payment_type === 'cost') {
      if (!event.price && !event.payment_link) {
        newErrors.price = true;
        newErrors.payment_link = true;
        toast.error('Для активных мероприятий необходимо указать либо цену, либо ссылку на оплату');
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'title' && value.length > TITLE_MAX_LENGTH) return;
    if (name === 'short_description' && value.length > SHORT_DESC_MAX_LENGTH) return;
    if (name === 'description' && value.length > DESC_MAX_LENGTH) return;
    
    setEvent(prev => ({
      ...prev,
      [name]: value
    }));
    
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setEvent(prev => ({
        ...prev,
        languages: [...prev.languages, value]
      }));
    } else {
      setEvent(prev => ({
        ...prev,
        languages: prev.languages.filter(lang => lang !== value)
      }));
    }
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setEvent(prev => {
      const speakers = [...prev.speakers];
      
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

  const handleHideSpeakersGalleryChange = (hide: boolean) => {
    setEvent(prev => ({
      ...prev,
      hide_speakers_gallery: hide
    }));
  };

  const handleFestivalProgramChange = (program: any[]) => {
    setEvent(prev => ({
      ...prev,
      festival_program: program
    }));
  };

  const handlePhotoGalleryChange = (photos: string[]) => {
    setEvent(prev => ({
      ...prev,
      photo_gallery: Array.isArray(photos) ? photos : []
    }));
  };

  const formatDateTimeForInput = (timestamp: string): string => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      console.error('Error formatting datetime for input:', e);
      return '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `events/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (error) throw error;
      
      setEvent(prev => ({
        ...prev,
        bg_image: filePath,
        original_bg_image: prev.bg_image || null
      }));
      
      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    try {
      setSaving(true);
      
      const eventData = {
        ...event,
        price: event.price ? parseFloat(event.price) : null,
        couple_discount: event.couple_discount ? parseFloat(event.couple_discount) : null,
        photo_gallery: Array.isArray(event.photo_gallery) ? event.photo_gallery : [],
        // Удаляем legacy поля
        date: undefined,
        start_time: undefined,
        end_time: undefined
      };
      
      Object.keys(eventData).forEach(key => {
        if (eventData[key] === undefined) {
          delete eventData[key];
        }
      });
      
      const isNew = !id;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            eventData,
            isNew
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.code === 'PG_NET_EXTENSION_MISSING') {
          console.warn('Database notification extension (pg_net) is not enabled. Notifications will not be sent.');
        } else {
          throw new Error(result.error || 'Error saving event');
        }
      }
      
      toast.success(isNew ? 'Мероприятие создано' : 'Мероприятие обновлено');
      navigate('/admin/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`Ошибка при сохранении мероприятия: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            eventData: { id },
            action: 'delete'
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error deleting event');
      }
      
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
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-600" />
          Статус мероприятия
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statuses.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, status }))}
              className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                event.status === status
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
              }`}
            >
              <div className="font-semibold text-lg mb-1">
                {status === 'active' ? '🟢 Активное' : 
                 status === 'draft' ? '📝 Черновик' : 
                 '⏹️ Прошедшее'}
              </div>
              <div className="text-sm opacity-75">
                {status === 'active' ? 'Видно пользователям' : 
                 status === 'draft' ? 'Скрыто от пользователей' : 
                 'Архивное событие'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary-600" />
            Основная информация
          </h2>
          
          <div className="space-y-6">
            <div className="form-group">
              <label htmlFor="title" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Название мероприятия <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={event.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.title 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="Введите название мероприятия"
              />
              <div className="flex justify-between mt-2">
                {errors.title && (
                  <p className="text-red-500 text-sm">Обязательное поле</p>
                )}
                <p className="text-gray-500 text-sm text-right ml-auto">
                  {event.title.length}/{TITLE_MAX_LENGTH}
                </p>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="short_description" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Краткое описание
              </label>
              <input
                type="text"
                id="short_description"
                name="short_description"
                value={event.short_description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                placeholder="Краткое описание для списка мероприятий"
              />
              <p className="text-gray-500 text-sm text-right mt-2">
                {event.short_description.length}/{SHORT_DESC_MAX_LENGTH}
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="description" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Полное описание
              </label>
              <textarea
                id="description"
                name="description"
                value={event.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors resize-vertical"
                placeholder="Подробное описание мероприятия"
              />
              <p className="text-gray-500 text-sm text-right mt-2">
                {event.description.length}/{DESC_MAX_LENGTH}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="event_type" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Тип мероприятия
                </label>
                <select
                  id="event_type"
                  name="event_type"
                  value={event.event_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="age_category" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Возрастная категория
                </label>
                <select
                  id="age_category"
                  name="age_category"
                  value={event.age_category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                >
                  {ageCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                Языки
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {languages.map(lang => (
                  <label key={lang} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      value={lang}
                      checked={event.languages.includes(lang)}
                      onChange={handleLanguageChange}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

<div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Дата и время проведения
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="start_at" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Дата и время начала <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="start_at"
                  name="start_at"
                  value={formatDateTimeForInput(event.start_at)}
                  onChange={(e) => handleDateTimeChange('start_at', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    errors.start_at 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                  } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                />
                {errors.start_at && (
                  <p className="text-red-500 text-sm mt-2">Обязательное поле</p>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="end_at" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Дата и время окончания <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="end_at"
                  name="end_at"
                  value={formatDateTimeForInput(event.end_at)}
                  onChange={(e) => handleDateTimeChange('end_at', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    errors.end_at 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                  } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                />
                {errors.end_at && (
                  <p className="text-red-500 text-sm mt-2">
                    {errors.end_at === true ? 'Время окончания должно быть позже времени начала' : 'Обязательное поле'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="location" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Место проведения <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={event.location}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.location 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="Адрес или название места"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-2">Обязательное поле</p>
              )}
            </div>
          </div>
        </div>


        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary-600" />
            Медиа контент
          </h2>
          
          <div className="space-y-6">
            <div className="form-group">
              <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                Главное изображение мероприятия
              </label>
              
              {event.bg_image ? (
                <div className="relative">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image}`}
                    alt="Event preview"
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/800x400?text=Image+not+found';
                    }}
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg transition-colors"
                      title="Изменить изображение"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvent(prev => ({ ...prev, bg_image: '' }))}
                      className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                      title="Удалить изображение"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    <div className="mb-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
                      <ImageIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Загрузка... {uploadProgress}%</span>
                        </div>
                      ) : (
                        <span>Загрузить изображение</span>
                      )}
                    </button>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Рекомендуемый размер: 1200x600px
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="video_url" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Video className="h-5 w-5 inline mr-2" />
                Ссылка на видео
              </label>
              <input
                type="url"
                id="video_url"
                name="video_url"
                value={event.video_url}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div className="form-group">
              <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Camera className="h-5 w-5 inline mr-2" />
                Галерея фотографий
              </label>
              
              <div className="space-y-2">
                {Array.isArray(event.photo_gallery) && event.photo_gallery
                  .filter(photo => typeof photo === 'string' && photo.trim() !== '')
                  .map((photo, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                      <input
                        type="url"
                        value={photo}
                        onChange={(e) => {
                          const newGallery = [...event.photo_gallery];
                          newGallery[index] = e.target.value;
                          setEvent(prev => ({
                            ...prev,
                            photo_gallery: newGallery
                          }));
                        }}
                        className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                        placeholder="URL фотографии"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newGallery = event.photo_gallery.filter((_, i) => i !== index);
                          setEvent(prev => ({
                            ...prev,
                            photo_gallery: newGallery
                          }));
                        }}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Удалить фотографию"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                }
                
                <button
                  type="button"
                  onClick={() => {
                    setEvent(prev => ({
                      ...prev,
                      photo_gallery: [...(Array.isArray(prev.photo_gallery) ? prev.photo_gallery : []), '']
                    }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full"
                >
                  <Plus className="h-4 w-4" />
                  Добавить фотографию
                </button>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Вставьте прямую ссылку на изображение (например, из облачного хранилища)
                </p>
                
                {Array.isArray(event.photo_gallery) && event.photo_gallery.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {event.photo_gallery
                      .filter(photo => typeof photo === 'string' && photo.trim() !== '')
                      .map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/300x200?text=Image+not+found';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                const newGallery = event.photo_gallery.filter((_, i) => i !== index);
                                setEvent(prev => ({
                                  ...prev,
                                  photo_gallery: newGallery
                                }));
                              }}
                              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            Информация об оплате
          </h2>
          
          <div className="space-y-6">
            <div className="form-group">
              <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                Тип оплаты
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEvent(prev => ({ ...prev, payment_type: type }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      event.payment_type === type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">
                      {type === 'cost' ? '💰 Платное' : 
                       type === 'free' ? '🆓 Бесплатное' : 
                       '💝 Донейшн'}
                    </div>
                    <div className="text-sm opacity-75">
                      {type === 'cost' ? 'Фиксированная цена' : 
                       type === 'free' ? 'Без оплаты' : 
                       'Добровольные взносы'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {event.payment_type === 'cost' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="price" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Цена
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={event.price}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-16 rounded-lg border transition-colors ${
                          errors.price 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                        } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                        placeholder="Оставьте пустым для оплаты только онлайн"
                        min="0"
                        step="100"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <span className="text-gray-500 font-medium">{event.currency}</span>
                      </div>
                    </div>
                    {errors.price && errors.payment_link && (
                      <p className="text-red-500 text-sm mt-2">
                        Для активных мероприятий необходимо указать либо цену, либо ссылку на оплату
                      </p>
                    )}
                    <p className="text-gray-500 text-sm mt-2">
                      Оставьте пустым для оплаты только онлайн
                    </p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="currency" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Валюта
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      value={event.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="couple_discount" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Скидка для пар (%)
                    </label>
                    <input
                      type="number"
                      id="couple_discount"
                      name="couple_discount"
                      value={event.couple_discount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors"
                      placeholder="Например: 10"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div className="form-group flex items-end">
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors w-full">
                      <input
                        type="checkbox"
                        name="child_half_price"
                        checked={event.child_half_price}
                        onChange={handleCheckboxChange}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors"
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Детский билет за полцены
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}
            
            <div className="form-group">
              <label htmlFor="payment_link" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Link className="h-4 w-4 inline mr-2" />
                Ссылка на оплату
              </label>
              <input
                type="url"
                id="payment_link"
                name="payment_link"
                value={event.payment_link}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.payment_link 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="https://..."
              />
              {errors.price && errors.payment_link && (
                <p className="text-red-500 text-sm mt-2">
                  Для активных мероприятий необходимо указать либо цену, либо ссылку на оплату
                </p>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="payment_widget_id" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                ID виджета оплаты
              </label>
              <textarea
                id="payment_widget_id"
                name="payment_widget_id"
                value={event.payment_widget_id}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-colors resize-vertical"
                placeholder="ID виджета или HTML-код"
              />
            </div>
            
            <div className="form-group">
              <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                Виджет оплаты
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEvent(prev => ({ ...prev, widget_chooser: false }))}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    !event.widget_chooser
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                  }`}
                >
                  <div className="font-semibold text-lg mb-1">🔗 Ссылка</div>
                  <div className="text-sm opacity-75">Переход по ссылке</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setEvent(prev => ({ ...prev, widget_chooser: true }))}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    event.widget_chooser
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                  }`}
                >
                  <div className="font-semibold text-lg mb-1">🛠️ Виджет</div>
                  <div className="text-sm opacity-75">Встроенная форма</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <EventSpeakersSection
          selectedSpeakerIds={event.speakers}
          hideSpeakersGallery={event.hide_speakers_gallery}
          onSpeakerToggle={handleSpeakerToggle}
          onHideGalleryChange={handleHideSpeakersGalleryChange}
          allSpeakers={speakers}
        />
        
        <EventFestivalProgramSection
          eventType={event.event_type}
          festivalProgram={event.festival_program}
          allSpeakers={speakers}
          onFestivalProgramChange={handleFestivalProgramChange}
        />
        
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-dark-600">
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="px-6 py-3 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Сохранить
              </>
            )}
          </button>
        </div>
</form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Подтверждение удаления</h3>
            </div>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
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
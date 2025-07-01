import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Globe, 
  Tag, 
  DollarSign, 
  ExternalLink,
  Share2,
  Heart,
  ArrowLeft,
  Play,
  Image as ImageIcon,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { 
  EventType, 
  PaymentType, 
  Language,
  EventStatus,
  EVENT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  LANGUAGE_LABELS,
  STATUS_LABELS
} from '../pages/admin/constants';
import { 
  migrateEventToModern,
  getEventTypeLabel,
  getPaymentTypeLabel,
  getLanguageLabel,
  formatLanguages,
  formatPrice
} from '../utils/migrationUtils';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Обновленные интерфейсы
interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  bio?: string;
  photo_url?: string;
  social_links?: Record<string, string>;
  active: boolean;
}

interface EventSpeaker {
  speaker_id: string;
  speaker: Speaker;
  role?: string;
  bio_override?: string;
}

interface FestivalProgramItem {
  id?: string;
  title: string;
  description: string;
  image_url?: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
  lecturer_name?: string;
}

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  comment?: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  status: boolean;
  created_at: string;
  payment_link_clicked?: boolean;
}

interface EventRegistrations {
  max_regs: number | null;
  current: number;
  current_adults: number;
  current_children: number;
  reg_list: Registration[];
}

interface DetailedEvent {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  event_type: EventType | string;
  status: EventStatus | string;
  payment_type: PaymentType | string;
  languages: Language[] | string[];
  bg_image?: string;
  price?: number | null;
  currency?: string;
  age_category?: string;
  location?: string;
  video_url?: string;
  photo_gallery?: string[];
  payment_link?: string;
  couple_discount?: number;
  child_half_price?: boolean;
  hide_speakers_gallery?: boolean;
  festival_program?: FestivalProgramItem[];
  speakers?: string[];
  event_speakers?: EventSpeaker[];
  registrations?: EventRegistrations;
  // Новые поля времени
  start_at?: string;
  end_at?: string;
  // Legacy поля
  date?: string;
  start_time?: string;
  end_time?: string;
  max_registrations?: number;
  current_registration_count?: number;
  registrations_list?: Registration[];
  created_at?: string;
  updated_at?: string;
}

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Состояние
  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем событие
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          throw new Error('Мероприятие не найдено');
        }
        throw eventError;
      }

      if (!eventData) {
        throw new Error('Мероприятие не найдено');
      }

      // Мигрируем событие к современному формату
      const migratedEvent = migrateEventToModern(eventData);
      
      // Загружаем спикеров если они есть
      let eventSpeakers: EventSpeaker[] = [];
      if (migratedEvent.speakers && migratedEvent.speakers.length > 0) {
        const { data: speakersData, error: speakersError } = await supabase
          .from('speakers')
          .select('*')
          .in('id', migratedEvent.speakers)
          .eq('active', true);

        if (!speakersError && speakersData) {
          eventSpeakers = speakersData.map(speaker => ({
            speaker_id: speaker.id,
            speaker: speaker,
            role: 'speaker'
          }));
          setSpeakers(speakersData);
        }
      }

      // Формируем финальный объект события
      const detailedEvent: DetailedEvent = {
        ...migratedEvent,
        event_speakers: eventSpeakers
      };

      setEvent(detailedEvent);

    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Ошибка при загрузке мероприятия');
    } finally {
      setLoading(false);
    }
  };

  // Утилиты для форматирования
  const formatEventDate = (event: DetailedEvent): string => {
    try {
      if (event.start_at) {
        return formatRussianDate(event.start_at);
      }
      if (event.date) {
        return formatRussianDate(event.date);
      }
      return 'Дата не указана';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Дата не указана';
    }
  };

  const formatEventTime = (event: DetailedEvent): string => {
    try {
      if (event.start_at && event.end_at) {
        const startTime = formatTimeFromTimestamp(event.start_at);
        const endTime = formatTimeFromTimestamp(event.end_at);
        return `${startTime} - ${endTime}`;
      }
      if (event.start_time && event.end_time) {
        return `${event.start_time} - ${event.end_time}`;
      }
      return 'Время не указано';
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Время не указано';
    }
  };

  const getEventImageUrl = (bgImage?: string): string => {
    if (!bgImage) {
      return 'https://via.placeholder.com/1200x600?text=Изображение+недоступно';
    }
    try {
      return getSupabaseImageUrl(bgImage);
    } catch (error) {
      console.error('Error getting image URL:', error);
      return 'https://via.placeholder.com/1200x600?text=Ошибка+загрузки';
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = event?.title || 'Мероприятие';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: event?.short_description || event?.description || '',
          url
        });
      } catch (error) {
        // Пользователь отменил или произошла ошибка
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Ссылка скопирована в буфер обмена');
    }).catch(() => {
      toast.error('Не удалось скопировать ссылку');
    });
  };

  const isEventPast = (event: DetailedEvent): boolean => {
    try {
      const now = new Date();
      let eventEndTime: Date;

      if (event.end_at) {
        eventEndTime = new Date(event.end_at);
      } else if (event.date && event.end_time) {
        eventEndTime = new Date(`${event.date}T${event.end_time}`);
      } else {
        return false; // Не можем определить
      }

      return eventEndTime < now;
    } catch (error) {
      console.error('Error checking if event is past:', error);
      return false;
    }
  };

  const canRegister = (event: DetailedEvent): boolean => {
    if (event.status !== 'active') return false;
    if (isEventPast(event)) return false;
    
    // Проверяем лимиты регистрации
    const registrations = event.registrations;
    if (registrations && registrations.max_regs) {
      return registrations.current < registrations.max_regs;
    }
    
    return true;
  };

  const getRegistrationStatus = (event: DetailedEvent): {
    canRegister: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
  } => {
    if (event.status !== 'active') {
      return {
        canRegister: false,
        message: 'Регистрация недоступна',
        type: 'error'
      };
    }

    if (isEventPast(event)) {
      return {
        canRegister: false,
        message: 'Мероприятие уже прошло',
        type: 'error'
      };
    }

    const registrations = event.registrations;
    if (registrations && registrations.max_regs) {
      const available = registrations.max_regs - registrations.current;
      if (available <= 0) {
        return {
          canRegister: false,
          message: 'Места закончились',
          type: 'error'
        };
      }
      if (available <= 5) {
        return {
          canRegister: true,
          message: `Осталось ${available} мест`,
          type: 'warning'
        };
      }
    }

    return {
      canRegister: true,
      message: 'Регистрация открыта',
      type: 'success'
    };
  };





  /////////////////////



  /////////////////////


  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {error || 'Мероприятие не найдено'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Возможно, мероприятие было удалено или ссылка устарела
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к списку
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const registrationStatus = getRegistrationStatus(event);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Навигация */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-600">
          <div className="container mx-auto px-4 py-4">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к мероприятиям
            </Link>
          </div>
        </div>

        {/* Главное изображение */}
        <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
          <img
            src={getEventImageUrl(event.bg_image)}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/1200x600?text=Изображение+недоступно';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          
          {/* Контент поверх изображения */}
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 pb-8">
              <div className="max-w-4xl">
                {/* Бейджи */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                    {getEventTypeLabel(event.event_type as string)}
                  </span>
                  
                  {event.age_category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {event.age_category}
                    </span>
                  )}
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    event.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {STATUS_LABELS[event.status as EventStatus] || event.status}
                  </span>
                </div>

                {/* Заголовок */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  {event.title}
                </h1>

                {/* Краткое описание */}
                {event.short_description && (
                  <p className="text-lg text-gray-200 mb-6 max-w-2xl">
                    {event.short_description}
                  </p>
                )}

                {/* Ключевая информация */}
                <div className="flex flex-wrap gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>{formatEventDate(event)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{formatEventTime(event)}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-full shadow-lg transition-colors"
              title="Поделиться"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Основной контент */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Левая колонка - основная информация */}
            <div className="lg:col-span-2 space-y-8">
              {/* Описание */}
              {event.description && (
                <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    О мероприятии
                  </h2>
                  <div className="prose dark:prose-dark max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Спикеры */}
              {!event.hide_speakers_gallery && speakers.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Спикеры
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {speakers.map((speaker) => (
                      <div key={speaker.id} className="flex gap-4">
                        {speaker.photo_url ? (
                          <img
                            src={getSupabaseImageUrl(speaker.photo_url)}
                            alt={speaker.name}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/64x64?text=Фото';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-dark-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {speaker.name}
                          </h3>
                          <p className="text-sm text-primary-600 dark:text-primary-400 mb-2">
                            {speaker.field_of_expertise}
                          </p>
                          {speaker.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                              {speaker.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Фестивальная программа */}
              {event.event_type === 'festival' && event.festival_program && event.festival_program.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Программа фестиваля
                  </h2>
                  
                  <div className="space-y-4">
                    {event.festival_program.map((item, index) => (
                      <div key={index} className="flex gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                            <Clock className="h-4 w-4" />
                            <span>{item.start_time} - {item.end_time}</span>
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {item.title}
                          </h3>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {item.description}
                          </p>
                          
                          {item.lecturer_name && (
                            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                              Ведущий: {item.lecturer_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Видео */}
              {event.video_url && (
                <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Видео
                  </h2>
                  
                  <div className="aspect-video">
                    <iframe
                      src={event.video_url}
                      title={`Видео: ${event.title}`}
                      className="w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}




{/* ///////////////////////////////// */}








              {/* ///////////////////////// */}




              
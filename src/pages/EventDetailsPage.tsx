import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Clock, MapPin, Users, Globe, Share2, ArrowLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';
import RegistrationModal from '../components/events/RegistrationModal';
import PaymentOptionsModal from '../components/events/PaymentOptionsModal';
import { toast } from 'react-hot-toast';
import { EventRegistrations } from './admin/constants';
import { 
  formatRussianDate, 
  formatTimeFromTimestamp, 
  formatTimeRange,
  isPastEvent 
} from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  photos: { url: string; isMain?: boolean }[];
}

interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}
interface Event { 
  id: string;
  title: string;
  description: string;
  event_type: string;
  bg_image: string;
  // Используем новые поля timestamptz
  start_at: string;
  end_at: string;
  location?: string;
  age_category: string;
  price: number | null;
  currency?: string;
  status: string;
  payment_type: string;
  payment_link?: string;
  payment_widget_id?: string;
  languages: string[];
  speakers: string[];
  festival_program?: FestivalProgramItem[];
  registrations?: EventRegistrations;
  video_url?: string;
  photo_gallery?: string[] | string;
  // Удаляем legacy поля полностью, так как они больше не используются
}


// Helper function to safely parse photo gallery
const parsePhotoGallery = (photoGallery: string[] | string | null | undefined): string[] => {
  if (!photoGallery) {
    return [];
  }
  
  if (Array.isArray(photoGallery)) {
    return photoGallery;
  }
  
  if (typeof photoGallery === 'string') {
    try {
      const parsed = JSON.parse(photoGallery);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing photo_gallery JSON:', e);
      return [];
    }
  }
  
  return [];
};

const renderDescriptionWithLinks = (description: string) => {
  if (!description) {
    return <p className="text-gray-500 dark:text-gray-400">Описание отсутствует</p>;
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1(?:[^>]*?)>(.*?)<\/a>/g;

  while ((match = linkRegex.exec(description)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: description.substring(lastIndex, match.index)
      });
    }

    parts.push({
      type: 'link',
      url: match[2],
      text: match[3]
    });

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < description.length) {
    parts.push({
      type: 'text',
      content: description.substring(lastIndex)
    });
  }

  if (parts.length === 0) {
    return <span>{description}</span>;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        } else if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:opacity-80 underline"
            >
              {part.text}
            </a>
          );
        }
        return null;
      })}
    </>
  );
};

const renderEventDescription = (text: string) => {
  if (!text) return null;
  
  const paragraphs = text.split(/\n\s*\n/);
  
  return (
    <div className="prose dark:prose-invert max-w-none">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-4">
          {renderDescriptionWithLinks(paragraph)}
        </p>
      ))}
    </div>
  );
};

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      
      // Получаем событие с временным слотом
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          time_slot:time_slots_table!fk_time_slots_event(
            id,
            start_at,
            end_at
          )
        `)
        .eq('id', id)
        .single();

      if (eventError) throw eventError;

      // Обогащаем событие временными данными из слота
      const enrichedEvent = {
        ...eventData,
        start_at: eventData.time_slot?.[0]?.start_at || eventData.start_at,
        end_at: eventData.time_slot?.[0]?.end_at || eventData.end_at
      };

      setEvent(enrichedEvent);

      if (eventData.speakers?.length) {
        const { data: speakersData, error: speakersError } = await supabase
          .from('speakers')
          .select('*')
          .in('id', eventData.speakers);

        if (speakersError) throw speakersError;
        setSpeakers(speakersData || []);
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError('Не удалось загрузить мероприятие');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const eventDate = event?.start_at ? formatRussianDate(event.start_at) : '';
    const text = `${event?.title} - ${eventDate}`;

    switch (platform) {
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        break;
      case 'vk':
        window.open(`https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`);
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Ссылка скопирована');
        } catch (err) {
          toast.error('Не удалось скопировать ссылку');
        }
        break;
    }

    setShowShareMenu(false);
  };

  const handlePaymentOptionSelect = (option: 'online' | 'venue') => {
    setShowPaymentOptions(false);
    
    if (option === 'online' && event?.payment_link) {
      window.open(event.payment_link, '_blank');
    } else if (option === 'venue') {
      setShowRegistrationModal(true);
    }
  };

  const handleRegisterClick = () => {
    if (event?.payment_type === 'free' || event?.payment_type === 'donation') {
      setShowRegistrationModal(true);
    } else if (event?.price === null && event?.payment_link) {
      // For online payment only events, redirect directly to payment link
      window.open(event.payment_link, '_blank');
    } else {
      setShowPaymentOptions(true);
    }
  };

  // Helper function to get max registrations from either new or legacy structure
  const getMaxRegistrations = (): number | null => {
    if (event?.registrations?.max_regs !== undefined) {
      return event.registrations.max_regs;
    }
    return event?.max_registrations || null;
  };

  // Helper function to get current registration count from either new or legacy structure
  const getCurrentRegistrationCount = (): number => {
    if (event?.registrations?.current !== undefined) {
      return event.registrations.current;
    }
    return event?.current_registration_count || 0;
  };

  // Проверяем является ли событие прошедшим используя утилиту
  const isEventPast = event?.end_at ? isPastEvent(event.end_at) : false;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-red-600 dark:text-red-400">
          {error || 'Мероприятие не найдено'}
        </div>
      </Layout>
    );
  }

  const maxRegistrations = getMaxRegistrations();
  const currentRegistrationCount = getCurrentRegistrationCount();
  
  // Safely parse photo gallery
  const photoGallery = parsePhotoGallery(event.photo_gallery);

  return (
    <Layout>
      {/* Hero блок */}
      <div 
        className="h-[400px] bg-cover bg-center relative"
        style={{ 
          backgroundImage: event.bg_image 
            ? `url(${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image})`
            : 'url(https://via.placeholder.com/1920x400?text=No+image)'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="container relative h-full flex items-end pb-12">
          <div className="text-white">
            <Link 
              to="/events"
              className="inline-flex items-center text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Назад к мероприятиям
            </Link>
            
            <div className="hidden md:block">
              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-6 text-white/90">
                {event.start_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>{formatRussianDate(event.start_at)}</span>
                  </div>
                )}
                {event.start_at && event.end_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{formatTimeRange(event.start_at, event.end_at)}</span>
                  </div>
                )}
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
      </div>

      {/* Для мобильных */}
      <div className="md:hidden bg-white dark:bg-dark-800 py-6 px-4">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-4">{event.title}</h1>
        <div className="flex flex-col gap-3 text-dark-600 dark:text-dark-300">
          {event.start_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{formatRussianDate(event.start_at)}</span>
            </div>
          )}
          {event.start_at && event.end_at && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{formatTimeRange(event.start_at, event.end_at)}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>

      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="card p-6">
                <h2 className="text-2xl font-semibold mb-4">О мероприятии</h2>
                {renderEventDescription(event.description)}
              </div>

              {/* Видео (если есть) */}
              {event.video_url && (
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-4">Видео</h2>
                  <div className="aspect-video">
                    <iframe
                      src={event.video_url}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title="Event video"
                    />
                  </div>
                </div>
              )}

              {/* Галерея фотографий (если есть) */}
              {photoGallery.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-4">Фотогалерея</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photoGallery.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Фото ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {event.event_type === 'Festival' && event.festival_program && event.festival_program.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-semibold mb-6">Программа фестиваля</h2>
                  <div className="space-y-6">
                    {event.festival_program
                      .sort((a, b) => {
                        try {
                          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                        } catch (e) {
                          console.error('Error sorting program items:', e);
                          return 0;
                        }
                      })
                      .map((item, index) => {
                        const speaker = item.lecturer_id 
                          ? speakers.find(s => s.id === item.lecturer_id)
                          : null;
                          
                        return (
                          <div key={index} className="border-b border-gray-200 dark:border-dark-700 pb-6 last:border-0 last:pb-0">
                            <div className="flex flex-col md:flex-row gap-6">
                              {item.image_url && (
                                <div className="md:w-1/3">
                                  <img 
                                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${item.image_url}`}
                                    alt={item.title}
                                    className="w-full h-auto rounded-lg object-cover"
                                  />
                                </div>
                              )}
                              <div className={`${item.image_url ? 'md:w-2/3' : 'w-full'}`}>
                                <div className="flex flex-wrap items-center gap-4 mb-3">
                                  <span className="text-sm font-medium px-3 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 rounded-full">
                                    {formatTimeFromTimestamp(item.start_time)} - {formatTimeFromTimestamp(item.end_time)}
                                  </span>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                <div className="prose dark:prose-invert max-w-none mb-4">
                                  {renderDescriptionWithLinks(item.description)}
                                </div>
                                
                                {speaker && (
                                  <div className="mt-4 flex items-center gap-3">
                                    <Link to={`/speakers/${speaker.id}`} className="shrink-0">
                                      {speaker.photos?.find(p => p.isMain)?.url && (
                                        <img
                                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos.find(p => p.isMain)?.url}`}
                                          alt={speaker.name}
                                          className="w-12 h-12 rounded-full object-cover"
                                        />
                                      )}
                                    </Link>
                                    <div>
                                      <Link 
                                        to={`/speakers/${speaker.id}`}
                                        className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                                      >
                                        {speaker.name}
                                      </Link>
                                      <p className="text-sm text-dark-500 dark:text-dark-400">
                                        {speaker.field_of_expertise}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {speakers.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold">Спикеры</h2>
                  {speakers.map(speaker => (
                    <div key={speaker.id} className="card p-6">
                      <div className="flex items-start gap-4">
                        <Link to={`/speakers/${speaker.id}`} className="shrink-0">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos.find(p => p.isMain)?.url}`}
                            alt={speaker.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        </Link>
                        <div>
                          <Link 
                            to={`/speakers/${speaker.id}`}
                            className="text-lg font-semibold hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {speaker.name}
                          </Link>
                          <p className="text-sm text-primary-600 dark:text-primary-400 mb-2">
                            {speaker.field_of_expertise}
                          </p>
                          {renderDescriptionWithLinks(speaker.description)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isEventPast && (
              <div className="space-y-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="block text-sm text-dark-500 dark:text-dark-400">Стоимость</span>
                      <span className="text-2xl font-bold">
                        {event.payment_type === 'free' 
                          ? 'Бесплатно'
                          : event.payment_type === 'donation'
                            ? 'Донейшн'
                            : event.price === null
                              ? 'Онлайн оплата'
                              : `${event.price} ${event.currency}`
                        }
                      </span>
                    </div>
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full relative"
                    >
                      <Share2 className="h-5 w-5" />
                      
                      {showShareMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-lg py-2 z-50">
                          <button
                            onClick={() => handleShare('telegram')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700"
                          >
                            Telegram
                          </button>
                          <button
                            onClick={() => handleShare('vk')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700"
                          >
                            VKontakte
                          </button>
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700"
                          >
                            Копировать ссылку
                          </button>
                        </div>
                      )}
                    </button>
                  </div>

                  {event.payment_widget_id && (
                    <div 
                      className="mb-4"
                      dangerouslySetInnerHTML={{ __html: event.payment_widget_id }}
                    />
                  )}

                  <button 
                    onClick={handleRegisterClick}
                    className="w-full btn-primary mb-4"
                  >
                    {event.price === null && event.payment_link ? 'Купить онлайн' : 'Зарегистрироваться'}
                  </button>

                  <div className="space-y-4 text-sm">
                    {event.languages?.length > 0 && (
                      <div className="flex items-center gap-2 text-dark-500 dark:text-dark-400">
                        <Globe className="h-5 w-5" />
                        <span>{event.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {event.location && (
                  <div className="card p-6">
                    <p className="font-semibold mb-4">Место проведения</p>
                    <div className="space-y-2">
                      <p className="text-dark-600 dark:text-dark-300">{event.location}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        event={event}
      />

      <PaymentOptionsModal
        isOpen={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        onSelectOption={handlePaymentOptionSelect}
        hasOnlinePayment={event.payment_type !== 'free' && event.payment_type !== 'donation'}
        paymentType={event.payment_type === 'widget' ? 'widget' : 'link'}
        paymentLink={event.payment_link}
      />
    </Layout>
  );
};

export default EventDetailsPage;
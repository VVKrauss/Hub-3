// src/pages/EventDetailsPage.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft,
  ExternalLink,
  Globe,
  DollarSign,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Github
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteEvents } from '../hooks/useFavorites';
import FavoriteButton from '../components/favorites/FavoriteButton';
import RegistrationModal from '../components/events/RegistrationModal';
import { getEventById } from '../api/events';
import type { EventWithDetails } from '../types/database';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Состояние
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  // Хуки для избранного
  const { 
    toggleFavoriteEvent, 
    isFavoriteEvent, 
    loading: favLoading 
  } = useFavoriteEvents(user?.id);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching event:', eventId);
      
      const result = await getEventById(eventId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Мероприятие не найдено');
      }

      console.log('Event loaded successfully:', result.data);
      setEvent(result.data);

    } catch (err: any) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Ошибка при загрузке мероприятия');
    } finally {
      setLoading(false);
    }
  };

  // Функции для работы с изображениями
  const getEventImages = () => {
    if (!event) return [];
    
    const images = [];
    
    if (event.cover_image_url) {
      images.push(event.cover_image_url);
    }
    
    if (event.gallery_images && event.gallery_images.length > 0) {
      images.push(...event.gallery_images);
    }
    
    return images.map(url => 
      url.startsWith('http') ? url : getSupabaseImageUrl(url)
    );
  };

  // Функции для галереи
  const openGallery = (index: number = 0) => {
    setSelectedImage(index);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
  };

  const nextImage = () => {
    const images = getEventImages();
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = getEventImages();
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  // Проверки состояния события
  const isEventInPast = (event: EventWithDetails): boolean => {
    return new Date(event.end_at) < new Date();
  };

  const isRegistrationOpen = (event: EventWithDetails): boolean => {
    if (!event.registration_enabled) return false;
    if (isEventInPast(event)) return false;
    
    const now = new Date();
    if (event.registration_start_at && new Date(event.registration_start_at) > now) return false;
    if (event.registration_end_at && new Date(event.registration_end_at) < now) return false;
    
    return true;
  };

  // Получение иконки для соцсети
  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'twitter': case 'x': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'github': return <Github className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  // Загрузка
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка мероприятия...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Ошибка
  if (error || !event) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Мероприятие не найдено'}
            </h1>
            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              К списку мероприятий
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const images = getEventImages();
  const isPastEvent = isEventInPast(event);
  const canRegister = isRegistrationOpen(event);
  const hasAvailableSpots = !event.max_attendees || (event.available_spots && event.available_spots > 0);

  return (
    <Layout>
      {/* Кнопка назад */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/events')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            К списку мероприятий
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ОБНОВЛЕННОЕ: Изображение в контейнере */}
          {images.length > 0 && (
            <div className="relative w-full h-[400px] overflow-hidden rounded-xl shadow-2xl mb-8">
              <img
                src={images[0]}
                alt={event.title}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => openGallery(0)}
              />
              
              {/* Градиент для элементов управления */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
              
              {/* Действия в правом верхнем углу */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {user && (
                  <FavoriteButton
                    eventId={event.id}
                    isFavorite={isFavoriteEvent(event.id)}
                    onToggle={() => toggleFavoriteEvent(event.id)}
                    loading={favLoading}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  />
                )}
                
                {images.length > 1 && (
                  <button
                    onClick={() => openGallery(0)}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    {images.length} фото
                  </button>
                )}
              </div>

              {/* Заголовок поверх изображения */}
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
                  {event.title}
                </h1>
                {event.short_description && (
                  <p className="text-lg text-white/95 max-w-2xl drop-shadow-md">
                    {event.short_description}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основная информация */}
            <div className="lg:col-span-2 space-y-8">
              {/* Заголовок (если нет изображения) */}
              {images.length === 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {event.title}
                      </h1>
                      {event.short_description && (
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                          {event.short_description}
                        </p>
                      )}
                    </div>
                    {user && (
                      <FavoriteButton
                        eventId={event.id}
                        isFavorite={isFavoriteEvent(event.id)}
                        onToggle={() => toggleFavoriteEvent(event.id)}
                        loading={favLoading}
                      />
                    )}
                  </div>
                </div>
              )}

            {/* НОВЫЙ: Единый блок информации */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Информация о мероприятии
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Дата и время */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatRussianDate(event.start_at)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatTimeFromTimestamp(event.start_at)} - {formatTimeFromTimestamp(event.end_at)}
                    </p>
                  </div>
                </div>

                {/* Место проведения */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    {event.location_type === 'online' ? (
                      <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.location_type === 'online' ? 'Онлайн' : event.venue_name || 'Место проведения'}
                    </p>
                    {event.venue_address && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.venue_address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Стоимость */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.payment_type === 'free' ? 'Бесплатно' :
                       event.payment_type === 'donation' ? 'Донат' :
                       event.base_price ? `${event.base_price} ${event.currency || 'RSD'}` : 'Уточняется'}
                    </p>
                    {event.price_description && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {event.price_description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Участники */}
                {(event.max_attendees || event.available_spots) && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.available_spots ? `${event.available_spots} мест доступно` : 'Участники'}
                      </p>
                      {event.max_attendees && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Максимум: {event.max_attendees}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Теги */}
              {event.tags && event.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Теги:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* НОВЫЙ: Информация о спикерах */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Спикеры
                </h2>
                <div className="space-y-6">
                  {event.speakers.map((speakerData, index) => {
                    const speaker = speakerData.speaker || speakerData;
                    return (
                      <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                          {speaker.avatar_url ? (
                            <img
                              src={getSupabaseImageUrl(speaker.avatar_url)}
                              alt={speaker.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {speaker.name}
                              </h3>
                              {speaker.field_of_expertise && (
                                <p className="text-primary-600 dark:text-primary-400 text-sm mb-2">
                                  {speaker.field_of_expertise}
                                </p>
                              )}
                              {(speakerData.bio_override || speaker.bio) && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  {speakerData.bio_override || speaker.bio}
                                </p>
                              )}
                            </div>
                            
                            <Link
                              to={`/speakers/${speaker.slug || speaker.id}`}
                              className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                            >
                              Подробнее
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          
                          {/* Социальные ссылки спикера */}
                          {speaker.social_links && speaker.social_links.length > 0 && (
                            <div className="flex items-center gap-2 mt-3">
                              {speaker.social_links
                                .filter(link => link.is_public)
                                .slice(0, 4)
                                .map((social, socialIndex) => (
                                  <a
                                    key={socialIndex}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                    title={social.display_name || social.platform}
                                  >
                                    {getSocialIcon(social.platform)}
                                  </a>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Описание */}
            {event.description && (
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  О мероприятии
                </h2>
                <div 
                  className="prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}

            {/* Программа/Расписание */}
            {event.schedule && event.schedule.length > 0 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Программа
                </h2>
                <div className="space-y-4">
                  {event.schedule.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {item.title}
                          </h3>
                          <span className="text-sm text-primary-600 dark:text-primary-400">
                            {item.start_time} - {item.end_time}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Регистрация */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Участие
              </h3>
              
              {isPastEvent ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Мероприятие завершено</p>
                </div>
              ) : canRegister && hasAvailableSpots ? (
                <button
                  onClick={() => setIsRegistering(true)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Зарегистрироваться
                </button>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {!canRegister ? 'Регистрация закрыта' : 'Нет свободных мест'}
                  </p>
                </div>
              )}

              {/* Онлайн трансляция */}
              {event.online_meeting_url && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <a
                    href={event.online_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Онлайн трансляция
                  </a>
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Детали
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Тип:</span>
                  <span className="text-gray-900 dark:text-white capitalize">{event.event_type}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Язык:</span>
                  <span className="text-gray-900 dark:text-white">{event.language_code === 'ru' ? 'Русский' : 'Английский'}</span>
                </div>
                
                {event.age_category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Возраст:</span>
                    <span className="text-gray-900 dark:text-white">{event.age_category}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Галерея изображений */}
      {showGallery && images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            
            <img
              src={images[selectedImage]}
              alt={`${event.title} - изображение ${selectedImage + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
                  {selectedImage + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно регистрации */}
      {isRegistering && (
        <RegistrationModal
          event={event}
          onClose={() => setIsRegistering(false)}
          onSuccess={() => {
            setIsRegistering(false);
            fetchEvent(id!);
          }}
        />
      )}
    </Layout>
  );
};

export default EventDetailsPage;
// src/pages/EventDetailsPage.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы вместо старых

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Heart, 
  Share2, 
  ArrowLeft,
  ExternalLink,
  ImageOff,
  Tag,
  Globe,
  DollarSign,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteEvents } from '../hooks/useFavorites';
import FavoriteButton from '../components/favorites/FavoriteButton';
import RegisterEventModal from '../components/events/RegisterEventModal';
import { getEventById } from '../api/events';
import type { EventWithDetails } from '../types/database';
import { formatDate, formatTime } from '../utils/dateUtils';
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
      
      // Используем новый API для получения события
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
    
    // Главное изображение
    if (event.cover_image_url) {
      images.push(event.cover_image_url);
    }
    
    // Галерея изображений
    if (event.gallery_images && event.gallery_images.length > 0) {
      images.push(...event.gallery_images);
    }
    
    return images.map(url => getSupabaseImageUrl(url));
  };

  const openGallery = (index: number = 0) => {
    setSelectedImage(index);
    setShowGallery(true);
  };

  // Обработчики событий
  const handleFavoriteClick = () => {
    if (!user) {
      toast.error('Войдите в аккаунт для добавления в избранное');
      return;
    }
    toggleFavoriteEvent(event!.id);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event!.title,
          text: event!.short_description || event!.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Sharing failed:', err);
      }
    } else {
      // Fallback - копируем ссылку в буфер обмена
      navigator.clipboard.writeText(window.location.href);
      toast.success('Ссылка скопирована в буфер обмена');
    }
  };

  const handleRegister = () => {
    if (!user) {
      toast.error('Войдите в аккаунт для регистрации');
      return;
    }
    setIsRegistering(true);
  };

  // Вспомогательные функции
  const isEventInPast = (event: EventWithDetails) => {
    return new Date(event.end_at) < new Date();
  };

  const isRegistrationOpen = (event: EventWithDetails) => {
    const now = new Date();
    const registrationStart = event.registration_start_at ? new Date(event.registration_start_at) : null;
    const registrationEnd = event.registration_end_at ? new Date(event.registration_end_at) : null;
    
    if (registrationStart && now < registrationStart) return false;
    if (registrationEnd && now > registrationEnd) return false;
    
    return event.registration_enabled && !isEventInPast(event);
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'lecture': 'Лекция',
      'workshop': 'Мастер-класс',
      'conference': 'Конференция',
      'seminar': 'Семинар',
      'festival': 'Фестиваль',
      'discussion': 'Обсуждение',
      'concert': 'Концерт',
      'standup': 'Стендап',
      'excursion': 'Экскурсия',
      'quiz': 'Квиз',
      'swap': 'Обмен',
      'movie_discussion': 'Обсуждение фильма',
      'conversation_club': 'Разговорный клуб',
      'other': 'Другое'
    };
    return labels[type] || type;
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'free': 'Бесплатно',
      'paid': 'Платно',
      'donation': 'По донации'
    };
    return labels[type] || type;
  };

  // Рендеринг состояний загрузки и ошибок
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Загрузка мероприятия...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основная информация */}
            <div className="lg:col-span-2 space-y-8">
              {/* Заголовок и основная информация */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden">
                {/* Изображение */}
                {event.cover_image_url && (
                  <div className="aspect-video relative cursor-pointer" onClick={() => openGallery(0)}>
                    <img
                      src={getSupabaseImageUrl(event.cover_image_url)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        +{images.length - 1} фото
                      </div>
                    )}
                  </div>
                )}

                <div className="p-8">
                  {/* Теги и тип события */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    
                    {event.age_category && (
                      <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm">
                        {event.age_category}
                      </span>
                    )}
                    
                    {isPastEvent && (
                      <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-sm">
                        Завершено
                      </span>
                    )}
                  </div>

                  {/* Заголовок */}
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {event.title}
                  </h1>

                  {/* Краткое описание */}
                  {event.short_description && (
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                      {event.short_description}
                    </p>
                  )}

                  {/* Основная информация */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Дата и время */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(event.start_at)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatTime(event.start_at)} - {formatTime(event.end_at)}
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
                          {event.location_type === 'online' ? 'Онлайн' : (event.venue_name || 'Офлайн')}
                        </p>
                        {event.venue_address && (
                          <p className="text-gray-600 dark:text-gray-400">
                            {event.venue_address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Участники */}
                    {(event.max_attendees || event.registrations_count > 0) && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {event.registrations_count || 0}
                            {event.max_attendees && ` из ${event.max_attendees}`} участников
                          </p>
                          {event.available_spots !== null && (
                            <p className="text-gray-600 dark:text-gray-400">
                              {event.available_spots > 0 
                                ? `Осталось ${event.available_spots} мест` 
                                : 'Мест нет'
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Стоимость */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getPaymentTypeLabel(event.payment_type)}
                        </p>
                        {event.base_price && event.base_price > 0 && (
                          <p className="text-gray-600 dark:text-gray-400">
                            {event.base_price} {event.currency}
                          </p>
                        )}
                        {event.price_description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {event.price_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Теги */}
                  {event.tags && event.tags.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center mb-2">
                        <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Теги:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Действия */}
                  <div className="flex flex-wrap items-center gap-4">
                    {user && (
                      <FavoriteButton
                        isFavorite={isFavoriteEvent(event.id)}
                        onClick={handleFavoriteClick}
                        loading={favLoading}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      />
                    )}
                    
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Поделиться
                    </button>

                    {event.online_meeting_url && (
                      <a
                        href={event.online_meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Онлайн трансляция
                      </a>
                    )}
                  </div>
                </div>
              </div>

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
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {item.start_time} - {item.end_time}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-gray-600 dark:text-gray-300">
                              {item.description}
                            </p>
                          )}
                          {item.location_override && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              📍 {item.location_override}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Спикеры */}
              {event.sh_event_speakers && event.sh_event_speakers.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Спикеры
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {event.sh_event_speakers.map((eventSpeaker) => {
                      const speaker = eventSpeaker.speaker;
                      if (!speaker) return null;
                      
                      return (
                        <div key={eventSpeaker.id} className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {speaker.avatar_url ? (
                              <img
                                src={getSupabaseImageUrl(speaker.avatar_url)}
                                alt={speaker.name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {speaker.name}
                            </h3>
                            {speaker.field_of_expertise && (
                              <p className="text-primary-600 dark:text-primary-400 text-sm">
                                {speaker.field_of_expertise}
                              </p>
                            )}
                            {(eventSpeaker.bio_override || speaker.bio) && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                                {eventSpeaker.bio_override || speaker.bio}
                              </p>
                            )}
                            {eventSpeaker.role !== 'speaker' && (
                              <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs mt-2">
                                {eventSpeaker.role}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Видео */}
              {event.video_url && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Видео
                  </h2>
                  <div className="aspect-video">
                    <iframe
                      src={event.video_url}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title="Видео мероприятия"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Боковая панель */}
            <div className="space-y-6">
              {/* Кнопка регистрации */}
              {event.registration_required && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Регистрация
                  </h3>
                  
                  {isPastEvent ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      Мероприятие завершено
                    </p>
                  ) : !canRegister ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      Регистрация закрыта
                    </p>
                  ) : !hasAvailableSpots ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400 mb-3">
                        Мест нет
                      </p>
                      {event.allow_waitlist && (
                        <button
                          onClick={handleRegister}
                          className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          Лист ожидания
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleRegister}
                      className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Зарегистрироваться
                    </button>
                  )}
                </div>
              )}

              {/* Дополнительная информация */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Информация
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Язык:</span>
                    <span className="text-gray-900 dark:text-white">
                      {event.language_code === 'sr' ? 'Сербский' : 
                       event.language_code === 'ru' ? 'Русский' : 
                       event.language_code === 'en' ? 'Английский' : 
                       event.language_code}
                    </span>
                  </div>
                  
                  {event.timezone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Часовой пояс:</span>
                      <span className="text-gray-900 dark:text-white">{event.timezone}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Статус:</span>
                    <span className="text-gray-900 dark:text-white">
                      {event.status === 'active' ? 'Активное' :
                       event.status === 'past' ? 'Завершено' :
                       event.status === 'cancelled' ? 'Отменено' :
                       event.status === 'draft' ? 'Черновик' : event.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Модал регистрации */}
        {isRegistering && event && (
          <RegisterEventModal
            event={event}
            isOpen={isRegistering}
            onClose={() => setIsRegistering(false)}
            onSuccess={() => {
              setIsRegistering(false);
              // Перезагружаем событие для обновления счетчика
              fetchEvent(event.id);
            }}
          />
        )}

        {/* Галерея изображений */}
        {showGallery && images.length > 0 && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <div className="relative max-w-4xl max-h-full p-4">
              <button
                onClick={() => setShowGallery(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="w-8 h-8" />
              </button>
              
              <img
                src={images[selectedImage]}
                alt={event.title}
                className="max-w-full max-h-full object-contain"
              />
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  
                  <button
                    onClick={() => setSelectedImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-2 h-2 rounded-full ${
                          index === selectedImage ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventDetailsPage;


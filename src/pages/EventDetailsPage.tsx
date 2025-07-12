// src/pages/EventDetailsPage.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ без дёрганья
import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteEvents } from '../hooks/useFavorites';
import FavoriteButton from '../components/favorites/FavoriteButton';
import RegistrationModal from '../components/events/RegistrationModal';
import { getEventById } from '../api/events';
import { UnifiedLoadingPageWrapper } from '../components/ui/UnifiedLoading';
import type { EventWithDetails } from '../types/database';
import { formatRussianDate, formatTimeFromTimestamp } from '../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../utils/imageUtils';

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 🎯 ЕДИНОЕ состояние загрузки - ключ к решению проблемы
  const [pageState, setPageState] = useState<{
    event: EventWithDetails | null;
    loading: boolean;
    error: string | null;
    isRegistering: boolean;
    showGallery: boolean;
    selectedImage: number;
  }>({
    event: null,
    loading: true,
    error: null,
    isRegistering: false,
    showGallery: false,
    selectedImage: 0
  });

  // Хуки для избранного
  const { 
    toggleFavoriteEvent, 
    isFavoriteEvent, 
    loading: favLoading 
  } = useFavoriteEvents(user?.id);

  // 🚀 Оптимизированная загрузка с единым состоянием
  const fetchEvent = useCallback(async (eventId: string) => {
    try {
      // НЕ показываем множественные лоадеры
      setPageState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));

      console.log('Fetching event:', eventId);
      
      const result = await getEventById(eventId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Мероприятие не найдено');
      }

      console.log('Event loaded successfully:', result.data);
      
      // ✅ ЕДИНОЕ обновление состояния без дёрганья
      setPageState(prev => ({
        ...prev,
        event: result.data,
        loading: false,
        error: null
      }));

    } catch (err: any) {
      console.error('Error fetching event:', err);
      setPageState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Ошибка при загрузке мероприятия'
      }));
    }
  }, []);

  // Загрузка при изменении ID
  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  // 🎨 Мемоизированные функции для изображений
  const eventImages = useMemo(() => {
    if (!pageState.event) return [];
    
    const images = [];
    
    if (pageState.event.cover_image_url) {
      images.push(pageState.event.cover_image_url);
    }
    
    if (pageState.event.gallery_images && pageState.event.gallery_images.length > 0) {
      images.push(...pageState.event.gallery_images);
    }
    
    return images.map(url => 
      url.startsWith('http') ? url : getSupabaseImageUrl(url)
    );
  }, [pageState.event]);

  // Обработчики галереи
  const openGallery = useCallback((imageIndex: number) => {
    setPageState(prev => ({
      ...prev,
      showGallery: true,
      selectedImage: imageIndex
    }));
  }, []);

  const closeGallery = useCallback(() => {
    setPageState(prev => ({
      ...prev,
      showGallery: false
    }));
  }, []);

  const nextImage = useCallback(() => {
    setPageState(prev => ({
      ...prev,
      selectedImage: (prev.selectedImage + 1) % eventImages.length
    }));
  }, [eventImages.length]);

  const prevImage = useCallback(() => {
    setPageState(prev => ({
      ...prev,
      selectedImage: prev.selectedImage === 0 ? eventImages.length - 1 : prev.selectedImage - 1
    }));
  }, [eventImages.length]);

  // Обработчик регистрации
  const openRegistration = useCallback(() => {
    setPageState(prev => ({ ...prev, isRegistering: true }));
  }, []);

  const closeRegistration = useCallback(() => {
    setPageState(prev => ({ ...prev, isRegistering: false }));
  }, []);

  // 🎯 ЕДИНЫЙ компонент загрузки вместо множественных
  return (
    <Layout disablePageTransition={true}>
      <UnifiedLoadingPageWrapper
        loading={pageState.loading}
        error={pageState.error}
        loadingText="Загружаем мероприятие..."
      >
        {pageState.event && (
          <div className="animate-fade-in">
            {/* Кнопка "Назад" */}
            <div className="bg-white dark:bg-dark-900 sticky top-16 z-30 border-b border-gray-200 dark:border-dark-700">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Назад
                </button>
              </div>
            </div>

            {/* Основное изображение */}
            {eventImages.length > 0 && (
              <div className="relative h-96 md:h-[500px] overflow-hidden">
                <img
                  src={eventImages[0]}
                  alt={pageState.event.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => openGallery(0)}
                  loading="eager" // Главное изображение загружаем сразу
                />
                <div className="absolute inset-0 bg-black bg-opacity-40" />
                
                {/* Информация поверх изображения */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="max-w-7xl mx-auto flex justify-between items-end">
                    <div className="text-white">
                      <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        {pageState.event.title}
                      </h1>
                      {pageState.event.short_description && (
                        <p className="text-lg text-gray-200 max-w-3xl">
                          {pageState.event.short_description}
                        </p>
                      )}
                    </div>
                    {user && (
                      <FavoriteButton
                        eventId={pageState.event.id}
                        isFavorite={isFavoriteEvent(pageState.event.id)}
                        onToggle={() => toggleFavoriteEvent(pageState.event.id)}
                        loading={favLoading}
                        className="bg-white/20 backdrop-blur-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Контент */}
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Основная информация */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Информация о мероприятии */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
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
                            {formatRussianDate(pageState.event.start_at)}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {formatTimeFromTimestamp(pageState.event.start_at)} - {formatTimeFromTimestamp(pageState.event.end_at)}
                          </p>
                        </div>
                      </div>

                      {/* Место проведения */}
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                          {pageState.event.location_type === 'online' ? (
                            <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {pageState.event.location_type === 'online' ? 'Онлайн' : pageState.event.venue_name || 'Место проведения уточняется'}
                          </p>
                          {pageState.event.location_type === 'offline' && pageState.event.address && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              {pageState.event.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Описание */}
                  {pageState.event.description && (
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Описание
                      </h2>
                      <div 
                        className="prose prose-lg max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: pageState.event.description }}
                      />
                    </div>
                  )}

                  {/* Галерея */}
                  {eventImages.length > 1 && (
                    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Галерея
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {eventImages.slice(1).map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`${pageState.event.title} - изображение ${index + 2}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openGallery(index + 1)}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Боковая панель */}
                <div className="space-y-6">
                  {/* Карточка регистрации */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 sticky top-24">
                    <div className="text-center">
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                          {pageState.event.payment_type === 'free' ? 'Бесплатно' : 
                           `${pageState.event.base_price?.toLocaleString()} ${pageState.event.currency || 'RUB'}`}
                        </span>
                      </div>
                      
                      <button
                        onClick={openRegistration}
                        className="w-full btn-primary text-lg py-3 mb-4"
                      >
                        Зарегистрироваться
                      </button>
                      
                      {pageState.event.registrations_count !== undefined && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          <Users className="h-4 w-4 inline mr-1" />
                          {pageState.event.registrations_count} участников
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Детали
                    </h3>
                    <div className="space-y-3 text-sm">
                      {pageState.event.event_type && (
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Тип:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {pageState.event.event_type}
                          </span>
                        </div>
                      )}
                      
                      {pageState.event.language_code && (
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Язык:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {pageState.event.language_code === 'ru' ? 'Русский' : 
                             pageState.event.language_code === 'en' ? 'Английский' : 
                             pageState.event.language_code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Модальные окна */}
            {pageState.isRegistering && (
              <RegistrationModal
                event={pageState.event}
                isOpen={pageState.isRegistering}
                onClose={closeRegistration}
              />
            )}

            {/* Галерея в полноэкранном режиме */}
            {pageState.showGallery && (
              <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                <button
                  onClick={closeGallery}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                >
                  <X className="h-8 w-8" />
                </button>
                
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                
                <img
                  src={eventImages[pageState.selectedImage]}
                  alt={`${pageState.event.title} - изображение ${pageState.selectedImage + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
                  {pageState.selectedImage + 1} / {eventImages.length}
                </div>
              </div>
            )}
          </div>
        )}
      </UnifiedLoadingPageWrapper>
    </Layout>
  );
};

export default EventDetailsPage;
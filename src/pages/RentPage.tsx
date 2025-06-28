import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Clock, MapPin, Users, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import BookingForm from '../components/rent/BookingForm';
import { Link } from 'react-router-dom';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type PriceItem = {
  id: string;
  name: string;
  price: number;
  duration: string;
  description?: string;
};

type RentInfoSettings = {
  id: number;
  title: string;
  description: string;
  photos: string[] | null;
  amenities: string[] | null;
  pricelist: PriceItem[];
  contacts: {
    address: string;
    phone: string;
    email: string;
    map_link?: string;
  };
  main_prices: {
    hourly: number;
    daily: number;
  };
  included_services: string[];
};

// Компонент модального окна для просмотра фото
const PhotoModal = ({ isOpen, onClose, photos, currentIndex, onNavigate }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate('prev');
      if (e.key === 'ArrowRight') onNavigate('next');
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onClose, onNavigate]);

  if (!isOpen || !photos?.length) return null;

  const currentPhoto = photos[currentIndex];
  const photoUrl = currentPhoto?.startsWith('http') 
    ? currentPhoto 
    : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${currentPhoto}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
        aria-label="Закрыть"
      >
        ×
      </button>

      {/* Навигация */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            aria-label="Следующее фото"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Изображение */}
      <div className="max-w-full max-h-full flex items-center justify-center">
        <img
          src={photoUrl}
          alt={`Фото ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Счетчик */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-lg">
        {currentIndex + 1} из {photos.length}
      </div>

      {/* Клик по фону для закрытия */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
};

// Компонент слайдшоу фотографий
const PhotoSlideshow = ({ photos, title }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  useEffect(() => {
    if (!isAutoPlaying || !photos?.length) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, photos?.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % photos.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + photos.length) % photos.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const openModal = (index) => {
    setModalIndex(index);
    setIsModalOpen(true);
    setIsAutoPlaying(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setIsAutoPlaying(true), 1000);
  };

  const navigateModal = (direction) => {
    if (direction === 'next') {
      setModalIndex(prev => (prev + 1) % photos.length);
    } else {
      setModalIndex(prev => (prev - 1 + photos.length) % photos.length);
    }
  };

  if (!photos?.length) return null;

  return (
    <>
      <div className="relative h-64 md:h-96 w-full bg-gray-900 overflow-hidden">
        {/* Основное изображение */}
        <div 
          className="w-full h-full bg-cover bg-center transition-all duration-500 cursor-pointer"
          style={{ 
            backgroundImage: `url(${photos[currentSlide].startsWith('http') 
              ? photos[currentSlide] 
              : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photos[currentSlide]}`})`,
          }}
          onClick={() => openModal(currentSlide)}
        >
          {/* Градиент оверлей */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Контент слайда */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">
              {title}
            </h1>
            <p className="text-base md:text-xl opacity-90 mb-2">
              Аренда пространства для ваших мероприятий
            </p>
            <p className="text-sm md:text-lg opacity-75">
              Фото {currentSlide + 1} из {photos.length} • Нажмите для просмотра
            </p>
          </div>
        </div>

        {/* Навигационные стрелки */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm z-10"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm z-10"
              aria-label="Следующее фото"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Индикаторы слайдов */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Перейти к фото ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно */}
      <PhotoModal
        isOpen={isModalOpen}
        onClose={closeModal}
        photos={photos}
        currentIndex={modalIndex}
        onNavigate={navigateModal}
      />
    </>
  );
};

const getDurationIcon = (duration: string) => {
  switch (duration) {
    case 'hour':
      return <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
    case 'day':
      return <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
    case 'week':
      return <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
    case 'month':
      return <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
    default:
      return <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
  }
};

const getDurationLabel = (duration: string) => {
  switch (duration) {
    case 'hour':
      return 'час';
    case 'day':
      return 'день';
    case 'week':
      return 'неделя';
    case 'month':
      return 'месяц';
    default:
      return duration;
  }
};

const RentPage = () => {
  const [settings, setSettings] = useState<RentInfoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('rent_info_settings')
          .select('*')
          .single();

        if (error) throw error;
        setSettings(data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Не удалось загрузить информацию о пространстве');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container text-center py-12">
            Загрузка...
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !settings) {
    return (
      <Layout>
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container text-center py-12 text-red-600">
            {error || 'Данные не найдены'}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section - Слайдшоу фотографий вместо header */}
      {settings.photos && settings.photos.length > 0 && (
        <PhotoSlideshow 
          photos={settings.photos} 
          title={settings.title}
        />
      )}
      
      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
          {/* Description */}
          <div className="mb-12 bg-white dark:bg-dark-900 rounded-xl shadow-md p-6">
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: settings.description }}
            />
          </div>

          {/* Main pricing section */}
          {settings.main_prices && (
            <div className="mb-6 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <h2 className="text-2xl font-semibold text-center mb-6">Стоимость аренды</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="text-center p-4 bg-white dark:bg-dark-800 rounded-lg shadow-sm">
                  <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">Почасовая аренда</div>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {settings.main_prices.hourly} €<span className="text-base font-normal text-gray-500 dark:text-gray-400"> / час</span>
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-dark-800 rounded-lg shadow-sm">
                  <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">Дневная аренда</div>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {settings.main_prices.daily} €<span className="text-base font-normal text-gray-500 dark:text-gray-400"> / день</span>
                  </div>
                </div>
              </div>
              
              {/* Included services */}
              {settings.included_services && settings.included_services.length > 0 && (
                <div className="mt-8 max-w-2xl mx-auto">
                  <h3 className="text-lg font-medium text-center mb-4">Включено в стоимость:</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
                    {settings.included_services.map((service, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Additional services */}
          {settings.pricelist && settings.pricelist.length > 0 && (
            <div className="mb-12 bg-white dark:bg-dark-900 rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Дополнительные услуги</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {settings.pricelist.map((item) => (
                    <div key={item.id} className="border dark:border-dark-700 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                          {getDurationIcon(item.duration)}
                        </div>
                        <h3 className="font-medium text-lg">{item.name}</h3>
                      </div>
                      {item.description && (
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          {item.description}
                        </p>
                      )}
                      <div className="text-2xl font-bold">
                        {item.price} €
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          {' '}/ {getDurationLabel(item.duration)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contacts */}
          {settings.contacts && (
            <div className="mb-12 bg-white dark:bg-dark-900 rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6">Контакты</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Адрес</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {settings.contacts.address}
                    </p>
                    {settings.contacts.map_link && (
                      <a
                        href={settings.contacts.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Посмотреть на карте
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                    <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Контакты</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {settings.contacts.phone}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {settings.contacts.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Form */}
          <div className="bg-white dark:bg-dark-900 rounded-xl shadow-md p-8 text-center">
            <BookingForm />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default RentPage;
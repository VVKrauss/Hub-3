// src/pages/CoworkingPage.tsx
// Обновленная версия для работы с новой схемой sh_site_settings

import { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { Phone, Mail, Clock, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getCoworkingPageSettings, 
  getActiveCoworkingServices, 
  type CoworkingService, 
  type CoworkingPageSettings 
} from '../api/coworking';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const CoworkingPage = () => {
  const [mainServices, setMainServices] = useState<CoworkingService[]>([]);
  const [additionalServices, setAdditionalServices] = useState<CoworkingService[]>([]);
  const [pageSettings, setPageSettings] = useState<CoworkingPageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<CoworkingService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    comment: ''
  });
  const [formErrors, setFormErrors] = useState({
    name: false,
    phone: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        
        console.log('🏢 Fetching coworking page data...');

        // Загружаем настройки страницы и услуги параллельно
        const [settingsResponse, servicesResponse] = await Promise.all([
          getCoworkingPageSettings(),
          getActiveCoworkingServices()
        ]);

        if (!isMountedRef.current) return;

        if (settingsResponse.error) {
          throw new Error(settingsResponse.error);
        }

        if (servicesResponse.error) {
          console.warn('Error loading services:', servicesResponse.error);
        }

        setPageSettings(settingsResponse.data);
        
        if (servicesResponse.data) {
          setMainServices(servicesResponse.data.mainServices || []);
          setAdditionalServices(servicesResponse.data.additionalServices || []);
        }

        console.log('✅ Coworking page data loaded successfully');
        
      } catch (err) {
        console.error('❌ Error fetching coworking data:', err);
        if (isMountedRef.current) {
          setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleBookClick = (service: CoworkingService) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setFormData({ name: '', contact: '', phone: '', comment: '' });
    setFormErrors({ name: false, phone: false });
    setSubmitStatus('idle');
  };

  const validateForm = () => {
    const errors = {
      name: !formData.name.trim(),
      phone: !formData.phone.trim()
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const message = `🏢 Новая заявка на коворкинг!\n\n` +
        `📝 Услуга: ${selectedService?.name}\n` +
        `👤 Имя: ${formData.name}\n` +
        `📞 Телефон: ${formData.phone}\n` +
        `📧 Контакт: ${formData.contact}\n` +
        `💬 Комментарий: ${formData.comment}\n\n` +
        `💰 Цена: ${selectedService?.price} ${getCurrencySymbol(selectedService?.currency)} / ${selectedService?.period}`;

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitStatus('success');
      toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
      
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ name: '', contact: '', phone: '', comment: '' });
        setSubmitStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Error sending booking request:', error);
      setSubmitStatus('error');
      toast.error('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrencySymbol = (currency?: string) => {
    switch (currency) {
      case 'euro': return '€';
      case 'кофе': return '☕';
      case 'RSD': return 'RSD';
      default: return currency || '€';
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Загрузка..." description="Загружаем данные о коворкинге" />
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container">
            <div className="animate-pulse space-y-4 py-12">
              <div className="h-8 w-64 bg-gray-200 dark:bg-dark-700 rounded"></div>
              <div className="h-12 bg-gray-200 dark:bg-dark-700 rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 dark:bg-dark-700 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PageHeader title="Ошибка" description="Не удалось загрузить данные" />
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {pageSettings && (
        <PageHeader 
          title={pageSettings.title} 
          description={pageSettings.description}
          backgroundImage={pageSettings.heroImage}
        />
      )}
      
      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
          
          {/* Контактная информация */}
          {pageSettings && (pageSettings.address || pageSettings.phone || pageSettings.working_hours) && (
            <div className="mb-12 bg-white dark:bg-dark-700 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                Как нас найти
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pageSettings.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Адрес</h3>
                      <p className="text-gray-600 dark:text-gray-300">{pageSettings.address}</p>
                    </div>
                  </div>
                )}
                
                {pageSettings.phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Телефон</h3>
                      <p className="text-gray-600 dark:text-gray-300">{pageSettings.phone}</p>
                    </div>
                  </div>
                )}
                
                {pageSettings.working_hours && (
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Время работы</h3>
                      <p className="text-gray-600 dark:text-gray-300">{pageSettings.working_hours}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Дополнительные контакты */}
              {(pageSettings.email || pageSettings.telegram) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-wrap gap-4 justify-center">
                    {pageSettings.email && (
                      <a 
                        href={`mailto:${pageSettings.email}`}
                        className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Mail className="h-4 w-4" />
                        <span>{pageSettings.email}</span>
                      </a>
                    )}
                    
                    {pageSettings.telegram && (
                      <a 
                        href={`https://t.me/${pageSettings.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{pageSettings.telegram}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Основные услуги */}
          <div className="mb-16">
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8 text-center">
              Наши услуги
            </h2>
            
            {mainServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  В данный момент нет доступных услуг. Пожалуйста, проверьте позже.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {mainServices.map((service) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onBookClick={() => handleBookClick(service)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Дополнительные услуги */}
          {additionalServices.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8 text-center">
                Дополнительные услуги
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {additionalServices.map((service) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onBookClick={() => handleBookClick(service)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно бронирования */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Бронирование: {selectedService?.name}
          </h2>
          
          {submitStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Заявка отправлена!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Мы свяжемся с вами в ближайшее время для подтверждения бронирования.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                  }`}
                  placeholder="Введите ваше имя"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">Имя обязательно</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white ${
                    formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                  }`}
                  placeholder="+381 XX XXX XXXX"
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">Телефон обязателен</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email или Telegram (необязательно)
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="email@example.com или @telegram"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Комментарий
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Дополнительные пожелания или вопросы"
                />
              </div>

              {selectedService && (
                <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Выбранная услуга:</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedService.name}</p>
                  <p className="text-primary-600 dark:text-primary-400 font-semibold">
                    {selectedService.price} {getCurrencySymbol(selectedService.currency)} / {selectedService.period}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                </button>
              </div>
              
              {submitStatus === 'error' && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  Произошла ошибка при отправке. Пожалуйста, попробуйте позже.
                </div>
              )}
            </form>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

// Компонент карточки услуги
const ServiceCard = ({ 
  service, 
  onBookClick 
}: { 
  service: CoworkingService;
  onBookClick: () => void;
}) => {
  const getCurrencySymbol = () => {
    switch (service.currency) {
      case 'euro': return '€';
      case 'кофе': return '☕';
      case 'RSD': return 'RSD';
      default: return service.currency;
    }
  };

  const getPeriodText = () => {
    switch (service.period) {
      case 'час': return 'час';
      case 'день': return 'день';
      case 'месяц': return 'месяц';
      default: return service.period;
    }
  };

  const getImageUrl = () => {
    if (!service.image_url) {
      return `https://via.placeholder.com/400x200?text=${encodeURIComponent(service.name)}`;
    }
    
    // Если это полный URL, возвращаем как есть
    if (service.image_url.startsWith('http')) {
      return service.image_url;
    }
    
    // Если это путь в Supabase Storage
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`;
  };

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      <div className="h-48 overflow-hidden">
        <img 
          src={getImageUrl()}
          alt={service.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback при ошибке загрузки изображения
            e.currentTarget.src = `https://via.placeholder.com/400x200?text=${encodeURIComponent(service.name)}`;
          }}
        />
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {service.name}
          </h3>
          <div 
            className="text-gray-600 dark:text-gray-300 mb-4 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          <div>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {service.price} {getCurrencySymbol()}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              / {getPeriodText()}
            </span>
          </div>
          <button 
            onClick={onBookClick}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoworkingPage;
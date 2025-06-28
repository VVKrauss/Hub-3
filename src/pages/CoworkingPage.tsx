import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal'; // Предполагается, что у вас есть компонент Modal

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

type CoworkingService = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе';
  period: 'час' | 'день' | 'месяц';
  active: boolean;
  image_url: string;
  main_service: boolean;
};

type CoworkingHeader = {
  id: string;
  title: string;
  description: string;
  address: string;
  phone: string;
  work_hours_weekdays: string;
  work_hours_weekends: string;
  working_hours: string;
};

const CoworkingPage = () => {
  const [mainServices, setMainServices] = useState<CoworkingService[]>([]);
  const [additionalServices, setAdditionalServices] = useState<CoworkingService[]>([]);
  const [headerData, setHeaderData] = useState<CoworkingHeader | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [headerResponse, servicesResponse] = await Promise.all([
          supabase
            .from('coworking_header')
            .select('*')
            .single(),
          supabase
            .from('coworking_info_table')
            .select('*')
            .eq('active', true)
        ]);

        if (!isMounted) return;

        if (headerResponse.error) throw headerResponse.error;
        if (servicesResponse.error) throw servicesResponse.error;

        setHeaderData(headerResponse.data);
        
        // Разделяем услуги на основные и дополнительные
        const main = servicesResponse.data?.filter(service => service.main_service) || [];
        const additional = servicesResponse.data?.filter(service => !service.main_service) || [];
        
        setMainServices(main);
        setAdditionalServices(additional);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Превышено время ожидания загрузки данных');
        setLoading(false);
      }
    }, 10000);

    fetchData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleBookClick = (service: CoworkingService) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setSubmitStatus('idle');
    setFormData({
      name: '',
      contact: '',
      phone: '',
      comment: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Сбрасываем ошибку при изменении поля
    if (name === 'name' || name === 'phone') {
      setFormErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const validateForm = () => {
    const errors = {
      name: !formData.name.trim(),
      phone: !formData.phone.trim()
    };
    
    setFormErrors(errors);
    return !errors.name && !errors.phone;
  };

  const sendTelegramNotification = async () => {
    const message = `Новая заявка на бронирование коворкинга:\n\n` +
      `Услуга: ${selectedService?.name}\n` +
      `Имя: ${formData.name}\n` +
      `Контакт: ${formData.contact || 'не указано'}\n` +
      `Телефон: ${formData.phone}\n` +
      `Комментарий: ${formData.comment || 'нет комментария'}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка при отправке уведомления');
      }
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await sendTelegramNotification();
      setSubmitStatus('success');
      // Очищаем форму через 2 секунды после успешной отправки
      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Загрузка...\" description="Загружаем данные о коворкинге" />
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

  return (
    <Layout>
      {headerData && (
        <PageHeader 
          title={headerData.title} 
          description={headerData.description}
        />
      )}
      
      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
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

          {/* Контактная информация */}
          {headerData && (
            <div className="bg-white dark:bg-dark-700 rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                Контакты
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Адрес</h3>
                  <div 
                    className="text-gray-600 dark:text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: headerData.address }} 
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Телефон</h3>
                  <div 
                    className="text-gray-600 dark:text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: headerData.phone }} 
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Часы работы</h3>
                  <div 
                    className="text-gray-600 dark:text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: headerData.working_hours }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно бронирования */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Бронирование: {selectedService?.name}
          </h2>
          
          {submitStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Заявка отправлена!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Мы свяжемся с вами в ближайшее время.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ваше имя <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'} bg-white dark:bg-dark-800`}
                    placeholder="Иван Иванов"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-500">Это поле обязательно для заполнения</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Контакт (соцсеть или почта)
                  </label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                    placeholder="telegram: @username или email@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg ${formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'} bg-white dark:bg-dark-800`}
                    placeholder="+7 (123) 456-78-90"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-500">Это поле обязательно для заполнения</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Комментарий
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                    rows={3}
                    placeholder="Напишите, когда бы вам хотелось у нас поработать"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
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

// Обновленный компонент карточки услуги
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

  return (
    <div className="bg-white dark:bg-dark-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      {service.image_url && (
        <div className="h-48 overflow-hidden">
          <img 
            src={service.image_url} 
            alt={service.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
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
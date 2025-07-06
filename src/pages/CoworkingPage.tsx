// src/pages/CoworkingPage.tsx - НОВАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Clock, Wifi, Coffee, Monitor, Car, Shield } from 'lucide-react';
import Layout from '../components/Layout';
import { getCoworkingPageSettings, checkLegacyCoworkingData, type CoworkingPageSettings } from '../api/coworking';
import { migrateLegacyCoworkingData } from '../utils/coworkingMigration';
import { toast } from 'react-hot-toast';

interface Feature {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const CoworkingPage: React.FC = () => {
  const [pageSettings, setPageSettings] = useState<CoworkingPageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  const features: Feature[] = [
    {
      icon: Wifi,
      title: 'Высокоскоростной интернет',
      description: 'Стабильное подключение для продуктивной работы'
    },
    {
      icon: Coffee,
      title: 'Кофе и напитки',
      description: 'Бесплатный кофе и чай в течение дня'
    },
    {
      icon: Monitor,
      title: 'Современное оборудование',
      description: 'Мониторы, принтеры и другая техника'
    },
    {
      icon: Car,
      title: 'Парковка',
      description: 'Удобная парковка рядом с центром'
    },
    {
      icon: Shield,
      title: 'Безопасность',
      description: '24/7 видеонаблюдение и контроль доступа'
    }
  ];

  useEffect(() => {
    loadCoworkingData();
  }, []);

  const loadCoworkingData = async () => {
    try {
      setLoading(true);

      // Сначала пытаемся загрузить данные из новой схемы
      const newSettings = await getCoworkingPageSettings();

      if (newSettings) {
        setPageSettings(newSettings);
      } else {
        // Если данных нет в новой схеме, проверяем старую
        const legacyCheck = await checkLegacyCoworkingData();
        
        if (legacyCheck.hasLegacyHeader || legacyCheck.hasLegacyServices) {
          setShowMigrationPrompt(true);
        } else {
          // Устанавливаем дефолтные данные
          setPageSettings({
            header: {
              title: 'Коворкинг пространство',
              description: 'Комфортные рабочие места для исследователей и стартапов',
              address: 'Сараевская, 48',
              phone: '+381',
              working_hours: '10:00-18:00'
            },
            services: [],
            lastUpdated: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error loading coworking data:', error);
      toast.error('Ошибка при загрузке данных коворкинга');
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    try {
      setMigrating(true);
      const success = await migrateLegacyCoworkingData();
      
      if (success) {
        toast.success('Данные успешно перенесены!');
        setShowMigrationPrompt(false);
        // Перезагружаем данные
        await loadCoworkingData();
      } else {
        toast.error('Ошибка при переносе данных');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Ошибка при переносе данных');
    } finally {
      setMigrating(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    switch (currency) {
      case 'euro':
        return `€${price}`;
      case 'RSD':
        return `${price} RSD`;
      case 'кофе':
        return `${price} кофе`;
      default:
        return `${price} ${currency}`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (showMigrationPrompt) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
          <div className="max-w-md mx-auto bg-white dark:bg-dark-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Обновление системы
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Обнаружены данные в старом формате. Необходимо выполнить миграцию для корректного отображения страницы коворкинга.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleMigration}
                disabled={migrating}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {migrating ? 'Переношу...' : 'Перенести данные'}
              </button>
              <button
                onClick={() => setShowMigrationPrompt(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Пропустить
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!pageSettings) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Данные не найдены
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Настройки коворкинга не найдены. Обратитесь к администратору.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const { header, services } = pageSettings;
  const activeServices = services.filter(service => service.active);

  return (
    <Layout>
      <Helmet>
        <title>{header.title} | Research Center</title>
        <meta name="description" content={header.description} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-800 dark:to-dark-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-6 font-heading">
              {header.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {header.description}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      {(header.address || header.phone || header.working_hours) && (
        <section className="py-16 bg-white dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {header.address && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Адрес</h3>
                    <p className="text-gray-600 dark:text-gray-300">{header.address}</p>
                  </div>
                </div>
              )}

              {header.phone && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Телефон</h3>
                    <p className="text-gray-600 dark:text-gray-300">{header.phone}</p>
                  </div>
                </div>
              )}

              {header.working_hours && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Часы работы</h3>
                    <p className="text-gray-600 dark:text-gray-300">{header.working_hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
              Что мы предлагаем
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Все необходимое для продуктивной работы в комфортной обстановке
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-dark-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services & Pricing */}
      {activeServices.length > 0 && (
        <section className="py-20 bg-white dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
                Тарифы и услуги
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Выберите подходящий план для вашей работы
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeServices
                .sort((a, b) => a.order - b.order)
                .map((service) => (
                  <div 
                    key={service.id} 
                    className={`relative bg-gradient-to-br ${
                      service.main_service 
                        ? 'from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700' 
                        : 'from-gray-50 to-white dark:from-dark-800 dark:to-dark-700 border border-gray-200 dark:border-gray-600'
                    } rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300`}
                  >
                    {service.main_service && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                          Популярный
                        </span>
                      </div>
                    )}

                    {service.image_url && (
                      <div className="mb-6 rounded-lg overflow-hidden">
                        <img 
                          src={service.image_url} 
                          alt={service.name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {service.name}
                      </h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                          {formatPrice(service.price, service.currency)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 ml-2">
                          / {service.period}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                        {service.description}
                      </p>
                      <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                        service.main_service
                          ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700'
                          : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                      }`}>
                        Забронировать
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-heading">
            Готовы начать работу?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Свяжитесь с нами для бронирования рабочего места или получения дополнительной информации
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
              Забронировать место
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors">
              Связаться с нами
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CoworkingPage;
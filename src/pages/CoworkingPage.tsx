// src/pages/CoworkingPage.tsx - Читает данные из старой таблицы
import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Wifi, Coffee, Monitor, Car, Shield, Printer, FileText } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';

interface CoworkingService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц' | 'Страница';
  active: boolean;
  image_url?: string;
  order: number;
  main_service: boolean;
}

interface CoworkingHeader {
  title: string;
  description: string;
  address?: string;
  phone?: string;
  working_hours?: string;
}

interface Feature {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const CoworkingPage: React.FC = () => {
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [headerData, setHeaderData] = useState<CoworkingHeader>({
    title: 'Коворкинг пространство',
    description: 'Комфортные рабочие места для исследователей и стартапов',
    address: 'Сараевская, 48',
    phone: '+381',
    working_hours: '10:00-18:00'
  });
  const [loading, setLoading] = useState(true);

  const features: Feature[] = [
    {
      icon: Wifi,
      title: 'Высокоскоростной интернет',
      description: 'Стабильное подключение для продуктивной работы'
    },
    {
      icon: Coffee,
      title: 'Кофе и напитки',
      description: 'Кофе, чай и сезонные напитки'
    },
    {
      icon: Monitor,
      title: 'Рабочие места',
      description: 'Удобные места с розетками рядом'
    },
    {
      icon: Printer,
      title: 'МФУ',
      description: 'Печать, сканирование, копирование'
    },
    {
      icon: FileText,
      title: 'Офисные услуги',
      description: 'Все необходимое для работы'
    },
    {
      icon: Shield,
      title: 'Безопасность',
      description: 'Комфортная и безопасная атмосфера'
    }
  ];

  useEffect(() => {
    loadCoworkingData();
  }, []);

  const loadCoworkingData = async () => {
    try {
      setLoading(true);

      // Загружаем заголовок из старой схемы (site_settings)
      const { data: headerResponse, error: headerError } = await supabase
        .from('site_settings')
        .select('coworking_header_settings')
        .order('id')
        .limit(1)
        .single();

      if (!headerError && headerResponse?.coworking_header_settings) {
        const oldHeader = headerResponse.coworking_header_settings;
        setHeaderData({
          title: oldHeader.title || 'Коворкинг пространство',
          description: oldHeader.description || 'Комфортные рабочие места для исследователей и стартапов',
          address: oldHeader.address || 'Сараевская, 48',
          phone: oldHeader.phone || '+381',
          working_hours: oldHeader.working_hours || '10:00-18:00'
        });
      }

      // Загружаем услуги из старой таблицы coworking_info_table
      const { data: servicesResponse, error: servicesError } = await supabase
        .from('coworking_info_table')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true });

      if (!servicesError && servicesResponse) {
        setServices(servicesResponse);
      }

    } catch (error) {
      console.error('Error loading coworking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    switch (currency) {
      case 'euro':
        return `€${price}`;
      case 'RSD':
        return `${price} RSD`;
      case 'кофе':
        return price === 1 ? 'За кофе' : `${price} кофе`;
      default:
        return `${price} ${currency}`;
    }
  };

  const formatPeriod = (period: string) => {
    switch (period) {
      case 'Страница':
        return 'за страницу';
      default:
        return `/ ${period}`;
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

  // Разделяем услуги на основные и дополнительные
  const mainServices = services.filter(service => service.main_service).sort((a, b) => a.order - b.order);
  const additionalServices = services.filter(service => !service.main_service).sort((a, b) => a.order - b.order);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-800 dark:to-dark-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-6 font-heading">
              {headerData.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {headerData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      {(headerData.address || headerData.phone || headerData.working_hours) && (
        <section className="py-16 bg-white dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {headerData.address && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Адрес</h3>
                    <p className="text-gray-600 dark:text-gray-300">{headerData.address}</p>
                  </div>
                </div>
              )}

              {headerData.phone && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Телефон</h3>
                    <p className="text-gray-600 dark:text-gray-300">{headerData.phone}</p>
                  </div>
                </div>
              )}

              {headerData.working_hours && (
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Часы работы</h3>
                    <p className="text-gray-600 dark:text-gray-300">{headerData.working_hours}</p>
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

      {/* Main Services & Pricing */}
      {mainServices.length > 0 && (
        <section className="py-20 bg-white dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
                Основные тарифы
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Выберите подходящий план для вашей работы
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mainServices.map((service, index) => (
                <div 
                  key={service.id} 
                  className={`relative bg-gradient-to-br ${
                    index === 1 // Средний тариф как популярный
                      ? 'from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700' 
                      : 'from-gray-50 to-white dark:from-dark-800 dark:to-dark-700 border border-gray-200 dark:border-gray-600'
                  } rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  {index === 1 && (
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
                        {formatPeriod(service.period)}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8 text-left">
                      {service.description.split(' | ').map((line, i) => (
                        <div key={i} className="mb-2 flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                    </div>
                    <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      index === 1
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

      {/* Additional Services */}
      {additionalServices.length > 0 && (
        <section className="py-20 bg-gray-50 dark:bg-dark-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
                Дополнительные услуги
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Офисные услуги для вашего удобства
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {additionalServices.map((service) => (
                <div 
                  key={service.id} 
                  className="bg-white dark:bg-dark-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
                >
                  {service.image_url && (
                    <div className="mb-6 rounded-lg overflow-hidden">
                      <img 
                        src={service.image_url} 
                        alt={service.name}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {service.name}
                    </h3>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice(service.price, service.currency)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-2">
                        {formatPeriod(service.period)}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 text-left">
                      {service.description.split(' | ').map((line, i) => (
                        <div key={i} className="mb-1 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{line.trim()}</span>
                        </div>
                      ))}
                    </div>
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
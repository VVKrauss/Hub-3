// src/pages/CoworkingPage.tsx - ФИНАЛЬНАЯ ПРОСТАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';
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

const CoworkingPage: React.FC = () => {
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const loadServices = async () => {
      try {
        if (!isMountedRef.current) return;
        
        const { data, error } = await supabase
          .from('coworking_info_table')
          .select('*')
          .eq('active', true)
          .order('order', { ascending: true });

        if (!isMountedRef.current) return;

        if (!error && data) {
          setServices(data);
        }
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Пустой массив зависимостей - загружаем только один раз

  const formatPrice = (price: number, currency: string) => {
    switch (currency) {
      case 'euro': return `€${price}`;
      case 'RSD': return `${price} RSD`;
      case 'кофе': return price === 1 ? 'За кофе' : `${price} кофе`;
      default: return `${price} ${currency}`;
    }
  };

  const formatPeriod = (period: string) => {
    return period === 'Страница' ? 'за страницу' : `/ ${period}`;
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

  const mainServices = services.filter(s => s.main_service).sort((a, b) => a.order - b.order);
  const additionalServices = services.filter(s => !s.main_service).sort((a, b) => a.order - b.order);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-800 dark:to-dark-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-6">
            Коворкинг пространство
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Комфортные рабочие места для исследователей и стартапов
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 bg-white dark:bg-dark-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Адрес</h3>
                <p className="text-gray-600 dark:text-gray-300">Сараевская, 48</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Телефон</h3>
                <p className="text-gray-600 dark:text-gray-300">+381</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Часы работы</h3>
                <p className="text-gray-600 dark:text-gray-300">10:00-18:00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Services */}
      {mainServices.length > 0 && (
        <section className="py-20 bg-gray-50 dark:bg-dark-900">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Основные тарифы
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Выберите подходящий план для работы
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {mainServices.map((service, index) => (
                <div key={service.id} className={`bg-white dark:bg-dark-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 relative ${
                  index === 1 ? 'border-2 border-primary-200 dark:border-primary-700' : 'border border-gray-200 dark:border-gray-700'
                }`}>
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
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
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
                    <div className="text-gray-600 dark:text-gray-300 mb-8 text-left">
                      {service.description.split(' | ').map((line, i) => (
                        <div key={i} className="mb-2 flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{line.trim()}</span>
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
        <section className="py-20 bg-white dark:bg-dark-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Дополнительные услуги
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Офисные услуги для вашего удобства
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
              {additionalServices.map((service) => (
                <div key={service.id} className="bg-gray-50 dark:bg-dark-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600">
                  {service.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={service.image_url} 
                        alt={service.name} 
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                      {service.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice(service.price, service.currency)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-1">
                        {formatPeriod(service.period)}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-sm text-left">
                      {service.description.split(' | ').map((line, i) => (
                        <div key={i} className="mb-1 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>{line.trim()}</span>
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
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
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
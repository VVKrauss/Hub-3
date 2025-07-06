import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('coworking_info_table')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true });

      if (!error && data) {
        setServices(data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <MapPin className="w-8 h-8 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Адрес</h3>
                <p className="text-gray-600 dark:text-gray-300">Сараевская, 48</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Phone className="w-8 h-8 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Телефон</h3>
                <p className="text-gray-600 dark:text-gray-300">+381</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-primary-600" />
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
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Основные тарифы
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {mainServices.map((service, index) => (
                <div key={service.id} className={`bg-white dark:bg-dark-800 rounded-2xl p-8 shadow-lg relative ${
                  index === 1 ? 'border-2 border-primary-500' : 'border border-gray-200 dark:border-gray-700'
                }`}>
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                        Популярный
                      </span>
                    </div>
                  )}
                  
                  {service.image_url && (
                    <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover rounded-lg mb-6" />
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{service.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-primary-600">
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
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                    </div>
                    <button className={`w-full py-3 px-6 rounded-lg font-semibold ${
                      index === 1 
                        ? 'bg-primary-600 text-white hover:bg-primary-700' 
                        : 'bg-gray-900 text-white hover:bg-gray-800'
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
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Дополнительные услуги
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {additionalServices.map((service) => (
                <div key={service.id} className="bg-gray-50 dark:bg-dark-700 rounded-xl p-6 shadow-lg">
                  {service.image_url && (
                    <img src={service.image_url} alt={service.name} className="w-full h-32 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{service.name}</h3>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-primary-600">
                      {formatPrice(service.price, service.currency)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 ml-2">
                      {formatPeriod(service.period)}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">
                    {service.description.split(' | ').map((line, i) => (
                      <div key={i} className="mb-1">{line.trim()}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default CoworkingPage;
// src/components/home/RentSection.tsx - ВЕРСИЯ с равной высотой контейнеров
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type RentSectionData = {
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  order: number;
};

const RentSection = () => {
  const [data, setData] = useState<RentSectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchRentData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🚀 Fetching rent section data...');
        const { data: settings, error } = await supabase
          .from('site_settings')
          .select('rent_selection')
          .single();

        if (!isMountedRef.current) return;

        if (error) {
          console.log('No rent settings found, hiding section');
          return;
        }

        if (settings?.rent_selection) {
          setData(settings.rent_selection);
          console.log('✅ Rent section data loaded');
        }
      } catch (err) {
        console.error('❌ Error fetching rent section data:', err);
        if (isMountedRef.current) {
          setError('Не удалось загрузить данные');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchRentData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="section bg-gray-50 dark:bg-dark-800 min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section bg-gray-50 dark:bg-dark-800 min-h-[400px] flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!data || !data.enabled) {
    return null;
  }

  return (
    <section className="section bg-gray-50 dark:bg-dark-800">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* 🎯 СЕТКА с одинаковой высотой контейнеров - изображение слева */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* 🎯 Контейнер изображения - кадрируется под высоту текста - СЛЕВА */}
          <div className="w-full rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-700 order-2 md:order-1">
            <img 
              src={getSupabaseImageUrl(data.image)}
              alt={data.title}
              className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </div>
          
          {/* Текстовый контент - естественная высота БЕЗ растягивания - СПРАВА */}
          <div className="order-1 md:order-2">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {data.title}
            </h3>
            <div 
              className="text-base text-gray-600 dark:text-gray-300 space-y-4 mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
            <Link 
              to="/rent" 
              className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium text-lg"
            >
              Узнать больше
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default RentSection;
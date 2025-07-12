// src/components/home/CoworkingSection.tsx - ВЕРСИЯ с равной высотой контейнеров
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type CoworkingSectionData = {
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  order: number;
};

const CoworkingSection = () => {
  const [data, setData] = useState<CoworkingSectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchCoworkingData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🚀 Fetching coworking section data...');
        const { data: settings, error } = await supabase
          .from('site_settings')
          .select('coworking_selection')
          .single();

        if (!isMountedRef.current) return;

        if (error) {
          console.log('No coworking settings found, hiding section');
          return;
        }

        if (settings?.coworking_selection) {
          setData(settings.coworking_selection);
          console.log('✅ Coworking section data loaded');
        }
      } catch (err) {
        console.error('❌ Error fetching coworking section data:', err);
        if (isMountedRef.current) {
          setError('Не удалось загрузить данные');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchCoworkingData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="section bg-white dark:bg-dark-900 min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section bg-white dark:bg-dark-900 min-h-[400px] flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!data || !data.enabled) {
    return null;
  }

  return (
    <section className="section bg-white dark:bg-dark-900">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* 🎯 СЕТКА - текст слева, изображение справа */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Текстовый контент */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {data.title}
            </h3>
            <div 
              className="text-base text-gray-600 dark:text-gray-300 space-y-4 mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
            <Link 
              to="/coworking" 
              className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium text-lg"
            >
              Занять место
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          
          {/* 🎯 Контейнер изображения с ФИКСИРОВАННОЙ высотой */}
          <div className="h-80 w-full rounded-lg overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
            <img 
              src={getSupabaseImageUrl(data.image)}
              alt={data.title}
              className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default CoworkingSection;
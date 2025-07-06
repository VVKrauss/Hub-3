

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

  // ИСПРАВЛЕННАЯ ВЕРСИЯ - только один раз загружаем данные
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
        console.error('❌ Error fetching Rent section data:', err);
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
  }, []); // КРИТИЧНО: пустой массив зависимостей

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
      <div className="container grid-layout items-center">
        <div className="text-content">
          <h3 className="mb-6">{data.title}</h3>
          <div 
            className="text-base space-y-4 mb-8"
            dangerouslySetInnerHTML={{ __html: data.description }} 
          />
          <Link 
            to="/rent" 
            className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Узнать больше
            <ArrowRight className="ml-2" />
          </Link>
        </div>
        <div className="image-content mt-8 md:mt-0">
          <img 
            src={getSupabaseImageUrl(data.image)} 
            alt={data.title} 
            className="w-full h-auto rounded-lg shadow-md"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default RentSection;
// src/components/home/CoworkingSection.tsx
// ИСПРАВЛЕННАЯ ВЕРСИЯ - устранение бесконечных циклов

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
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ ВЕРСИЯ - только один раз загружаем данные
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

        // Проверяем наличие данных в поле coworking_selection
        if (settings?.coworking_selection) {
          setData(settings.coworking_selection);
          console.log('✅ Coworking section data loaded');
        }
      } catch (error) {
        console.error('❌ Error fetching Coworking section data:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchCoworkingData();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей

  if (loading) {
    return (
      <div className="section bg-white dark:bg-dark-900 min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse">Загрузка...</div>
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
            to="/coworking" 
            className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Занять место
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

export default CoworkingSection;
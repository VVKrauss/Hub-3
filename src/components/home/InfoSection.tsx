import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type InfoSectionData = {
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  order: number;
};

const InfoSection = () => {
  const [data, setData] = useState<InfoSectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ ВЕРСИЯ - только один раз загружаем данные
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchInfoData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🚀 Fetching info section data...');
        const { data: settings, error } = await supabase
          .from('site_settings')
          .select('info_section')
          .single();

        if (!isMountedRef.current) return;

        if (error) {
          console.log('No info settings found, hiding section');
          return;
        }

        if (settings?.info_section) {
          setData(settings.info_section);
          console.log('✅ Info section data loaded');
        }
      } catch (err) {
        console.error('❌ Error fetching info section data:', err);
        if (isMountedRef.current) {
          setError('Не удалось загрузить данные');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchInfoData();

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
      <div className="container grid-layout items-start">
        <div className="text-content">
          <h3 className="mb-6">{data.title}</h3>
          <div 
            className="text-base space-y-4 mb-8"
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
          <Link 
            to="/about" 
            className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Подробнее
            <ArrowRight className="ml-2" />
          </Link>
        </div>
        <div className="image-content mt-8 md:mt-0">
          <div className="w-full h-full rounded-lg overflow-hidden relative">
            <img 
              src={getSupabaseImageUrl(data.image)}
              alt={data.title}
              className="w-full h-full object-cover"
              loading="lazy"
              width="600"
              height="400"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;
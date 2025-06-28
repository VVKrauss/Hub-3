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
  const imageRef = useRef<HTMLImageElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchRentData = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('site_settings')
          .select('rent_selection')
          .single();

        if (!isMounted) return;

        if (error) throw error;

        if (settings?.rent_selection) {
          setData(settings.rent_selection);
        }
      } catch (err) {
        console.error('Error fetching Rent section data:', err);
        if (isMounted) setError('Не удалось загрузить данные');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRentData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!data?.image || !imageRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px',
      threshold: 0.1
    });

    observer.observe(imageRef.current);

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [data?.image]);

  // Ресайз обсервер для текстового блока
  useEffect(() => {
    if (!textBlockRef.current || !imageContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === textBlockRef.current) {
          imageContainerRef.current.style.height = `${entry.contentRect.height}px`;
        }
      }
    });

    resizeObserver.observe(textBlockRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  if (isLoading) {
    return <div className="section bg-white dark:bg-dark-900 min-h-[400px] flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return <div className="section bg-white dark:bg-dark-900 min-h-[400px] flex items-center justify-center text-red-500">{error}</div>;
  }

  if (!data || !data.enabled) {
    return null;
  }

  return (
    <section className="section bg-white dark:bg-dark-900">
      <div className="container grid-layout items-start">
        {/* Изображение теперь первое в DOM для мобильных устройств */}
        <div 
          className="image-content order-1 md:order-none mt-8 md:mt-0" 
          ref={imageContainerRef}
        >
          <div className="w-full h-full rounded-lg overflow-hidden relative">
            <img 
              ref={imageRef}
              data-src={getSupabaseImageUrl(data.image)}
              alt={data.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              width="600"
              height="400"
            />
          </div>
        </div>
        
        {/* Текстовый блок */}
        <div className="text-content order-2 md:order-none" ref={textBlockRef}>
          <h3 className="mb-6">{data.title}</h3>
          <div 
            className="text-base space-y-4 mb-8"
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
          <Link 
            to="/rent" 
            className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Забронировать
            <ArrowRight className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RentSection;
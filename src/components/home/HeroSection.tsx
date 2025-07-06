// src/components/home/HeroSection.tsx
// ИСПРАВЛЕННАЯ ВЕРСИЯ - убираем бесконечные циклы

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type HeaderStyle = 'centered' | 'slideshow';
type Slide = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
};

type HeaderData = {
  style: HeaderStyle;
  centered: {
    title: string;
    subtitle: string;
    logoLight: string;
    logoDark: string;
    logoSize?: number;
  };
  slideshow: {
    slides: Slide[];
    settings: {
      autoplaySpeed: number;
      transition: 'fade' | 'slide';
    };
  };
};

const defaultHeaderData: HeaderData = {
  style: 'centered',
  centered: {
    title: 'ScienceHub',
    subtitle: 'Место для научного сообщества',
    logoLight: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
    logoDark: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png',
    logoSize: 150
  },
  slideshow: {
    slides: [],
    settings: {
      autoplaySpeed: 5000,
      transition: 'fade'
    }
  }
};

interface HeroSectionProps {
  height?: number | string;
}

const HeroSection = ({ height = 400 }: HeroSectionProps) => {
  const [headerData, setHeaderData] = useState<HeaderData>(defaultHeaderData);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const sectionHeight = typeof height === 'number' ? `${height}px` : height;
  const logoHeight = headerData.centered.logoSize ? `${headerData.centered.logoSize}px` : '150px';

  // Мемоизированные функции навигации
  const goToSlide = useCallback((index: number) => {
    if (isMountedRef.current) {
      setCurrentSlide(index);
    }
  }, []);

  const goToNext = useCallback(() => {
    if (isMountedRef.current && headerData.slideshow.slides.length > 0) {
      setCurrentSlide(prev => (prev + 1) % headerData.slideshow.slides.length);
    }
  }, [headerData.slideshow.slides.length]);

  const goToPrev = useCallback(() => {
    if (isMountedRef.current && headerData.slideshow.slides.length > 0) {
      setCurrentSlide(prev => 
        prev === 0 ? headerData.slideshow.slides.length - 1 : prev - 1
      );
    }
  }, [headerData.slideshow.slides.length]);

  // Автопрокрутка слайдов - ИСПРАВЛЕННАЯ ВЕРСИЯ
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Запускаем автопрокрутку только если есть слайды и это slideshow режим
    if (headerData.style === 'slideshow' && headerData.slideshow.slides.length > 1) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setCurrentSlide(prev => (prev + 1) % headerData.slideshow.slides.length);
        }
      }, headerData.slideshow.settings.autoplaySpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [headerData.style, headerData.slideshow.slides.length, headerData.slideshow.settings.autoplaySpeed]);

  // Загрузка данных - ИСПРАВЛЕННАЯ ВЕРСИЯ
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchHeaderData = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setIsLoading(true);
        
        console.log('🚀 Fetching header settings...');
        const { data, error } = await supabase
          .from('site_settings')
          .select('header_settings')
          .single();

        if (!isMountedRef.current) return;

        if (error) {
          console.log('No header settings found, using defaults');
          return;
        }

        if (data?.header_settings) {
          console.log('✅ Header settings loaded');
          setHeaderData({
            ...defaultHeaderData,
            ...data.header_settings,
            slideshow: {
              ...defaultHeaderData.slideshow,
              ...data.header_settings.slideshow,
              settings: {
                ...defaultHeaderData.slideshow.settings,
                ...data.header_settings.slideshow?.settings
              }
            },
            centered: {
              ...defaultHeaderData.centered,
              ...data.header_settings.centered
            }
          });
        }
      } catch (error) {
        console.error('❌ Error fetching header settings:', error);
        if (isMountedRef.current) {
          setError('Не удалось загрузить данные заголовка');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchHeaderData();

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Пустой массив зависимостей - загружаем только один раз

  if (isLoading) {
    return (
      <section 
        className="relative flex items-center justify-center bg-gray-100 dark:bg-dark-800" 
        style={{ height: sectionHeight }}
      >
        <div className="text-center">Загрузка...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section 
        className="relative flex items-center justify-center bg-gray-100 dark:bg-dark-800" 
        style={{ height: sectionHeight }}
      >
        <div className="text-center text-red-500">{error}</div>
      </section>
    );
  }

  if (headerData.style === 'slideshow' && headerData.slideshow.slides.length > 0) {
    return (
      <section className="relative overflow-hidden" style={{ height: sectionHeight }}>
        <div className="relative h-full w-full">
          {/* Слайды */}
          <div className="flex h-full transition-transform duration-500" 
               style={{ 
                 transform: `translateX(-${currentSlide * 100}%)`,
                 width: `${headerData.slideshow.slides.length * 100}%`
               }}>
            {headerData.slideshow.slides.map((slide, index) => (
              <div 
                key={slide.id} 
                className="relative w-full h-full"
                style={{ flex: `0 0 ${100 / headerData.slideshow.slides.length}%` }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={getSupabaseImageUrl(slide.image)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/50" />
                </div>
                
                <div className="relative h-full flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center text-center px-4">
                    <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 max-w-2xl">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Навигационные точки */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {headerData.slideshow.slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Кнопки навигации */}
        {headerData.slideshow.slides.length > 1 && (
          <>
            <button 
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              aria-label="Previous slide"
            >
              <ArrowRight className="rotate-180" />
            </button>
            <button 
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              aria-label="Next slide"
            >
              <ArrowRight />
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <section 
      className="relative flex items-center justify-center bg-gray-50 dark:bg-dark-900" 
      style={{ height: sectionHeight }}
    >
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div 
          className="w-full flex items-center justify-center mb-8"
          style={{ height: logoHeight }}
        >
          <img 
            src={headerData.centered.logoLight}
            alt="ScienceHub Logo"
            className="h-full w-auto object-contain dark:hidden"
            loading="lazy"
            decoding="async"
          />
          <img 
            src={headerData.centered.logoDark}
            alt="ScienceHub Logo"
            className="h-full w-auto object-contain hidden dark:block"
            loading="lazy"
            decoding="async"
          />
        </div>
        
        <div className="text-center px-4 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {headerData.centered.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
            {headerData.centered.subtitle}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
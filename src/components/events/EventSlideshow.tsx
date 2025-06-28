import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { formatRussianDate, formatTimeRange, isValidDateString } from '../../utils/dateTimeUtils';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type Event = {
  id: string;
  title: string;
  short_description: string;
  start_at: string;
  end_at: string;
  location: string;
  bg_image: string;
  // Legacy fields for backward compatibility
  date?: string;
  start_time?: string;
  end_time?: string;
};

type EventSlideshowProps = {
  events: Event[];
  titleStyle?: React.CSSProperties;
  descriptionStyle?: React.CSSProperties;
  desktopTitleStyle?: React.CSSProperties;
  desktopDescriptionStyle?: React.CSSProperties;
  formatTimeRange?: (start: string, end: string) => string;
};

const EventSlideshow = ({ 
  events,
  titleStyle = {},
  descriptionStyle = {},
  desktopTitleStyle = {},
  desktopDescriptionStyle = {},
  formatTimeRange: customFormatTimeRange
}: EventSlideshowProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Безопасная функция форматирования даты
  const formatEventDate = (event: Event): string => {
    // Сначала пытаемся использовать start_at (новое поле)
    if (isValidDateString(event.start_at)) {
      try {
        return formatRussianDate(event.start_at, 'd MMMM');
      } catch (error) {
        console.error('Error formatting start_at:', event.start_at, error);
      }
    }
    
    // Fallback на legacy поле start_time
    if (isValidDateString(event.start_time)) {
      try {
        return formatRussianDate(event.start_time!, 'd MMMM');
      } catch (error) {
        console.error('Error formatting start_time:', event.start_time, error);
      }
    }
    
    // Fallback на legacy поле date
    if (isValidDateString(event.date)) {
      try {
        return formatRussianDate(event.date!, 'd MMMM');
      } catch (error) {
        console.error('Error formatting date:', event.date, error);
      }
    }
    
    return 'Дата не указана';
  };

  // Безопасная функция форматирования времени
  const formatEventTimeRange = (event: Event): string => {
    try {
      // Сначала пытаемся использовать start_at/end_at
      if (event.start_at && event.end_at) {
        if (customFormatTimeRange) {
          return customFormatTimeRange(event.start_at, event.end_at);
        }
        return formatTimeRange(event.start_at, event.end_at);
      }
      
      // Fallback на legacy поля
      if (event.start_time && event.end_time) {
        if (customFormatTimeRange) {
          return customFormatTimeRange(event.start_time, event.end_time);
        }
        return formatTimeRange(event.start_time, event.end_time);
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting time range:', error);
      return '';
    }
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    beforeChange: (_: number, next: number) => setCurrentSlide(next),
    customPaging: (i: number) => (
      <div
        className={`w-2 h-2 rounded-full transition-all duration-300 ${
          i === currentSlide 
            ? 'bg-white scale-125' 
            : 'bg-white/50 hover:bg-white/75'
        }`}
      />
    ),
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          arrows: false
        }
      }
    ]
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Слайдшоу */}
      <Slider {...settings} className="events-slideshow">
        {events.map((event, index) => {
          // Добавляем дополнительную проверку на каждое событие
          if (!event || !event.id) {
            console.warn('Invalid event data at index:', index, event);
            return null;
          }
          
          return (
            <div key={event.id} className="relative h-[300px] sm:h-[400px] md:h-[500px]">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${getSupabaseImageUrl(event.bg_image)})`,
                  backgroundPosition: 'center 30%'
                }}
              >
                <div className="absolute inset-0 bg-black/50" />
              </div>
              
              {/* Контент на изображении */}
              <div className="relative h-full flex items-center">
                <div className="container px-4 sm:px-6">
                  {/* Десктопная версия (вся информация) */}
                  <div className="hidden md:block max-w-2xl text-white">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4" style={desktopTitleStyle}>
                      {event.title || 'Название не указано'}
                    </h2>
                    <p className="text-base md:text-lg mb-6 line-clamp-2" style={desktopDescriptionStyle}>
                      {event.short_description || 'Описание отсутствует'}
                    </p>
                    <div className="flex flex-row flex-wrap gap-6 mb-8 text-white/90">
                      <Link 
                        to={`/events/${event.id}`}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300 group"
                        aria-label="Подробнее о мероприятии"
                      >
                        <ArrowRight className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <Calendar className="h-5 w-5" />
                      <span>
                        {formatEventDate(event)}
                        {formatEventTimeRange(event) && (
                          <>
                            {' • '}
                            {formatEventTimeRange(event)}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Мобильная версия (только мета-информация) */}
                  <div className="md:hidden absolute bottom-6 left-0 right-0 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-3 text-white">
                      <div className="flex items-center gap-2 text-sm sm:text-base">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>
                          {formatEventDate(event)}
                          {formatEventTimeRange(event) && (
                            <>
                              {' • '}
                              {formatEventTimeRange(event)}
                            </>
                          )}
                        </span>
                      </div>
                      <Link 
                        to={`/events/${event.id}`}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300 group"
                        aria-label="Подробнее о мероприятии"
                      >
                        <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Slider>

      {/* Блок с названием и описанием для мобильной версии */}
      <div className="md:hidden container px-4 sm:px-6 mt-4">
        {events.map((event, index) => {
          // Дополнительная проверка для мобильной версии
          if (!event || !event.id) {
            return null;
          }
          
          return (
            <div 
              key={event.id} 
              className={`${index === currentSlide ? 'block' : 'hidden'}`}
            >
              <h2 className="text-xl font-bold mb-2" style={titleStyle}>
                {event.title || 'Название не указано'}
              </h2>
              <p className="text-sm line-clamp-2" style={descriptionStyle}>
                {event.short_description || 'Описание отсутствует'}
              </p>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .events-slideshow .slick-dots {
          bottom: 20px;
        }
        .events-slideshow .slick-dots li {
          margin: 0 4px;
        }
        @media (max-width: 640px) {
          .events-slideshow .slick-dots {
            bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default EventSlideshow; 
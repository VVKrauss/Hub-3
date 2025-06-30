// src/components/events/EventsHeroSlider.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EventWithDetails } from '../../types/database';

interface EventsHeroSliderProps {
  events: EventWithDetails[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const EventsHeroSlider: React.FC<EventsHeroSliderProps> = ({ 
  events, 
  autoPlay = true, 
  autoPlayInterval = 5000 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  console.log('EventsHeroSlider received events:', events.length); // Отладка

  // Фильтруем только предстоящие события с изображениями
  const upcomingEventsWithImages = events.filter(event => {
    const eventDate = new Date(event.start_at);
    const now = new Date();
    return eventDate > now && event.cover_image_url && event.status === 'active';
  }).slice(0, 5); // Берем максимум 5 событий

  console.log('Filtered events for slider:', upcomingEventsWithImages.length); // Отладка

  useEffect(() => {
    if (!autoPlay || upcomingEventsWithImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % upcomingEventsWithImages.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, upcomingEventsWithImages.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide(prev => 
      prev === 0 ? upcomingEventsWithImages.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentSlide(prev => (prev + 1) % upcomingEventsWithImages.length);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (upcomingEventsWithImages.length === 0) {
    return (
      <div className="relative h-96 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-600 dark:text-gray-300">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-3xl font-bold mb-2">Предстоящие события</h2>
            <p className="text-gray-500 dark:text-gray-400">Скоро появятся новые мероприятия</p>
          </div>
        </div>
      </div>
    );
  }

  const currentEvent = upcomingEventsWithImages[currentSlide];

  return (
    <div className="relative h-96 overflow-hidden group">
      {/* Основное изображение */}
      <div className="absolute inset-0">
        <img
          src={currentEvent.cover_image_url!}
          alt={currentEvent.title}
          className="w-full h-full object-cover"
        />
        {/* Градиентная подложка для текста */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
      </div>

      {/* Контент слайда */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {currentEvent.title}
            </h1>
            
            {currentEvent.short_description && (
              <p className="text-xl text-gray-200 mb-6 leading-relaxed">
                {currentEvent.short_description}
              </p>
            )}

            {/* Кнопка действия */}
            <div className="mb-6">
              <Link
                to={`/events/${currentEvent.id}`}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
              >
                Узнать больше
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Мета информация */}
            <div className="flex flex-wrap items-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{formatDate(currentEvent.start_at)} • {formatTime(currentEvent.start_at)}</span>
              </div>
              
              {currentEvent.venue_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{currentEvent.venue_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Навигационные стрелки */}
      {upcomingEventsWithImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Индикаторы слайдов */}
      {upcomingEventsWithImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {upcomingEventsWithImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentSlide
                  ? 'bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsHeroSlider;
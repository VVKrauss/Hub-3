// src/components/events/EventsHeroSlider.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
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

  // Фильтруем только предстоящие события с изображениями
  const upcomingEventsWithImages = events.filter(event => {
    const eventDate = new Date(event.start_at);
    const now = new Date();
    return eventDate > now && event.cover_image_url && event.status === 'active';
  }).slice(0, 5); // Берем максимум 5 событий

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
      month: 'long',
      year: 'numeric'
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
      <div className="relative h-96 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-3xl font-bold mb-2">Предстоящие события</h2>
            <p className="text-gray-200">Скоро появятся новые мероприятия</p>
          </div>
        </div>
      </div>
    );
  }

  const currentEvent = upcomingEventsWithImages[currentSlide];

  return (
    <div className="relative h-96 rounded-xl overflow-hidden group">
      {/* Основное изображение */}
      <div className="absolute inset-0">
        <img
          src={currentEvent.cover_image_url!}
          alt={currentEvent.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Контент */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Тип события */}
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/90 text-gray-900">
                {currentEvent.event_type === 'lecture' ? 'Лекция' :
                 currentEvent.event_type === 'workshop' ? 'Мастер-класс' :
                 currentEvent.event_type === 'conference' ? 'Конференция' :
                 currentEvent.event_type === 'seminar' ? 'Семинар' :
                 currentEvent.event_type === 'festival' ? 'Фестиваль' : 'Событие'}
              </span>
            </div>

            {/* Заголовок */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {currentEvent.title}
            </h1>

            {/* Краткое описание */}
            {currentEvent.short_description && (
              <p className="text-xl text-gray-200 mb-6 line-clamp-2">
                {currentEvent.short_description}
              </p>
            )}

            {/* Мета информация */}
            <div className="flex flex-wrap items-center gap-4 text-white mb-8">
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

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={`/events/${currentEvent.slug || currentEvent.id}`}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Подробнее о событии
              </Link>
              
              {currentEvent.registration_enabled && (
                <Link
                  to={`/events/${currentEvent.slug || currentEvent.id}#registration`}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
                >
                  Зарегистрироваться
                </Link>
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

      {/* Миниатюры событий (для больших экранов) */}
      {upcomingEventsWithImages.length > 1 && (
        <div className="absolute bottom-4 right-4 hidden lg:flex space-x-2">
          {upcomingEventsWithImages.map((event, index) => (
            <button
              key={event.id}
              onClick={() => goToSlide(index)}
              className={`w-16 h-16 rounded-lg overflow-hidden transition-all ${
                index === currentSlide
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-70 hover:opacity-90'
              }`}
            >
              <img
                src={event.cover_image_url!}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsHeroSlider;
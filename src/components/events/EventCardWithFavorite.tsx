// src/components/events/EventCardWithFavorite.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import EventFavoriteButton from './EventFavoriteButton';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_at?: string;
  location?: string;
  bg_image?: string;
  event_type?: string;
  price?: number;
  currency?: string;
}

interface EventCardWithFavoriteProps {
  event: Event;
  className?: string;
}

const EventCardWithFavorite: React.FC<EventCardWithFavoriteProps> = ({ 
  event, 
  className = '' 
}) => {
  return (
    <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative ${className}`}>
      {/* Кнопка избранного */}
      <div className="absolute top-3 right-3 z-10">
        <EventFavoriteButton
          eventId={event.id}
          className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-sm"
          size="sm"
        />
      </div>

      <Link to={`/events/${event.id}`} className="block">
        {/* Изображение */}
        <div className="relative">
          {event.bg_image ? (
            <img
              src={event.bg_image}
              alt={event.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
              <Calendar className="h-16 w-16 text-primary-600 dark:text-primary-400" />
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white line-clamp-2">
            {event.title}
          </h3>
          
          {event.event_type && (
            <span className="inline-block px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded text-xs font-medium mb-3">
              {event.event_type}
            </span>
          )}

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
            {event.start_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{new Date(event.start_at).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
              {event.description}
            </p>
          )}

          {event.price !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {event.price === 0 ? 'Бесплатно' : `${event.price} ${event.currency || 'RUB'}`}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default EventCardWithFavorite;
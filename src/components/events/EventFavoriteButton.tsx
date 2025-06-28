// src/components/events/EventFavoriteButton.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavoriteEvents } from '../../hooks/useFavorites';
import FavoriteButton from '../favorites/FavoriteButton';

interface EventFavoriteButtonProps {
  eventId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EventFavoriteButton: React.FC<EventFavoriteButtonProps> = ({
  eventId,
  className = '',
  size = 'md'
}) => {
  const { user } = useAuth();
  const { 
    toggleFavoriteEvent, 
    isFavoriteEvent, 
    loading 
  } = useFavoriteEvents(user?.id);

  if (!user) {
    return null; // Не показываем кнопку неавторизованным пользователям
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteEvent(eventId);
  };

  return (
    <FavoriteButton
      isFavorite={isFavoriteEvent(eventId)}
      onClick={handleClick}
      loading={loading}
      className={className}
      size={size}
    />
  );
};

export default EventFavoriteButton;
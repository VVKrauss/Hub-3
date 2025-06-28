// src/components/speakers/SpeakerFavoriteButton.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavoriteSpeakers } from '../../hooks/useFavorites';
import FavoriteButton from '../favorites/FavoriteButton';

interface SpeakerFavoriteButtonProps {
  speakerId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SpeakerFavoriteButton: React.FC<SpeakerFavoriteButtonProps> = ({
  speakerId,
  className = '',
  size = 'md'
}) => {
  const { user } = useAuth();
  const { 
    toggleFavoriteSpeaker, 
    isFavoriteSpeaker, 
    loading 
  } = useFavoriteSpeakers(user?.id);

  if (!user) {
    return null; // Не показываем кнопку неавторизованным пользователям
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteSpeaker(speakerId);
  };

  return (
    <FavoriteButton
      isFavorite={isFavoriteSpeaker(speakerId)}
      onClick={handleClick}
      loading={loading}
      className={className}
      size={size}
    />
  );
};

export default SpeakerFavoriteButton;
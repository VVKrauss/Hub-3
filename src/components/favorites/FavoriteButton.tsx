// src/components/favorites/FavoriteButton.tsx
import React from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onClick,
  className = '',
  size = 'md',
  loading = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${buttonSizeClasses[size]} rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <Heart 
        className={`${sizeClasses[size]} transition-colors ${
          isFavorite 
            ? 'text-red-500 fill-red-500' 
            : 'text-gray-400 hover:text-red-500'
        } ${loading ? 'animate-pulse' : ''}`}
      />
    </button>
  );
};

export default FavoriteButton;
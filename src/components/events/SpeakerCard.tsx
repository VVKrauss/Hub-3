// src/components/events/SpeakerCard.tsx
import React from 'react';
import { User, Link2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFavoriteSpeakers } from '../../hooks/useFavorites';
import FavoriteButton from '../favorites/FavoriteButton';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type SpeakerCardProps = {
  speaker: {
    id: string;
    name: string;
    field_of_expertise: string;
    description: string;
    photos: { url: string; isMain?: boolean }[];
    blog_visibility?: boolean;
    blogs?: string;
  };
  showFavoriteButton?: boolean;
};

// Безопасное извлечение ссылок из текста
const parseLinks = (text: string) => {
  if (!text.includes('<a ')) return text;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  
  const links = tempDiv.querySelectorAll('a');
  links.forEach(link => {
    link.className = 'text-primary-600 dark:text-primary-400 hover:opacity-80 underline';
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
  
  return tempDiv.innerHTML;
};

const SpeakerCard = ({ speaker, showFavoriteButton = true }: SpeakerCardProps) => {
  const { user } = useAuth();
  const { 
    toggleFavoriteSpeaker, 
    isFavoriteSpeaker, 
    loading: favLoading 
  } = useFavoriteSpeakers(user?.id);

  const mainPhoto = speaker.photos?.find(photo => photo.isMain) || speaker.photos?.[0];
  const parsedBlogs = speaker.blog_visibility && speaker.blogs ? JSON.parse(speaker.blogs) : null;

  // Обрабатываем описание (безопасно, без DOMPurify)
  const processedDescription = speaker.description 
    ? parseLinks(speaker.description) 
    : '';

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteSpeaker(speaker.id);
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm relative">
      {/* Кнопка избранного */}
      {showFavoriteButton && user && (
        <div className="absolute top-4 right-4 z-10">
          <FavoriteButton
            isFavorite={isFavoriteSpeaker(speaker.id)}
            onClick={handleFavoriteClick}
            loading={favLoading}
            className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-800 shadow-sm"
            size="sm"
          />
        </div>
      )}

      {/* Верхний ряд с фото, именем и сферой интересов */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
        {/* Контейнер для фото */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24" style={{ 
            clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
            shapeRendering: 'geometricPrecision'
          }}>
            {mainPhoto?.url ? (
              <img
                src={getSupabaseImageUrl(mainPhoto.url)}
                alt={speaker.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/300?text=No+image';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        
        {/* Блок с именем и сферой интересов */}
        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="text-xl font-semibold">{speaker.name}</h3>
            {showFavoriteButton && isFavoriteSpeaker(speaker.id) && (
              <span className="text-red-500 text-xs">❤️</span>
            )}
          </div>
          <p className="text-primary-600 dark:text-primary-400 mt-1">
            {speaker.field_of_expertise}
          </p>
        </div>
      </div>
      
      {/* Нижний блок с описанием */}
      <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
        <div 
          className="text-dark-600 dark:text-dark-300 mb-4"
          dangerouslySetInnerHTML={{ __html: processedDescription }}
        />
        
        {/* Блок с блогами */}
        {parsedBlogs && parsedBlogs.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Блоги и соцсети:
            </h4>
            <div className="flex flex-wrap gap-2">
              {parsedBlogs.map((blog: { url: string; platform: string }, index: number) => (
                <a
                  key={index}
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 dark:bg-dark-700 text-primary-800 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-dark-600 transition-colors"
                >
                  <Link2 className="w-3 h-3 mr-1.5" />
                  {blog.platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerCard;
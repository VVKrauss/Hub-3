import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Grid, List, User, Users, Clock, Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, X, ExternalLink, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSupabaseImageUrl } from '../utils/imageUtils';

// Типы
interface SpeakerSocialLink {
  id: string;
  speaker_id: string;
  platform: string;
  url: string;
  display_name?: string;
  description?: string;
  is_public: boolean;
  is_primary: boolean;
  display_order?: number;
  created_at: string;
}

interface Speaker {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  field_of_expertise: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  private_notes: string | null;
  status: 'active' | 'inactive' | 'pending';
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sh_speaker_social_links?: SpeakerSocialLink[];
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'field' | 'random';
type SortOrder = 'asc' | 'desc';

interface SpeakerFilters {
  search: string;
  field_of_expertise: string;
  status: string;
  is_featured: boolean | null;
  sortBy: SortOption;
  sortOrder: SortOrder;
}

// Константы
const ITEMS_PER_PAGE = 12;
const BIO_TRUNCATE_LENGTH = 110; // Ограничиваем до 110 символов

// Утилита для обрезки текста
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Компонент кнопки избранного
interface FavoriteButtonProps {
  speakerId: string;
  className?: string;
  size?: 'sm' | 'md';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ speakerId, className = '', size = 'md' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Загружаем состояние избранного из localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteSpeakers') || '[]');
    setIsFavorite(favorites.includes(speakerId));
  }, [speakerId]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteSpeakers') || '[]');
      let newFavorites;
      
      if (isFavorite) {
        newFavorites = favorites.filter((id: string) => id !== speakerId);
      } else {
        newFavorites = [...favorites, speakerId];
      }
      
      localStorage.setItem('favoriteSpeakers', JSON.stringify(newFavorites));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center rounded-full p-2
        transition-all duration-200 hover:scale-110
        ${isFavorite 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-gray-400 hover:text-red-500'
        }
        ${className}
      `}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <Heart 
        className={`${iconSize} ${isFavorite ? 'fill-current' : ''}`} 
      />
    </button>
  );
};

// Утилиты для иконок социальных сетей
const getSocialIcon = (platform: string, className: string = "h-4 w-4") => {
  const platformLower = platform.toLowerCase();
  
  switch (platformLower) {
    case 'website':
      return <Globe className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'twitter':
    case 'x':
      return <Twitter className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <Facebook className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'github':
      return <Github className={className} />;
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.614 7.608c-.121.555-.444.695-.9.432l-2.484-1.831-1.196 1.152c-.132.132-.245.245-.504.245l.18-2.52 4.644-4.194c.204-.18-.044-.284-.312-.108l-5.736 3.6-2.472-.768c-.54-.168-.548-.54.108-.804l9.648-3.708c.444-.168.84.108.696.804z"/>
        </svg>
      );
    default:
      return <ExternalLink className={className} />;
  }
};

const getSocialColor = (platform: string): string => {
  const platformLower = platform.toLowerCase();
  
  switch (platformLower) {
    case 'linkedin':
      return 'text-blue-600 hover:text-blue-700';
    case 'twitter':
    case 'x':
      return 'text-blue-400 hover:text-blue-500';
    case 'instagram':
      return 'text-pink-600 hover:text-pink-700';
    case 'facebook':
      return 'text-blue-600 hover:text-blue-700';
    case 'youtube':
      return 'text-red-600 hover:text-red-700';
    case 'github':
      return 'text-gray-800 hover:text-gray-900';
    case 'telegram':
      return 'text-blue-500 hover:text-blue-600';
    case 'website':
      return 'text-green-600 hover:text-green-700';
    default:
      return 'text-gray-600 hover:text-gray-700';
  }
};

// Компонент для отображения социальных ссылок
interface SocialLinksProps {
  socialLinks: SpeakerSocialLink[];
  maxLinks?: number;
  size?: 'sm' | 'md';
}

const SocialLinks: React.FC<SocialLinksProps> = ({ socialLinks, maxLinks = 3, size = 'md' }) => {
  const publicLinks = socialLinks.filter(link => link.is_public);
  const displayLinks = publicLinks.slice(0, maxLinks);
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (displayLinks.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {displayLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`
            inline-flex items-center justify-center p-1 rounded
            transition-colors duration-200
            ${getSocialColor(link.platform)}
          `}
          title={link.display_name || link.platform}
        >
          {getSocialIcon(link.platform, iconSize)}
        </a>
      ))}
      {publicLinks.length > maxLinks && (
        <span className="text-xs text-gray-500">
          +{publicLinks.length - maxLinks}
        </span>
      )}
    </div>
  );
};

// Компонент карточки спикера
interface SpeakerCardProps {
  speaker: Speaker;
  viewMode: ViewMode;
}

const SpeakerCard: React.FC<SpeakerCardProps> = ({ speaker, viewMode }) => {
  const getSpeakerImage = (speaker: Speaker): string => {
    if (speaker.avatar_url) {
      return getSupabaseImageUrl(speaker.avatar_url);
    }
    return '';
  };

  if (viewMode === 'list') {
    return (
      <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="flex gap-4 p-6 relative">
          {/* Кнопка избранного */}
          <div className="absolute top-4 right-4 z-10">
            <FavoriteButton
              speakerId={speaker.id}
              size="sm"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 shadow-md"
            />
          </div>

          <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-xl">
            {speaker.avatar_url ? (
              <img
                src={getSpeakerImage(speaker)}
                alt={speaker.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
                <User className="w-8 h-8 text-primary-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <a href={`/speakers/${speaker.slug || speaker.id}`} className="block">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {speaker.name}
              </h3>
            </a>

            {speaker.field_of_expertise && (
              <p className="text-primary-600 dark:text-primary-400 text-sm font-medium mb-2">
                {speaker.field_of_expertise}
              </p>
            )}

            {speaker.bio && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                {truncateText(speaker.bio, BIO_TRUNCATE_LENGTH)}
              </p>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <User className="h-4 w-4 mr-1" />
                Спикер
              </div>
              
              {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                <SocialLinks 
                  socialLinks={speaker.sh_speaker_social_links} 
                  maxLinks={3}
                  size="sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          {speaker.avatar_url ? (
            <img
              src={getSpeakerImage(speaker)}
              alt={speaker.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
              <User className="w-16 h-16 text-primary-400" />
            </div>
          )}
        </div>

        {/* Кнопка избранного */}
        <div className="absolute top-3 right-3">
          <FavoriteButton
            speakerId={speaker.id}
            size="sm"
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 shadow-md"
          />
        </div>

        {speaker.is_featured && (
          <div className="absolute top-3 left-3">
            <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg text-xs font-medium">
              Рекомендуемый
            </span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 flex flex-col h-full">
        <a href={`/speakers/${speaker.slug || speaker.id}`} className="block">
          <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-white mb-2 md:mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {speaker.name}
          </h3>
        </a>

        {speaker.field_of_expertise && (
          <p className="text-primary-600 dark:text-primary-400 text-sm font-medium mb-2 md:mb-3">
            {speaker.field_of_expertise}
          </p>
        )}

        {speaker.bio && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
            {truncateText(speaker.bio, BIO_TRUNCATE_LENGTH)}
          </p>
        )}

        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <User className="h-4 w-4 mr-1" />
            Спикер
          </div>
          
          {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
            <SocialLinks 
              socialLinks={speaker.sh_speaker_social_links} 
              maxLinks={3}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Основной компонент страницы спикеров
const SpeakersPage: React.FC = () => {
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const fetchSpeakers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sh_speakers')
        .select(`
          *,
          sh_speaker_social_links (
            id,
            platform,
            url,
            display_name,
            description,
            is_public,
            is_primary,
            display_order
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setAllSpeakers(data);
      }
    } catch (err) {
      console.error('Error fetching speakers:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке спикеров');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка спикеров...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Наши спикеры
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Познакомьтесь с экспертами, которые делятся знаниями и вдохновляют на Science Hub
          </p>
        </div>

        {/* Переключатель вида */}
        <div className="flex justify-end mb-6">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`
                flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Grid className="h-4 w-4 mr-2" />
              Сетка
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <List className="h-4 w-4 mr-2" />
              Список
            </button>
          </div>
        </div>

        {/* Список спикеров */}
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'space-y-4'
          }
        `}>
          {allSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              viewMode={viewMode}
            />
          ))}
        </div>

        {allSpeakers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Спикеры не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakersPage;
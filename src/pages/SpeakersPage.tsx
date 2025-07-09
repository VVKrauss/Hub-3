// src/pages/SpeakersPage.tsx - Часть 1 (строки 1-1000)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Grid, List, User, Users, Clock, Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, X, ExternalLink, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
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
const SLIDESHOW_SPEAKERS_COUNT = 5;
const BIO_TRUNCATE_LENGTH = 110; // ИЗМЕНЕНО: было 200

// Утилита для обрезки текста
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// ДОБАВЛЕНО: Компонент кнопки избранного
interface FavoriteButtonProps {
  speakerId: string;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ speakerId, className = '' }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteSpeakers') || '[]');
    setIsFavorite(favorites.includes(speakerId));
  }, [speakerId]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const favorites = JSON.parse(localStorage.getItem('favoriteSpeakers') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter((id: string) => id !== speakerId);
    } else {
      newFavorites = [...favorites, speakerId];
    }
    
    localStorage.setItem('favoriteSpeakers', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  return (
    <button 
      onClick={toggleFavorite} 
      className={`heart-button p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <Heart className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-current text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
    </button>
  );
};

// Утилиты для иконок социальных сетей
const getSocialIcon = (platform: string, className: string = "h-4 w-4") => {
  const platformLower = platform.toLowerCase();
  
  switch (platformLower) {
    case 'website':
    case 'сайт':
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
    case 'vk':
    case 'вконтакте':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.4 12.96c.8.72 1.68 1.44 2.24 2.4.24.44.24.92-.16 1.16h-2.96c-.56 0-.92-.28-1.28-.68-.36-.36-.68-.76-1.08-1.08-.4-.32-.84-.6-1.36-.48-.76.16-1.16.96-1.12 1.88 0 .28-.12.56-.64.56H9.6c-.88.04-1.72-.12-2.48-.56-.76-.4-1.36-.96-1.88-1.6-.96-1.24-1.68-2.6-2.36-4 0-.2 0-.4.2-.48h2.96c.36 0 .56.16.68.48.4.96.92 1.84 1.68 2.56.36.32.72.56 1.2.4.56-.2.8-.76.84-1.32.08-.88.08-1.76-.16-2.6-.16-.56-.56-.92-1.16-.96-.32-.04-.28-.16-.12-.36.24-.32.48-.52 1-.52h2.88c.44.08.68.36.72.8l.04 3.6c0 .28.12 1.12.68 1.28.44.12.72-.28 1-.56.76-.8 1.28-1.76 1.72-2.76.2-.44.36-.88.52-1.32.12-.32.32-.48.68-.48h3.24c.08 0 .16 0 .2.04.28.08.36.32.28.6-.12.52-.4 1-.68 1.44-.64.96-1.36 1.84-2.04 2.76-.28.36-.24.56.08.84z"/>
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
      return 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300';
    case 'twitter':
    case 'x':
      return 'text-blue-400 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200';
    case 'instagram':
      return 'text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300';
    case 'facebook':
      return 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300';
    case 'youtube':
      return 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300';
    case 'github':
      return 'text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100';
    case 'telegram':
      return 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300';
    case 'vk':
    case 'вконтакте':
      return 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300';
    case 'website':
    case 'сайт':
      return 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300';
    default:
      return 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300';
  }
};

// Компонент для отображения социальных ссылок
interface SocialLinksProps {
  socialLinks: SpeakerSocialLink[];
  maxLinks?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SocialLinks: React.FC<SocialLinksProps> = ({ socialLinks, maxLinks = 4, size = 'md' }) => {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  };

  const iconSize = iconSizes[size];

  if (!socialLinks || socialLinks.length === 0) {
    return null;
  }

  const visibleLinks = socialLinks
    .filter(link => link.is_public && link.url)
    .sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    })
    .slice(0, maxLinks);

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {visibleLinks.map((social) => (
        <a
          key={social.id}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2 rounded-full bg-black/50 backdrop-blur-sm transition-all hover:bg-black/70 text-white hover:text-white`}
          title={social.display_name || social.platform}
          onClick={(e) => e.stopPropagation()}
        >
          {getSocialIcon(social.platform, iconSize)}
        </a>
      ))}
    </div>
  );
};

// Утилиты
const getUniqueFields = (speakers: Speaker[]): string[] => {
  const fields = speakers
    .map(speaker => speaker.field_of_expertise)
    .filter((field): field is string => field !== null && field !== '')
    .map(field => field.trim());
  
  return Array.from(new Set(fields)).sort();
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const sortSpeakers = (speakers: Speaker[], sortBy: SortOption, sortOrder: SortOrder): Speaker[] => {
  if (sortBy === 'random') {
    return shuffleArray(speakers);
  }

  return [...speakers].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'field':
        aValue = (a.field_of_expertise || '').toLowerCase();
        bValue = (b.field_of_expertise || '').toLowerCase();
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue.localeCompare(bValue, 'ru');
    } else {
      return bValue.localeCompare(aValue, 'ru');
    }
  });
};

const filterSpeakers = (speakers: Speaker[], filters: SpeakerFilters): Speaker[] => {
  return speakers.filter(speaker => {
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      const nameMatch = speaker.name.toLowerCase().includes(searchTerm);
      const bioMatch = speaker.bio?.toLowerCase().includes(searchTerm) || false;
      const fieldMatch = speaker.field_of_expertise?.toLowerCase().includes(searchTerm) || false;
      
      if (!nameMatch && !bioMatch && !fieldMatch) {
        return false;
      }
    }

    if (filters.field_of_expertise && filters.field_of_expertise !== 'all') {
      if (speaker.field_of_expertise !== filters.field_of_expertise) {
        return false;
      }
    }

    if (filters.status && filters.status !== 'all') {
      if (speaker.status !== filters.status) {
        return false;
      }
    }

    if (filters.is_featured !== null) {
      if (speaker.is_featured !== filters.is_featured) {
        return false;
      }
    }

    return true;
  });
};
// src/pages/SpeakersPage.tsx - Часть 2 (строки 1001-2000)

// Слайдер спикеров
interface SpeakersHeroSliderProps {
  speakers: Speaker[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const SpeakersHeroSlider: React.FC<SpeakersHeroSliderProps> = ({ 
  speakers, 
  autoPlay = true, 
  autoPlayInterval = 5000 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slideshowSpeakers = useMemo(() => {
    const activeSpeakersWithPhotos = speakers.filter(speaker => 
      speaker.status === 'active' && 
      speaker.avatar_url
    );
    
    return shuffleArray(activeSpeakersWithPhotos).slice(0, SLIDESHOW_SPEAKERS_COUNT);
  }, [speakers]);

  useEffect(() => {
    if (!isAutoPlaying || slideshowSpeakers.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowSpeakers.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [slideshowSpeakers.length, isAutoPlaying, autoPlayInterval]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slideshowSpeakers.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slideshowSpeakers.length) % slideshowSpeakers.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  if (slideshowSpeakers.length === 0) {
    return (
      <div className="container mx-auto px-4 mb-8">
        <div className="relative w-full h-[400px] overflow-hidden rounded-xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-secondary-600">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Наши спикеры</h2>
                <p className="text-lg text-gray-200">Эксперты в различных областях науки</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 mb-8">
      <div className="relative w-full h-[400px] overflow-hidden rounded-xl shadow-2xl">
        <div className="relative w-full h-full">
          {slideshowSpeakers.map((speaker, index) => (
            <div
              key={speaker.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="absolute inset-0">
                <img
                  src={getSupabaseImageUrl(speaker.avatar_url!)}
                  alt={speaker.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </div>

              <div className="relative z-10 h-full flex items-end">
                <div className="w-full p-6 md:p-8 text-white">
                  <div className="max-w-3xl">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                      {speaker.name}
                    </h2>
                    
                    {speaker.field_of_expertise && (
                      <p className="text-lg md:text-xl lg:text-2xl text-gray-200 mb-6 leading-relaxed">
                        {speaker.field_of_expertise}
                      </p>
                    )}
                    
                    {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-base md:text-lg">
                        <SocialLinks 
                          socialLinks={speaker.sh_speaker_social_links} 
                          maxLinks={4}
                          size="lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Link 
                to={`/speakers/${speaker.slug || speaker.id}`}
                className="absolute inset-0 z-5"
                aria-label={`Перейти к профилю спикера: ${speaker.name}`}
              />
            </div>
          ))}
        </div>

        {slideshowSpeakers.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-2 md:p-3 transition-all duration-200"
              aria-label="Предыдущий слайд"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-2 md:p-3 transition-all duration-200"
              aria-label="Следующий слайд"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </button>
          </>
        )}

        {slideshowSpeakers.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
            {slideshowSpeakers.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? 'bg-white scale-110'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Перейти к слайду ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Горизонтальная панель фильтров
interface HorizontalFiltersProps {
  filters: SpeakerFilters;
  uniqueFields: string[];
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalSpeakers: number;
  filteredCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const HorizontalFilters: React.FC<HorizontalFiltersProps> = ({
  filters,
  uniqueFields,
  onSearchChange,
  onFieldChange,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  totalSpeakers,
  filteredCount,
  viewMode,
  onViewModeChange
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Спикеры
              </h1>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                {filteredCount > 0 
                  ? `Найдено ${filteredCount} из ${totalSpeakers} спикеров`
                  : 'Спикеры не найдены'
                }
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-label="Вид сеткой"
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-label="Вид списком"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between lg:hidden">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasActiveFilters
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                Фильтры
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>

              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                  aria-label="Вид сеткой"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                  aria-label="Вид списком"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-end">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по имени, био, экспертизе..."
                    value={filters.search}
                    onChange={onSearchChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Область экспертизы
                </label>
                <select
                  value={filters.field_of_expertise}
                  onChange={onFieldChange}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Все области</option>
                  {uniqueFields.map(field => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Сортировка
                </label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={onSortChange}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="random-asc">Случайный порядок</option>
                  <option value="name-asc">По имени (А-Я)</option>
                  <option value="name-desc">По имени (Я-А)</option>
                  <option value="field-asc">По области (А-Я)</option>
                  <option value="field-desc">По области (Я-А)</option>
                </select>
              </div>

              <div className="col-span-2">
                {hasActiveFilters && (
                  <button
                    onClick={onClearFilters}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Очистить
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      
      {/* // src/pages/SpeakersPage.tsx - Часть 3 (строки 2001-3000)
 */}
      {mobileFiltersOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
          
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-800 rounded-t-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto lg:hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Фильтры
                </h3>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по имени, био, экспертизе..."
                    value={filters.search}
                    onChange={onSearchChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Область экспертизы
                </label>
                <select
                  value={filters.field_of_expertise}
                  onChange={onFieldChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Все области</option>
                  {uniqueFields.map(field => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Сортировка
                </label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={onSortChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="random-asc">Случайный порядок</option>
                  <option value="name-asc">По имени (А-Я)</option>
                  <option value="name-desc">По имени (Я-А)</option>
                  <option value="field-asc">По области (А-Я)</option>
                  <option value="field-desc">По области (Я-А)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClearFilters}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Очистить
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
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
      <Link
        to={`/speakers/${speaker.slug || speaker.id}`}
        className="group block"
      >
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div className="flex gap-4 p-6">
            <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-xl relative">
              {speaker.avatar_url ? (
                <img
                  src={getSpeakerImage(speaker)}
                  alt={speaker.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-primary-400" />
                </div>
              )}

              {/* Социальные ссылки в нижней части изображения для list view */}
              {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="flex items-center justify-center">
                    <SocialLinks 
                      socialLinks={speaker.sh_speaker_social_links} 
                      maxLinks={3}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {speaker.is_featured && (
                      <span className="inline-flex items-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                        Рекомендуемый
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {speaker.name}
                  </h3>

                  {speaker.field_of_expertise && (
                    <p className="text-primary-600 dark:text-primary-400 text-sm font-medium mb-2">
                      {speaker.field_of_expertise}
                    </p>
                  )}

                  {speaker.bio && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 md:line-clamp-3 mb-3">
                      {truncateText(speaker.bio, BIO_TRUNCATE_LENGTH)}
                    </p>
                  )}
                </div>

                {/* Кнопка избранного для list view */}
                <div className="flex-shrink-0 ml-4">
                  <FavoriteButton speakerId={speaker.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      to={`/speakers/${speaker.slug || speaker.id}`}
      className="group block"
    >
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-full">
        <div className="relative aspect-square overflow-hidden">
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
          
          {/* Кнопка избранного в левом верхнем углу */}
          <div className="absolute top-3 left-3">
            <FavoriteButton speakerId={speaker.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm" />
          </div>
          
          {speaker.is_featured && (
            <div className="absolute top-3 right-3">
              <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg text-xs font-medium">
                Рекомендуемый
              </span>
            </div>
          )}

          {/* Социальные ссылки в нижней части изображения */}
          {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-center">
                <SocialLinks 
                  socialLinks={speaker.sh_speaker_social_links} 
                  maxLinks={4}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 flex flex-col h-full">
          <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-white mb-2 md:mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {speaker.name}
          </h3>

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
          </div>
        </div>
      </div>
    </Link>
  );
};

// Адаптивная сетка для спикеров
const ResponsiveSpeakersGrid: React.FC<{
  speakers: Speaker[];
  viewMode: ViewMode;
  className?: string;
}> = ({ speakers, viewMode, className = '' }) => {
  if (viewMode === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {speakers.map((speaker) => (
          <SpeakerCard
            key={speaker.id}
            speaker={speaker}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`
      grid gap-4 md:gap-6
      grid-cols-1 
      sm:grid-cols-2 
      lg:grid-cols-3 
      xl:grid-cols-4
      ${className}
    `}>
      {speakers.map((speaker) => (
        <SpeakerCard
          key={speaker.id}
          speaker={speaker}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

// src/pages/SpeakersPage.tsx - Часть 4 (строки 3001-конец файла)

// Основной компонент страницы спикеров
const SpeakersPage: React.FC = () => {
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState<SpeakerFilters>({
    search: '',
    field_of_expertise: 'all',
    status: 'active',
    is_featured: null,
    sortBy: 'random',
    sortOrder: 'asc'
  });

  const [initialRandomSort, setInitialRandomSort] = useState(true);

  const fetchSpeakers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sh_speakers')
        .select(`
          *,
          sh_speaker_social_links (
            id,
            speaker_id,
            platform,
            url,
            display_name,
            description,
            is_public,
            is_primary,
            display_order,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const processedData = initialRandomSort ? shuffleArray(data) : data;
        setAllSpeakers(processedData);
        setInitialRandomSort(false);
      }
    } catch (err) {
      console.error('Error fetching speakers:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке спикеров');
    } finally {
      setLoading(false);
    }
  }, [initialRandomSort]);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  const uniqueFields = useMemo(() => getUniqueFields(allSpeakers), [allSpeakers]);

  const filteredAndSortedSpeakers = useMemo(() => {
    const filtered = filterSpeakers(allSpeakers, filters);
    return sortSpeakers(filtered, filters.sortBy, filters.sortOrder);
  }, [allSpeakers, filters]);

  const paginatedSpeakers = useMemo(() => {
    return filteredAndSortedSpeakers.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredAndSortedSpeakers, page]);

  useEffect(() => {
    setHasMore(paginatedSpeakers.length < filteredAndSortedSpeakers.length);
  }, [paginatedSpeakers.length, filteredAndSortedSpeakers.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setPage(prev => prev + 1);
    setLoadingMore(false);
  }, [loadingMore, hasMore]);

  const updateFilters = useCallback((newFilters: Partial<SpeakerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      field_of_expertise: 'all',
      status: 'active',
      is_featured: null,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== '' ||
      filters.field_of_expertise !== 'all' ||
      filters.status !== 'active' ||
      filters.is_featured !== null ||
      filters.sortBy !== 'random'
    );
  }, [filters]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ search: e.target.value });
  }, [updateFilters]);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ field_of_expertise: e.target.value });
  }, [updateFilters]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split('-') as [SortOption, SortOrder];
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка спикеров...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4">
              <h2 className="text-xl font-bold mb-2">Ошибка загрузки</h2>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={fetchSpeakers}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SpeakersHeroSlider speakers={allSpeakers} />

      <HorizontalFilters
        filters={filters}
        uniqueFields={uniqueFields}
        onSearchChange={handleSearchChange}
        onFieldChange={handleFieldChange}
        onSortChange={handleSortChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        totalSpeakers={allSpeakers.length}
        filteredCount={filteredAndSortedSpeakers.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className="py-8 bg-gray-50 dark:bg-dark-900 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="space-y-6">
            {filteredAndSortedSpeakers.length > 0 ? (
              <>
                <ResponsiveSpeakersGrid
                  speakers={paginatedSpeakers}
                  viewMode={viewMode}
                />

                {hasMore && (
                  <div className="flex justify-center mt-12">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Загрузка...
                        </>
                      ) : (
                        <>
                          Загрузить еще
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {paginatedSpeakers.length < filteredAndSortedSpeakers.length && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Показано {paginatedSpeakers.length} из {filteredAndSortedSpeakers.length} спикеров
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <Users className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Спикеры не найдены
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {hasActiveFilters 
                      ? 'Попробуйте изменить параметры поиска или очистить фильтры'
                      : 'В данный момент нет доступных спикеров'
                    }
                  </p>
                  
                  {hasActiveFilters && (
                    <div className="space-y-3">
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Очистить фильтры
                      </button>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Активные фильтры:</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          {filters.search && (
                            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                              Поиск: "{filters.search}"
                            </span>
                          )}
                          {filters.field_of_expertise !== 'all' && (
                            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                              Область: {filters.field_of_expertise}
                            </span>
                          )}
                          {filters.status !== 'active' && (
                            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                              Статус: {filters.status}
                            </span>
                          )}
                          {filters.is_featured !== null && (
                            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded text-xs">
                              {filters.is_featured ? 'Рекомендуемые' : 'Обычные'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default SpeakersPage;
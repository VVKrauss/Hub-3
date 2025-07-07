// src/pages/SpeakersPage.tsx - Версия с социальными иконками
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Grid, List, User, Users, Clock, Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, X, ExternalLink, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github } from 'lucide-react';
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
      return 'text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100';
    case 'telegram':
      return 'text-blue-500 hover:text-blue-600';
    case 'vk':
    case 'вконтакте':
      return 'text-blue-500 hover:text-blue-600';
    case 'website':
    case 'сайт':
      return 'text-green-600 hover:text-green-700';
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
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const iconSize = iconSizes[size];

  if (!socialLinks || socialLinks.length === 0) {
    return null;
  }

  const visibleLinks = socialLinks
    .filter(link => link.is_public)
    .sort((a, b) => {
      // Сначала основные ссылки, потом по порядку отображения
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    })
    .slice(0, maxLinks);

  return (
    <div className="flex items-center gap-2">
      {visibleLinks.map((social) => (
        <a
          key={social.id}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${getSocialColor(social.platform)}`}
          title={social.display_name || social.platform}
          onClick={(e) => e.stopPropagation()} // Предотвращаем переход к профилю спикера
        >
          {getSocialIcon(social.platform, iconSize)}
        </a>
      ))}
    </div>
  );
};

// Утилиты для форматирования (без изменений)
const formatRussianDate = (dateString: string): string => {
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

// Функция для получения уникальных полей экспертизы
const getUniqueFields = (speakers: Speaker[]): string[] => {
  const fields = speakers
    .map(speaker => speaker.field_of_expertise)
    .filter((field): field is string => field !== null && field !== '')
    .map(field => field.trim());
  
  return Array.from(new Set(fields)).sort();
};

// Функция для перемешивания массива (Fisher-Yates shuffle)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Функция для сортировки спикеров
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

// Функция для фильтрации спикеров
const filterSpeakers = (speakers: Speaker[], filters: SpeakerFilters): Speaker[] => {
  return speakers.filter(speaker => {
    // Поиск по имени и био
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      const nameMatch = speaker.name.toLowerCase().includes(searchTerm);
      const bioMatch = speaker.bio?.toLowerCase().includes(searchTerm) || false;
      const fieldMatch = speaker.field_of_expertise?.toLowerCase().includes(searchTerm) || false;
      
      if (!nameMatch && !bioMatch && !fieldMatch) {
        return false;
      }
    }

    // Фильтр по полю экспертизы
    if (filters.field_of_expertise && filters.field_of_expertise !== 'all') {
      if (speaker.field_of_expertise !== filters.field_of_expertise) {
        return false;
      }
    }

    // Фильтр по статусу
    if (filters.status && filters.status !== 'all') {
      if (speaker.status !== filters.status) {
        return false;
      }
    }

    // Фильтр по избранным
    if (filters.is_featured !== null) {
      if (speaker.is_featured !== filters.is_featured) {
        return false;
      }
    }

    return true;
  });
};
// SpeakersSlideshow - Компонент слайдшоу в стиле EventsPage (без изменений)
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

  // Перемешиваем спикеров и берем первые 5 активных с фото
  const slideshowSpeakers = useMemo(() => {
    const activeSpeakersWithPhotos = speakers.filter(speaker => 
      speaker.status === 'active' && 
      speaker.avatar_url
    );
    
    return shuffleArray(activeSpeakersWithPhotos).slice(0, SLIDESHOW_SPEAKERS_COUNT);
  }, [speakers]);

  useEffect(() => {
    if (!autoPlay || slideshowSpeakers.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideshowSpeakers.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, slideshowSpeakers.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide(prev => 
      prev === 0 ? slideshowSpeakers.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentSlide(prev => (prev + 1) % slideshowSpeakers.length);
  };

  if (slideshowSpeakers.length === 0) {
    return (
      <div className="relative h-[400px] md:h-[500px] bg-gradient-to-r from-primary-600 to-secondary-600 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Наши спикеры</h2>
            <p className="text-lg text-gray-200">Эксперты в различных областях науки</p>
          </div>
        </div>
      </div>
    );
  }

  const currentSpeaker = slideshowSpeakers[currentSlide];

  return (
    <div className="relative h-[400px] md:h-[500px] overflow-hidden group">
      {/* Основное изображение с градиентом */}
      <div className="absolute inset-0">
        {currentSpeaker.avatar_url ? (
          <>
            <img
              src={getSupabaseImageUrl(currentSpeaker.avatar_url)}
              alt={currentSpeaker.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary-600 to-secondary-600 flex items-center justify-center">
            <User className="w-32 h-32 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Контент поверх изображения */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Заголовок */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {currentSpeaker.name}
            </h1>

            {/* Поле экспертизы */}
            {currentSpeaker.field_of_expertise && (
              <p className="text-lg md:text-xl text-primary-200 mb-4 font-medium">
                {currentSpeaker.field_of_expertise}
              </p>
            )}

            {/* Краткая биография */}
            {currentSpeaker.bio && (
              <p className="text-base md:text-lg text-gray-200 mb-6 line-clamp-3 max-w-2xl">
                {currentSpeaker.bio}
              </p>
            )}

            {/* Социальные ссылки в слайдшоу */}
            {currentSpeaker.sh_speaker_social_links && currentSpeaker.sh_speaker_social_links.length > 0 && (
              <div className="mb-6">
                <SocialLinks 
                  socialLinks={currentSpeaker.sh_speaker_social_links} 
                  maxLinks={5}
                  size="lg"
                />
              </div>
            )}

            {/* Кнопка */}
            <div className="mb-6">
              <Link
                to={`/speakers/${currentSpeaker.slug || currentSpeaker.id}`}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
              >
                Подробнее
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Навигационные стрелки */}
      {slideshowSpeakers.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Предыдущий спикер"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Следующий спикер"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Индикаторы слайдов */}
      {slideshowSpeakers.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slideshowSpeakers.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Горизонтальная панель фильтров (без изменений из предыдущей версии)
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
      {/* Горизонтальная панель фильтров */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="container mx-auto px-4">
          {/* Заголовок и статистика */}
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

            {/* Переключатель вида - только для десктопа */}
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

          {/* Фильтры */}
          <div className="space-y-4">
            {/* Мобильная кнопка фильтров */}
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

              {/* Переключатель вида для мобильных */}
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
            {/* Десктопные фильтры */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-end">
              {/* Поиск */}
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

              {/* Область экспертизы */}
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

              {/* Сортировка */}
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

              {/* Кнопка очистки */}
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

      {/* Мобильная панель фильтров */}
      {mobileFiltersOpen && (
        <>
          {/* Оверлей */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
          
          {/* Панель фильтров */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-800 rounded-t-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto lg:hidden">
            <div className="p-6">
              {/* Заголовок с кнопкой закрытия */}
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

              {/* Поиск */}
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

              {/* Область экспертизы */}
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

              {/* Сортировка */}
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

              {/* Кнопки */}
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

// Компонент карточки спикера с социальными иконками вместо статусов
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
            {/* Аватар */}
            <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden rounded-xl">
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
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Рекомендуемый бейдж */}
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
                      {speaker.bio}
                    </p>
                  )}

                  {/* Социальные ссылки */}
                  {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                    <SocialLinks 
                      socialLinks={speaker.sh_speaker_social_links} 
                      maxLinks={4}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }
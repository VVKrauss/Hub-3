// src/components/speakers/SpeakersList.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы и API

import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, User, Users } from 'lucide-react';
import SpeakerCard from './SpeakerCard';
import { getSpeakers } from '../../api/speakers';
import type { SpeakerWithSocials, SpeakerFilters, ShSpeakerStatus } from '../../types/database';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

interface SpeakersListProps {
  initialFilters?: Partial<SpeakerFilters>;
  showFilters?: boolean;
  showSearch?: boolean;
  showViewToggle?: boolean;
  title?: string;
  limit?: number;
  compact?: boolean;
  className?: string;
}

const SpeakersList: React.FC<SpeakersListProps> = ({
  initialFilters = {},
  showFilters = true,
  showSearch = true,
  showViewToggle = true,
  title = 'Спикеры',
  limit,
  compact = false,
  className = ''
}) => {
  // Состояние
  const [speakers, setSpeakers] = useState<SpeakerWithSocials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Фильтры
  const [filters, setFilters] = useState<SpeakerFilters>({
    search: '',
    statuses: ['active'], // По умолчанию показываем только активных спикеров
    fields_of_expertise: [],
    is_featured: undefined,
    ...initialFilters
  });

  // Загрузка спикеров
  const fetchSpeakers = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getSpeakers(filters, pageNum, limit || 20);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        if (append) {
          setSpeakers(prev => [...prev, ...result.data!]);
        } else {
          setSpeakers(result.data);
        }
        
        setHasMore(result.hasMore);
        setTotal(result.total);
      }
    } catch (err: any) {
      console.error('Error fetching speakers:', err);
      setError(err.message || 'Ошибка при загрузке спикеров');
    } finally {
      setLoading(false);
    }
  };

  // Эффекты
  useEffect(() => {
    setPage(1);
    fetchSpeakers(1, false);
  }, [filters]);

  // Обработчики
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleFilterChange = (key: keyof SpeakerFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSpeakers(nextPage, true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      statuses: ['active'],
      fields_of_expertise: [],
      is_featured: undefined,
      ...initialFilters
    });
  };

  // Статусы спикеров
  const speakerStatuses: { value: ShSpeakerStatus; label: string }[] = [
    { value: 'active', label: 'Активные' },
    { value: 'pending', label: 'На рассмотрении' },
    { value: 'inactive', label: 'Неактивные' }
  ];

  // Получаем уникальные области экспертизы для фильтра
  const getUniqueFields = () => {
    const fields = speakers
      .map(speaker => speaker.field_of_expertise)
      .filter(Boolean)
      .filter((field, index, array) => array.indexOf(field) === index)
      .sort();
    return fields as string[];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {total > 0 && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Найдено {total} спикеров
            </p>
          )}
        </div>

        {/* Переключатель вида */}
        {showViewToggle && (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Поиск */}
      {showSearch && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск спикеров..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Фильтры */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Фильтры
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Очистить все
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Статус */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статус
              </label>
              <select
                multiple
                value={filters.statuses}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value as ShSpeakerStatus);
                  handleFilterChange('statuses', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={3}
              >
                {speakerStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Область экспертизы */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Область экспертизы
              </label>
              <select
                multiple
                value={filters.fields_of_expertise}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('fields_of_expertise', values);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                size={4}
              >
                {getUniqueFields().map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Дополнительные фильтры */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.is_featured === true}
                onChange={(e) => handleFilterChange('is_featured', e.target.checked ? true : undefined)}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Только рекомендуемые</span>
            </label>
          </div>
        </div>
      )}

      {/* Состояния загрузки и ошибок */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchSpeakers(1, false)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading && speakers.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Загрузка спикеров...</p>
          </div>
        </div>
      )}

      {/* Список спикеров */}
      {speakers.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className={`grid gap-6 ${
              compact 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {speakers.map((speaker) => (
                <SpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  compact={compact}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {speakers.map((speaker) => (
                <SpeakerListItem key={speaker.id} speaker={speaker} />
              ))}
            </div>
          )}

          {/* Кнопка "Загрузить еще" */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Загрузка...
                  </>
                ) : (
                  'Загрузить еще'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Пустое состояние */}
      {!loading && speakers.length === 0 && !error && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Спикеры не найдены
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Попробуйте изменить фильтры или поисковый запрос
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Очистить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

// Компонент элемента списка (для режима списка)
const SpeakerListItem: React.FC<{ speaker: SpeakerWithSocials }> = ({ speaker }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {/* Изображение */}
        <div className="flex-shrink-0">
          <div 
            className="w-16 h-16 relative"
            style={{ 
              clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
              shapeRendering: 'geometricPrecision'
            }}
          >
            {speaker.avatar_url ? (
              <img
                src={getSupabaseImageUrl(speaker.avatar_url)}
                alt={speaker.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                <User className="w-6 h-6 text-primary-400 dark:text-primary-500" />
              </div>
            )}
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <a 
                    href={`/speakers/${speaker.slug || speaker.id}`} 
                    className="hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {speaker.name}
                  </a>
                </h3>
                
                {speaker.is_featured && (
                  <span className="inline-flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded text-xs font-medium">
                    ⭐ Рекомендуемый
                  </span>
                )}
                
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  speaker.status === 'active' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : speaker.status === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {speaker.status === 'active' ? 'Активный' :
                   speaker.status === 'pending' ? 'На рассмотрении' :
                   speaker.status === 'inactive' ? 'Неактивный' : speaker.status}
                </span>
              </div>

              {speaker.field_of_expertise && (
                <p className="text-primary-600 dark:text-primary-400 font-medium text-sm mb-2">
                  {speaker.field_of_expertise}
                </p>
              )}

              {speaker.bio && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                  {speaker.bio}
                </p>
              )}

              {/* Социальные ссылки */}
              {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                <div className="flex items-center space-x-3">
                  {speaker.sh_speaker_social_links
                    .filter(link => link.is_public && link.is_primary)
                    .slice(0, 4)
                    .map((social) => {
                      const getSocialIcon = (platform: string) => {
                        const icons = {
                          website: '🌐',
                          linkedin: '💼',
                          twitter: '🐦',
                          instagram: '📷',
                          facebook: '📘',
                          youtube: '📺',
                          github: '💻'
                        };
                        return icons[platform as keyof typeof icons] || '🔗';
                      };

                      return (
                        <a
                          key={social.id}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm"
                          title={social.display_name || social.platform}
                        >
                          {getSocialIcon(social.platform)} {social.display_name || social.platform}
                        </a>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakersList;
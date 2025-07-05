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
              className="text-sm text-primary-600 dark:text-primary-400
import { useState, useEffect } from 'react';
import { Search, Heart, Filter } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import SpeakersGrid, { Speaker } from '../components/speakers/SpeakersGrid';
import { useAuth } from '../contexts/AuthContext';
import { useFavoriteSpeakers } from '../hooks/useFavorites';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type SortOption = 'name-asc' | 'name-desc' | 'field-asc' | 'field-desc';
type FilterOption = 'all' | 'favorites';

const SpeakersPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Хук для работы с избранными спикерами
  const { favoriteSpeakers, isFavoriteSpeaker } = useFavoriteSpeakers(user?.id);

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        let query = supabase
          .from('speakers')
          .select('*')
          .eq('active', true);

        // Apply sorting
        switch (sortBy) {
          case 'name-asc':
            query = query.order('name', { ascending: true });
            break;
          case 'name-desc':
            query = query.order('name', { ascending: false });
            break;
          case 'field-asc':
            query = query.order('field_of_expertise', { ascending: true });
            break;
          case 'field-desc':
            query = query.order('field_of_expertise', { ascending: false });
            break;
        }

        const { data, error } = await query;
        if (error) throw error;
        setSpeakers(data || []);
      } catch (err) {
        console.error('Error fetching speakers:', err);
        setError('Failed to load speakers');
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakers();
  }, [sortBy]);

  // Фильтрация спикеров (только по избранному, поиск остается в SpeakersGrid)
  const filteredSpeakers = speakers.filter(speaker => {
    // Фильтр по избранному
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'favorites' && isFavoriteSpeaker(speaker.id));

    return matchesFilter;
  });

  return (
    <Layout>
      <PageHeader 
        title="Наши спикеры" 
        subtitle="Учёные и эксперты в своих областях"
      />
      
      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
          {/* Search, Filter and Sort */}
          <div className="mb-8 space-y-4">
            {/* Первая строка: поиск и сортировка */}
            <div className="flex flex-col md:flex-row gap-6 justify-between">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Поиск по имени или специализации..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-80 px-4 py-2 pl-10 border border-dark-300 dark:border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-800"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-dark-300 dark:border-dark-700 rounded-md bg-white dark:bg-dark-800"
              >
                <option value="name-asc">По имени (А-Я)</option>
                <option value="name-desc">По имени (Я-А)</option>
                <option value="field-asc">По специализации (А-Я)</option>
                <option value="field-desc">По специализации (Я-А)</option>
              </select>
            </div>

            {/* Вторая строка: фильтры и статистика */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Фильтры */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Показать:
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterBy('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filterBy === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
                    }`}
                  >
                    Все спикеры
                  </button>
                  
                  {user && (
                    <button
                      onClick={() => setFilterBy('favorites')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        filterBy === 'favorites'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-600'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${filterBy === 'favorites' ? 'fill-current' : ''}`} />
                      Избранные ({favoriteSpeakers.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Статистика */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Показано: {filteredSpeakers.length} из {speakers.length}
                </span>
                {user && favoriteSpeakers.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                    {favoriteSpeakers.length} в избранном
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Уведомление для неавторизованных пользователей */}
          {!user && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Совет:</strong> Войдите в систему, чтобы добавлять спикеров в избранное и создавать персональные списки.
              </p>
            </div>
          )}

          {/* Состояние пустого поиска/фильтра */}
          {filteredSpeakers.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mb-4">
                {filterBy === 'favorites' ? (
                  <Heart className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" />
                ) : (
                  <Search className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filterBy === 'favorites' ? 'Нет избранных спикеров' : 'Спикеры не найдены'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {filterBy === 'favorites' 
                  ? 'Добавьте спикеров в избранное, нажав на ❤️ в их карточках'
                  : searchQuery 
                    ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить поисковый запрос.`
                    : 'Попробуйте изменить фильтры или поисковый запрос.'
                }
              </p>
              {filterBy === 'favorites' && (
                <button
                  onClick={() => setFilterBy('all')}
                  className="btn-primary"
                >
                  Посмотреть всех спикеров
                </button>
              )}
            </div>
          )}

          {/* Speakers grid */}
          {filteredSpeakers.length > 0 && (
            <SpeakersGrid 
              speakers={filteredSpeakers}
              searchQuery={searchQuery} // Передаем searchQuery в SpeakersGrid для поиска
            />
          )}

          {/* Состояние загрузки */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          )}

          {/* Состояние ошибки */}
          {error && (
            <div className="text-center py-12">
              <div className="text-red-500 dark:text-red-400 mb-4">
                <p className="text-lg font-medium">Ошибка загрузки</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default SpeakersPage;
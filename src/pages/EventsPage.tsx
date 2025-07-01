import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Search, Filter, Grid, List, Calendar, Clock, MapPin, Users, Globe, Tag, DollarSign, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import EventsList from '../components/events/EventsList';
import { 
  EventType, 
  PaymentType, 
  EventStatus,
  EVENT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  STATUS_LABELS,
  eventTypes,
  paymentTypes,
  statuses,
  mapLegacyEventType,
  mapLegacyPaymentType
} from '../pages/admin/constants';
import { 
  migrateEventToModern,
  getEventTypeLabel,
  getPaymentTypeLabel,
  isValidEventType,
  isValidPaymentType,
  isValidEventStatus
} from '../utils/migrationUtils';
import { formatRussianDate } from '../utils/dateTimeUtils';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Обновленный интерфейс Event
interface Event {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  event_type: EventType | string;
  status: EventStatus | string;
  payment_type: PaymentType | string;
  bg_image?: string;
  price?: number | null;
  currency?: string;
  age_category?: string;
  location?: string;
  languages?: string[];
  speakers?: string[];
  start_at?: string;
  end_at?: string;
  // Legacy поля
  date?: string;
  start_time?: string;
  end_time?: string;
}

// Интерфейс фильтров
interface EventFilters {
  status?: EventStatus[];
  event_type?: EventType[];
  payment_type?: PaymentType[];
  age_category?: string[];
  search?: string;
}

// Статистика по событиям
interface EventStats {
  [key: string]: number;
}

const EventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Состояние
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<EventStats>({});

  // Фильтры
  const [filters, setFilters] = useState<EventFilters>({
    status: [],
    event_type: [],
    payment_type: [],
    age_category: [],
    search: searchParams.get('search') || ''
  });

  // Инициализация фильтров из URL
  useEffect(() => {
    const urlFilters: EventFilters = {
      status: [],
      event_type: [],
      payment_type: [],
      age_category: [],
      search: searchParams.get('search') || ''
    };

    // Парсим фильтры из URL
    const statusParam = searchParams.get('status');
    if (statusParam) {
      urlFilters.status = statusParam.split(',').filter(isValidEventStatus);
    }

    const typeParam = searchParams.get('type');
    if (typeParam) {
      // Мигрируем старые значения типов
      urlFilters.event_type = typeParam.split(',')
        .map(mapLegacyEventType)
        .filter(isValidEventType);
    }

    const paymentParam = searchParams.get('payment');
    if (paymentParam) {
      // Мигрируем старые значения оплаты
      urlFilters.payment_type = paymentParam.split(',')
        .map(mapLegacyPaymentType)
        .filter(isValidPaymentType);
    }

    const ageParam = searchParams.get('age');
    if (ageParam) {
      urlFilters.age_category = ageParam.split(',').filter(age => 
        ['0+', '6+', '12+', '16+', '18+'].includes(age)
      );
    }

    setFilters(urlFilters);
    setSearchQuery(urlFilters.search || '');
  }, [searchParams]);

  // Загрузка событий
  useEffect(() => {
    fetchEvents();
  }, []);

  // Обновление URL при изменении фильтров
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.event_type && filters.event_type.length > 0) {
      params.set('type', filters.event_type.join(','));
    }
    if (filters.payment_type && filters.payment_type.length > 0) {
      params.set('payment', filters.payment_type.join(','));
    }
    if (filters.age_category && filters.age_category.length > 0) {
      params.set('age', filters.age_category.join(','));
    }

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('start_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Мигрируем события к новому формату
      const migratedEvents = (data || []).map(migrateEventToModern);
      setEvents(migratedEvents);

      // Вычисляем статистику
      calculateStats(migratedEvents);

    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Ошибка при загрузке мероприятий');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (eventsList: Event[]) => {
    const newStats: EventStats = {};

    // Статистика по статусам
    statuses.forEach(status => {
      newStats[status] = eventsList.filter(event => event.status === status).length;
    });

    // Статистика по типам
    eventTypes.forEach(type => {
      newStats[type] = eventsList.filter(event => event.event_type === type).length;
    });

    // Статистика по типам оплаты
    paymentTypes.forEach(type => {
      newStats[type] = eventsList.filter(event => event.payment_type === type).length;
    });

    setStats(newStats);
  };

  // Фильтрация событий
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Фильтр по поиску
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.short_description && event.short_description.toLowerCase().includes(searchLower)) ||
        (event.location && event.location.toLowerCase().includes(searchLower)) ||
        getEventTypeLabel(event.event_type as string).toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по статусу
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(event => 
        filters.status!.includes(event.status as EventStatus)
      );
    }

    // Фильтр по типу события
    if (filters.event_type && filters.event_type.length > 0) {
      filtered = filtered.filter(event => 
        filters.event_type!.includes(event.event_type as EventType)
      );
    }

    // Фильтр по типу оплаты
    if (filters.payment_type && filters.payment_type.length > 0) {
      filtered = filtered.filter(event => 
        filters.payment_type!.includes(event.payment_type as PaymentType)
      );
    }

    // Фильтр по возрастной категории
    if (filters.age_category && filters.age_category.length > 0) {
      filtered = filtered.filter(event => 
        event.age_category && filters.age_category!.includes(event.age_category)
      );
    }

    return filtered;
  }, [events, filters]);

  // Обработчики фильтров
  const toggleEventStatus = (status: EventStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status]
    }));
  };

  const toggleEventType = (type: EventType) => {
    setFilters(prev => ({
      ...prev,
      event_type: prev.event_type?.includes(type)
        ? prev.event_type.filter(t => t !== type)
        : [...(prev.event_type || []), type]
    }));
  };

  const togglePaymentType = (type: PaymentType) => {
    setFilters(prev => ({
      ...prev,
      payment_type: prev.payment_type?.includes(type)
        ? prev.payment_type.filter(t => t !== type)
        : [...(prev.payment_type || []), type]
    }));
  };

  const toggleAgeCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      age_category: prev.age_category?.includes(category)
        ? prev.age_category.filter(c => c !== category)
        : [...(prev.age_category || []), category]
    }));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setFilters(prev => ({
      ...prev,
      search: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      event_type: [],
      payment_type: [],
      age_category: [],
      search: ''
    });
    setSearchQuery('');
  };

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.event_type && filters.event_type.length > 0) ||
      (filters.payment_type && filters.payment_type.length > 0) ||
      (filters.age_category && filters.age_category.length > 0)
    );
  };




  // ====================================/ 1 ================================

  
  // ==================================== 2 ================================

if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <X className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
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
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Мероприятия
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Найдите интересные мероприятия и присоединяйтесь к нам
          </p>
        </div>

        {/* Поиск и управление */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Поиск */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск мероприятий..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Управление */}
            <div className="flex items-center gap-3">
              {/* Кнопка фильтров */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters()
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Фильтры</span>
                {hasActiveFilters() && (
                  <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                    {(filters.status?.length || 0) + 
                     (filters.event_type?.length || 0) + 
                     (filters.payment_type?.length || 0) + 
                     (filters.age_category?.length || 0)}
                  </span>
                )}
              </button>

              {/* Переключатель вида */}
              <div className="flex items-center border border-gray-300 dark:border-dark-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                  title="Сетка"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
                  title="Список"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Активные фильтры */}
          {hasActiveFilters() && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Активные фильтры:</span>
              
              {/* Фильтры по статусу */}
              {filters.status?.map(status => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                >
                  {STATUS_LABELS[status]}
                  <button
                    onClick={() => toggleEventStatus(status)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* Фильтры по типу */}
              {filters.event_type?.map(type => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded-full"
                >
                  {EVENT_TYPE_LABELS[type]}
                  <button
                    onClick={() => toggleEventType(type)}
                    className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* Фильтры по оплате */}
              {filters.payment_type?.map(type => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                >
                  {PAYMENT_TYPE_LABELS[type]}
                  <button
                    onClick={() => togglePaymentType(type)}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* Фильтры по возрасту */}
              {filters.age_category?.map(category => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-xs rounded-full"
                >
                  {category}
                  <button
                    onClick={() => toggleAgeCategory(category)}
                    className="hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* Кнопка очистки всех фильтров */}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Очистить все
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Боковая панель с фильтрами */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Фильтры</h3>
                  {hasActiveFilters() && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      Очистить
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Статус события */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Статус
                    </label>
                    <div className="space-y-2">
                      {(['active', 'draft', 'past'] as EventStatus[]).map(status => (
                        <label key={status} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.status?.includes(status) || false}
                            onChange={() => toggleEventStatus(status)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {STATUS_LABELS[status]} 
                            {stats[status] > 0 && (
                              <span className="text-gray-500 ml-1">({stats[status]})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Тип события */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Тип события
                    </label>
                    <div className="space-y-2">
                      {eventTypes.map(type => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.event_type?.includes(type) || false}
                            onChange={() => toggleEventType(type)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {EVENT_TYPE_LABELS[type]}
                            {stats[type] > 0 && (
                              <span className="text-gray-500 ml-1">({stats[type]})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>




                  {/* ======================== 2 =========================== */}

                  
                  {/* ======================== 3 =========================== */}




  
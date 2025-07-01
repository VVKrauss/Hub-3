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






  
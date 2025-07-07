// src/pages/admin/AdminEvents.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeRange, formatTimeFromTimestamp, isPastEvent } from '../../utils/dateUtils';
import EventDetailsModal from '../../components/admin/EventDetailsModal';

// Интерфейс для события
interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at?: string;
  status: 'active' | 'draft' | 'past';
  payment_type: 'free' | 'cost' | 'donation';
  price?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  
  // Поля регистраций (старая система)
  registrations?: {
    current: number;
    max_regs?: number;
    reg_list?: any[];
    current_adults?: number;
    current_children?: number;
  };
  registrations_list?: any[];
  current_registration_count?: string | number;
  max_registrations?: number;
  active_registrations_count?: number;
  total_registrations_count?: number;
  current_registrations?: number;
  available_spots?: number;
  
  // Новые поля для работы с sh_registrations
  sh_registrations_count?: number;
  max_attendees?: number;
}

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    past: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };

  // Функция для загрузки событий из новой таблицы sh_events
  const fetchEventsFromNewTable = async () => {
    console.log('🔄 Trying to load from sh_events...');
    
    let query = supabase
      .from('sh_events')
      .select('*');

    // Применяем фильтр статуса
    if (statusFilter === 'active') {
      query = query.eq('status', 'active');
    } else if (statusFilter === 'past') {
      query = query.eq('status', 'past');
    } else if (statusFilter === 'draft') {
      query = query.eq('status', 'draft');
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Сортировка
    if (sortBy === 'date') {
      query = query.order('start_at', { ascending: true });
    } else if (sortBy === 'created') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'title') {
      query = query.order('title', { ascending: true });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching from sh_events:', error);
      // Fallback к старой таблице если новая не работает
      return fetchEventsFromOldTable();
    }

    console.log('✅ Loaded from sh_events:', data?.length, 'events');

    // Преобразуем данные из новой схемы в формат, ожидаемый интерфейсом
    const enrichedEvents = (data || []).map(event => ({
      ...event,
      // Маппинг полей из новой схемы в старый формат для совместимости
      location: event.venue_name,
      address: event.venue_address,
      price: event.base_price,
      payment_type: event.payment_type,
      description: event.description || event.short_description,
      event_type: event.event_type,
      
      // Информация о регистрации (пока используем заглушки)
      registrations: {
        current: 0, // TODO: добавить подсчет из таблицы регистраций
        max_regs: event.max_attendees
      },
      current_registration_count: 0, // TODO: добавить подсчет из таблицы регистраций
      max_registrations: event.max_attendees,
      
      // Используем данные из старой системы как fallback
      active_registrations_count: 0,
      total_registrations_count: 0,
      current_registrations: 0,
      available_spots: event.max_attendees
    }));

    // НОВАЯ ЛОГИКА: Получаем актуальное количество регистраций из sh_registrations
    const eventsWithRegistrationCounts = await Promise.all(
      enrichedEvents.map(async (event) => {
        const { count } = await supabase
          .from('sh_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('registration_status', 'active');

        return {
          ...event,
          sh_registrations_count: count || 0,
          // Обновляем и старые поля для совместимости
          active_registrations_count: count || 0,
          current_registration_count: count || 0,
          registrations: {
            ...event.registrations,
            current: count || 0
          }
        };
      })
    );

    return eventsWithRegistrationCounts;
  };

  // Fallback функция для загрузки из старой таблицы
  const fetchEventsFromOldTable = async () => {
    console.log('📦 Fallback to events table...');
    
    let query = supabase
      .from('events')
      .select('*');

    // Применяем фильтры и сортировку
    if (statusFilter === 'active') {
      query = query.eq('status', 'active');
    } else if (statusFilter === 'past') {
      query = query.eq('status', 'past');  
    } else if (statusFilter === 'draft') {
      query = query.eq('status', 'draft');
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (sortBy === 'date') {
      query = query.order('start_at', { ascending: true });
    } else if (sortBy === 'created') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'title') {
      query = query.order('title', { ascending: true });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    console.log('📦 Loaded from events table:', data?.length, 'events');
    return data || [];
  };

  // Основная функция загрузки событий
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      
      // Сначала пробуем загрузить из новой таблицы
      const eventsData = await fetchEventsFromNewTable();
      setEvents(eventsData);
      
    } catch (error) {
      console.error('Error in fetchEvents:', error);
      toast.error('Ошибка при загрузке мероприятий');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, sortBy]);

  // Функция удаления событий
  const handleDeleteEvents = async () => {
    if (!confirm(`Вы уверены, что хотите удалить ${selectedEvents.length} ${selectedEvents.length === 1 ? 'мероприятие' : 'мероприятия'}?`)) {
      return;
    }

    try {
      // Пробуем удалить из новой таблицы sh_events
      let { error } = await supabase
        .from('sh_events')
        .delete()
        .in('id', selectedEvents);

      if (error) {
        console.log('Failed to delete from sh_events, trying events table:', error);
        
        // Если не получилось, удаляем из старой таблицы
        const { error: oldTableError } = await supabase
          .from('events')
          .delete()
          .in('id', selectedEvents);

        if (oldTableError) throw oldTableError;
      }

      toast.success(`Удалено ${selectedEvents.length} ${selectedEvents.length === 1 ? 'мероприятие' : 'мероприятия'}`);
      setSelectedEvents([]);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Ошибка при удалении мероприятий'); 
    }
  };

  const toggleEventSelection = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvents(prev => 
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const toggleAllEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event.id));
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // ОБНОВЛЕННЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С РЕГИСТРАЦИЯМИ
  
  // Helper function to get current registration count from either new or legacy structure
  const getCurrentRegistrationCount = (event: Event): number => {
    // НОВАЯ ЛОГИКА - приоритет данным из sh_registrations
    if (event.sh_registrations_count !== undefined) {
      return event.sh_registrations_count;
    }
    
    // Фоллбэк на старую систему
    if (event.registrations?.current !== undefined) {
      return event.registrations.current;
    }
    
    // Последний фоллбэк
    return typeof event.current_registration_count === 'string' 
      ? parseInt(event.current_registration_count) || 0
      : event.current_registration_count || 0;
  };

  // Helper function to get max registrations from either new or legacy structure
  const getMaxRegistrations = (event: Event): number | null => {
    // НОВАЯ ЛОГИКА - приоритет новой системе
    if (event.max_attendees !== undefined) {
      return event.max_attendees;
    }
    
    // Фоллбэк на старую систему
    if (event.registrations?.max_regs !== undefined) {
      return event.registrations.max_regs;
    }
    return event.max_registrations || null;
  };
  // Helper function to get price display text based on payment type
  const getPriceDisplay = (event: Event): string => {
    const paymentType = event.payment_type;
    const price = event.price;

    if (paymentType === 'free') {
      return 'Бесплатно';
    } else if (paymentType === 'donation') {
      return 'Донат';
    } else if (paymentType === 'cost' && price !== null && price !== undefined) {
      return price === 0 ? 'Бесплатно' : `${price} ${event.currency || 'RUB'}`;
    } else {
      return 'Бесплатно';
    }
  };

  // Проверяет, нужно ли показывать информацию о регистрациях
  const shouldShowRegistrations = (event: Event): boolean => {
    const currentCount = getCurrentRegistrationCount(event);
    const maxRegs = getMaxRegistrations(event);
    
    return (
      currentCount > 0 || // Есть регистрации
      maxRegs !== null || // Установлен лимит
      event.payment_type !== 'free' || // Платное мероприятие
      event.status === 'active' // Активное мероприятие
    );
  };

  // Проверяет, есть ли система регистраций в мероприятии
  const hasRegistrationSystem = (event: Event): boolean => {
    return !!(event.registrations || event.registrations_list || event.current_registration_count !== undefined);
  };

  // Функция для отображения даты и времени
  const formatEventDateTime = (event: Event): string => {
    if (!event.start_at) return 'Время не указано';
    
    const dateStr = formatRussianDate(event.start_at);
    const timeStr = event.end_at 
      ? formatTimeRange(event.start_at, event.end_at)
      : formatTimeFromTimestamp(event.start_at);
    
    return `${dateStr} • ${timeStr}`;
  };

  // Функция для форматирования заголовка в две строки
  const formatEventTitle = (title: string) => {
    const words = title.split(' ');
    if (words.length <= 4) return { line1: title, line2: null };
    
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    
    return { line1, line2 };
  };

  // Открытие модального окна с деталями
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const tabs = [
    { id: 'active', label: 'Активные', count: events.filter(e => e.status === 'active' && (!e.end_at || !isPastEvent(e.end_at))).length },
    { id: 'past', label: 'Прошедшие', count: events.filter(e => e.status === 'past' || (e.end_at && isPastEvent(e.end_at))).length },
    { id: 'draft', label: 'Черновики', count: events.filter(e => e.status === 'draft').length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление мероприятиями
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Создавайте, редактируйте и управляйте своими мероприятиями
          </p>
        </div>

        {/* Кнопка создания */}
        <div className="flex justify-center mb-10">
          <Link 
            to="/admin/events/new"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-heading"
          >
            <Plus className="h-6 w-6" />
            Создать мероприятие
          </Link>
        </div>

        {/* Панель управления */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-dark-700 mb-8">
          {/* Табы */}
          <div className="border-b border-gray-200 dark:border-dark-600">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    statusFilter === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Поиск и фильтры */}
          <div className="p-6 border-b border-gray-200 dark:border-dark-600">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Поиск мероприятий..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                >
                  <option value="created">По дате создания</option>
                  <option value="date">По дате события</option>
                  <option value="title">По названию</option>
                </select>
              </div>
            </div>

            {/* Массовые действия */}
            {selectedEvents.length > 0 && (
              <div className="mt-4 flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                <span className="text-primary-700 dark:text-primary-300 font-medium">
                  Выбрано: {selectedEvents.length} мероприятий
                </span>
                <button
                  onClick={handleDeleteEvents}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Список событий */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="relative inline-block">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-primary-200 dark:border-primary-800 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Загрузка мероприятий...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-primary-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-heading">
              Мероприятия не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchQuery 
                ? 'Попробуйте изменить параметры поиска или создайте новое мероприятие'
                : 'Создайте первое мероприятие, чтобы начать привлекать участников'}
            </p>
            <Link 
              to="/admin/events/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-heading"
            >
              <Plus className="h-5 w-5" />
              Создать мероприятие
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => {
              const { line1, line2 } = formatEventTitle(event.title);
              const maxRegistrations = getMaxRegistrations(event);
              const currentRegistrationCount = getCurrentRegistrationCount(event);
              const fillPercentage = maxRegistrations ? (currentRegistrationCount / maxRegistrations) * 100 : 0;
              const isEventPast = event.end_at ? isPastEvent(event.end_at) : false;
            
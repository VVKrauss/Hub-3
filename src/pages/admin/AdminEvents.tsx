// src/pages/admin/AdminEvents.tsx - Часть 1: Импорты, типы, константы

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Eye, Calendar, Users, MapPin, Trash2, Filter, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import EventDetailsModal from '../../components/admin/EventDetailsModal';
import { Event, EventRegistrations } from './constants';
import { 
  formatRussianDate,
  formatTimeFromTimestamp, 
  formatTimeRange,
  isPastEvent,
  formatDateTimeForDisplay 
} from '../../utils/dateTimeUtils';

// Типы для сортировки и фильтрации
type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'chronological';
type FilterStatus = 'active' | 'draft' | 'past';

// Константы для стилизации статусов
const statusColors = {
  active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
  draft: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
  past: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-400'
};

// Utility функция для форматирования заголовка события
const formatEventTitle = (title: string) => {
  const maxLength = 50;
  const maxLineLength = 30;
  
  if (title.length <= maxLength) {
    const words = title.split(' ');
    if (words.length <= 2) {
      return {
        line1: words[0] || ' ',
        line2: words[1] || ' '
      };
    }
    
    const middle = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, middle).join(' '),
      line2: words.slice(middle).join(' ')
    };
  }
  
  return {
    line1: title.substring(0, maxLineLength),
    line2: title.substring(maxLineLength, maxLength - 3) + '...'
  };
};

// src/pages/admin/AdminEvents.tsx - Часть 2: Основной компонент и состояние

const AdminEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('chronological');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [sortBy, statusFilter]);

  // 🔧 **ОБНОВЛЕННАЯ ФУНКЦИЯ fetchEvents для работы с sh_events**
  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching events with filters:', { statusFilter, sortBy });

      // ИЗМЕНЕНО: Сначала пытаемся загрузить из новой таблицы sh_events
      let query = supabase
        .from('sh_events')
        .select(`
          *,
          sh_event_speakers(
            id,
            speaker:sh_speakers(
              id,
              name,
              avatar_url,
              field_of_expertise
            )
          )
        `);

      // Фильтрация по статусу для новой таблицы
      if (statusFilter === 'past') {
        query = query.in('status', ['completed', 'cancelled']);
      } else if (statusFilter === 'active') {
        query = query.eq('status', 'published');
      } else if (statusFilter === 'draft') {
        query = query.eq('status', 'draft');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Сортировка для новой таблицы
      if (sortBy === 'date' || sortBy === 'date-asc') {
        query = query.order('start_at', { ascending: true });
      } else if (sortBy === 'date-desc') {
        query = query.order('start_at', { ascending: false });
      } else if (sortBy === 'created') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'title' || sortBy === 'title-asc') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'title-desc') {
        query = query.order('title', { ascending: false });
      } else if (sortBy === 'chronological') {
        // Хронологический: сначала будущие по дате, потом прошедшие по убыванию
        query = query.order('start_at', { ascending: true });
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching from sh_events:', error);
        console.log('🔄 Fallback: Trying old events table...');
        // Fallback к старой таблице если новая не работает
        return await fetchEventsFromOldTable();
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
        
        // Информация о регистрации
        registrations: {
          current: 0, // TODO: добавить подсчет из таблицы регистраций
          max_regs: event.max_attendees
        },
        current_registration_count: 0, // TODO: добавить подсчет из таблицы регистраций
        max_registrations: event.max_attendees,
        
        // Спикеры из новой схемы
        speakers: event.sh_event_speakers?.map(es => es.speaker) || [],
        
        // Статусы для совместимости с UI
        status: event.status === 'published' ? 'active' : event.status
      }));

      setEvents(enrichedEvents);
    } catch (error) {
      console.error('❌ Error in fetchEvents:', error);
      // В случае критической ошибки пытаемся загрузить из старой таблицы
      await fetchEventsFromOldTable();
    } finally {
      setLoading(false);
    }
  };

  // Добавьте эту функцию для fallback
  const fetchEventsFromOldTable = async () => {
    try {
      console.log('🔄 Fallback: Loading from old events table...');
      
      let query = supabase
        .from('events')
        .select(`
          *,
          time_slot:sh_time_slots!event_id(
            id,
            start_at,
            end_at
          )
        `);

      // Фильтрация по статусу для старой таблицы
      if (statusFilter === 'past') {
        query = query.or('status.eq.past,status.eq.active');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Сортировка для старой таблицы
      if (sortBy === 'date' || sortBy === 'date-asc') {
        query = query.order('start_at', { ascending: true });
      } else if (sortBy === 'date-desc') {
        query = query.order('start_at', { ascending: false });
      } else if (sortBy === 'created') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'title' || sortBy === 'title-asc') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'title-desc') {
        query = query.order('title', { ascending: false });
      } else if (sortBy === 'chronological') {
        query = query.order('start_at', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log('✅ Fallback loaded from events:', data?.length, 'events');

      // Обогащаем события временными данными из sh_time_slots
      const enrichedEvents = (data || []).map(event => ({
        ...event,
        start_at: event.time_slot?.[0]?.start_at || event.start_at,
        end_at: event.time_slot?.[0]?.end_at || event.end_at
      }));

      setEvents(enrichedEvents);
    } catch (error) {
      console.error('❌ Error in fallback fetch:', error);
      setEvents([]);
      toast.error('Ошибка при загрузке мероприятий');
    }
  };

  // src/pages/admin/AdminEvents.tsx - Часть 3: Функции обработчики и helpers

  // 🔧 **ОБНОВЛЕННАЯ ФУНКЦИЯ handleBulkDelete для работы с sh_events**
  const handleBulkDelete = async () => {
    if (selectedEvents.length === 0) return;
    
    const count = selectedEvents.length;
    if (!confirm(`Вы уверены, что хотите удалить ${count} ${count === 1 ? 'мероприятие' : 'мероприятия'}?`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting events from sh_events:', selectedEvents);
      
      // ИЗМЕНЕНО: Удаляем из новой таблицы sh_events
      const { error } = await supabase
        .from('sh_events')
        .delete()
        .in('id', selectedEvents);
     
      if (error) {
        console.error('Error deleting from sh_events:', error);
        // Fallback: пытаемся удалить из старой таблицы
        console.log('🔄 Fallback: Deleting from old events table...');
        
        const { error: fallbackError } = await supabase
          .from('events')
          .delete()
          .in('id', selectedEvents);
          
        if (fallbackError) throw fallbackError;
        console.log('✅ Fallback deletion successful');
      } else {
        console.log('✅ Successfully deleted from sh_events');
      }

      toast.success(`Успешно удалено ${count} ${count === 1 ? 'мероприятие' : 'мероприятия'}`);
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

  // Helper function to get current registration count from either new or legacy structure
  const getCurrentRegistrationCount = (event: Event): number => {
    if (event.registrations?.current !== undefined) {
      return event.registrations.current;
    }
    return event.current_registration_count || 0;
  };

  // Helper function to get max registrations from either new or legacy structure
  const getMaxRegistrations = (event: Event): number | null => {
    if (event.registrations?.max_regs !== undefined) {
      return event.registrations.max_regs;
    }
    return event.max_registrations || null;
  };

  // 🔧 **ОБНОВЛЕННАЯ ФУНКЦИЯ getPriceDisplay для работы с новой схемой**
  const getPriceDisplay = (event: Event): string => {
    const paymentType = event.payment_type;
    
    // Для новой схемы используем base_price, для старой - price
    const price = event.base_price !== undefined ? event.base_price : event.price;

    if (paymentType === 'free') {
      return 'Бесплатно';
    } else if (paymentType === 'donation') {
      return 'Донат';
    } else if (paymentType === 'paid' && price !== null && price !== undefined) {
      return price === 0 ? 'Бесплатно' : `${price} ${event.currency || 'RUB'}`;
    } else if (paymentType === 'cost' && price !== null && price !== undefined) {
      // Совместимость со старой схемой
      return price === 0 ? 'Бесплатно' : `${price} ${event.currency || 'RUB'}`;
    } else {
      return 'Бесплатно';
    }
  };

  // Дополнительные helper функции для новой схемы
  const getEventLocation = (event: Event): string => {
    // Для новой схемы используем venue_name, для старой - location
    const location = event.venue_name || event.location;
    return location || 'Место не указано';
  };

  const getEventAddress = (event: Event): string => {
    // Для новой схемы используем venue_address, для старой - address
    const address = event.venue_address || event.address;
    return address || '';
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

  const tabs = [
    { id: 'active', label: 'Активные', count: events.filter(e => e.status === 'active' && (!e.end_at || !isPastEvent(e.end_at))).length },
    { id: 'past', label: 'Прошедшие', count: events.filter(e => e.status === 'past' || (e.end_at && isPastEvent(e.end_at))).length },
    { id: 'draft', label: 'Черновики', count: events.filter(e => e.status === 'draft').length }
  ];

  // src/pages/admin/AdminEvents.tsx - Часть 4: JSX рендер часть 1

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

        {/* Фильтры и поиск */}
        <div className="mb-8 space-y-6">
          {/* Табы статусов */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'active', label: 'Активные', count: tabs.find(t => t.id === 'active')?.count || 0 },
              { id: 'past', label: 'Прошедшие', count: tabs.find(t => t.id === 'past')?.count || 0 },
              { id: 'draft', label: 'Черновики', count: tabs.find(t => t.id === 'draft')?.count || 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as FilterStatus)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  statusFilter === tab.id
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-dark-700 shadow-md'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === tab.id
                      ? 'bg-white text-primary-500'
                      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Поиск и инструменты */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Поиск */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Поиск мероприятий..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>

            {/* Инструменты */}
            <div className="flex items-center gap-3">
              {/* Сортировка */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 border border-gray-300 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-white transition-all duration-300"
              >
                <option value="chronological">Хронологически</option>
                <option value="date-asc">Дата ↑</option>
                <option value="date-desc">Дата ↓</option>
                <option value="title-asc">Название ↑</option>
                <option value="title-desc">Название ↓</option>
              </select>

              {/* Массовые действия */}
              {selectedEvents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Выбрано: {selectedEvents.length}
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

     // src/pages/admin/AdminEvents.tsx - Часть 5: JSX рендер часть 2 - карточки событий

        {/* Контент */}
        {loading ? (
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

              return (
                <div
                  key={event.id}
                  className="group bg-white dark:bg-dark-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-200 dark:border-dark-600 relative cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowDetailsModal(true);
                  }}
                >
                  {/* Checkbox для выбора */}
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => toggleEventSelection(event.id, e)}
                      className="w-5 h-5 text-primary-600 bg-white border-2 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Изображение мероприятия */}
                  <div className="relative h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center overflow-hidden">
                    {event.main_image ? (
                      <img 
                        src={event.main_image} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <Calendar className="w-16 h-16 text-primary-400 dark:text-primary-500" />
                    )}
                    
                    {/* Статус мероприятия */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isEventPast 
                          ? statusColors.past
                          : statusColors[event.status as keyof typeof statusColors]
                      }`}>
                        {isEventPast ? 'Прошло' : 
                         event.status === 'active' ? 'Активно' : 
                         event.status === 'draft' ? 'Черновик' : 'Прошло'}
                      </span>
                    </div>
                  </div>

                  // src/pages/admin/AdminEvents.tsx - Часть 6: JSX рендер часть 3 - продолжение карточек

                  {/* Изображение мероприятия */}
                  <div className="relative h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center overflow-hidden">
                    {event.main_image ? (
                      <img 
                        src={event.main_image} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <Calendar className="w-16 h-16 text-primary-400 dark:text-primary-500" />
                    )}
                    
                    {/* Статус мероприятия */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isEventPast 
                          ? statusColors.past
                          : statusColors[event.status as keyof typeof statusColors]
                      }`}>
                        {isEventPast ? 'Прошло' : 
                         event.status === 'active' ? 'Активно' : 
                         event.status === 'draft' ? 'Черновик' : 'Прошло'}
                      </span>
                    </div>
                  </div>

                  {/* Контент карточки */}
                  <div className="p-6">
                    {/* Заголовок */}
                    <div className="h-[4rem] mb-4 overflow-hidden">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {line1}
                        {line2 && (
                          <>
                            <br />
                            {line2}
                          </>
                        )}
                      </h3>
                    </div>
                    
                    {/* Детали мероприятия */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                          <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <span className="truncate font-medium">{formatEventDateTime(event)}</span>
                      </div>
                      
                      {getEventLocation(event) && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                            <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <span className="truncate font-medium">{getEventLocation(event)}</span>
                        </div>
                      )}
                      
                      {/* Информация о регистрациях */}
                      {shouldShowRegistrations(event) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <span className="font-medium">
                                {hasRegistrationSystem(event) ?
                                  `${currentRegistrationCount}${maxRegistrations ? `/${maxRegistrations}` : ''}` :
                                  'Без регистрации'
                                }
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                              {getPriceDisplay(event)}
                            </span>
                          </div>
                          
                          {/* Прогресс-бар для заполненности */}
                          {maxRegistrations && maxRegistrations > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setShowDetailsModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Просмотр
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/events/${event.id}/edit`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Изменить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно деталей события */}
      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEvent(null);
          }}
          onEdit={(eventId) => {
            setShowDetailsModal(false);
            setSelectedEvent(null);
            navigate(`/admin/events/${eventId}/edit`);
          }}
          onRefresh={fetchEvents}
        />
      )}
    </div>
  );
};

export default AdminEvents;
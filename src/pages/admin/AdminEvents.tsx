import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';  // ✅ Правильный путь
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


type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'chronological';
type FilterStatus = 'active' | 'draft' | 'past';

const statusColors = {
  active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
  draft: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
  past: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-400'
};

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




const fetchEvents = async () => {
  try {
    setLoading(true);

    // ИЗМЕНЕНО: Используем новую таблицу sh_events вместо events
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
      
      // Спикеры
      speakers: event.sh_event_speakers?.map(es => es.speaker) || []
    }));

    setEvents(enrichedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    // В случае ошибки пытаемся загрузить из старой таблицы
    fetchEventsFromOldTable();
  } finally {
    setLoading(false);
  }
};

// Добавьте эту новую функцию для fallback
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

    // Сортировка
    if (sortBy === 'date') {
      query = query.order('start_at', { ascending: true });
    } else if (sortBy === 'created') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'title') {
      query = query.order('title', { ascending: true });
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
    console.error('Error in fallback fetch:', error);
    setEvents([]);
  }
};



  
// ЗАМЕНИТЬ handleDeleteSelected функцию:
const handleDeleteSelected = async () => {
  if (selectedEvents.length === 0) return;
  
  const count = selectedEvents.length;
  if (!confirm(`Вы уверены, что хотите удалить ${count} ${count === 1 ? 'мероприятие' : 'мероприятия'}? Связанные временные слоты также будут обновлены автоматически.`)) {
    return;
  }

  try {
    // ИЗМЕНЕНО: Благодаря foreign key constraint с ON DELETE SET NULL,
    // связанные слоты в sh_time_slots автоматически обновятся при удалении событий
    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', selectedEvents);
   
    if (error) throw error;

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
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-heading"
          >
            <Plus className="w-5 h-5" />
            Создать мероприятие
          </Link>
        </div>

        {/* Поиск и фильтры */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg mb-8 border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск мероприятий по названию, описанию или месту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                />
              </div>

              <div className="flex gap-4">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="pl-10 pr-8 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  >
                    <option value="chronological">Хронологически</option>
                    <option value="date-desc">Сначала новые</option>
                    <option value="date-asc">Сначала старые</option>
                    <option value="title-asc">По названию (А-Я)</option>
                    <option value="title-desc">По названию (Я-А)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Вкладки статусов */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-center">
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mx-6 my-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as FilterStatus)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 font-heading ${
                      statusFilter === tab.id
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                        statusFilter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Массовые действия */}
        {events.length > 0 && (
          <div className="mb-8 flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEvents.length > 0 && selectedEvents.length === filteredEvents.length}
                onChange={toggleAllEvents}
                onClick={toggleAllEvents}
                className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:checked:bg-primary-600"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">Выбрать все</span>
            </label>
            
            {selectedEvents.length > 0 && (
              <>
                <span className="text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                  Выбрано: {selectedEvents.length}
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить выбранные
                </button>
              </>
            )}
          </div>
        )}

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
                  className="group relative bg-white dark:bg-dark-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowDetailsModal(true);
                  }}
                >
                  {/* Чекбокс */}
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => e.stopPropagation()}
                      onClick={(e) => toggleEventSelection(event.id, e)}
                      className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:checked:bg-primary-600 shadow-lg"
                    />
                  </div>
                  
                  {/* Изображение мероприятия */}
                  <div 
                    className="h-48 bg-cover bg-center relative"
                    style={{ 
                      backgroundImage: event.bg_image 
                        ? `url(${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image})`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    {/* Градиентная полоска сверху */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>
                    
                    {/* Кнопки действий */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link
                        to={`/events/${event.id}`}
                        className="p-2 bg-white/90 hover:bg-white dark:bg-dark-700/90 dark:hover:bg-dark-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                        title="Просмотреть страницу"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      </Link>
                      <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="p-2 bg-white/90 hover:bg-white dark:bg-dark-700/90 dark:hover:bg-dark-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                        title="Редактировать"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      </Link>
                    </div>
                    
                    {/* Статус мероприятия */}
                    <div className="absolute bottom-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
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
                      
                      {event.location && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                            <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <span className="truncate font-medium">{event.location}</span>
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
                                {hasRegistrationSystem(event) ? 'Регистрации' : 'Участие'}
                              </span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {currentRegistrationCount}
                              {maxRegistrations && maxRegistrations > 0 ? `/${maxRegistrations}` : ''}
                            </span>
                          </div>
                          
                          {/* Прогресс-бар только при наличии лимита */}
                          {maxRegistrations && maxRegistrations > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              ></div>
                            </div>
                          )}
                          
                          {/* Статус для неограниченных регистраций */}
                          {(!maxRegistrations || maxRegistrations === 0) && currentRegistrationCount > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Без ограничений
                            </div>
                          )}
                          
                          {/* Показываем если система регистраций не настроена */}
                          {!hasRegistrationSystem(event) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Регистрация не требуется
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Цена */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Стоимость:</span>
                      <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
                        {getPriceDisplay(event)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        
        {/* Модальное окно деталей */}
        {selectedEvent && (
          <EventDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedEvent(null);
            }}
            event={selectedEvent}
          />
        )}
      </div>
    </div>
  );
};

export default AdminEvents;
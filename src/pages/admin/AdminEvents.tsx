// src/pages/admin/AdminEvents.tsx
// Обновленная версия для работы с новой системой регистраций (sh_events, sh_registrations)

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

// Интерфейс для события (совместимый с новой системой)
interface Event {
  // Поля из sh_events
  id: string;
  slug: string;
  title: string;
  short_description?: string;
  description?: string;
  event_type: string;
  status: 'draft' | 'active' | 'past' | 'cancelled';
  age_category: string;
  language_code: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  payment_type: 'free' | 'paid' | 'donation';
  base_price?: number;
  currency: string;
  registration_required: boolean;
  registration_enabled: boolean;
  max_attendees?: number;
  attendee_limit_per_registration: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  
  // Вычисляемые поля для регистраций
  sh_registrations_count?: number;
  
  // Для обратной совместимости с существующим кодом
  location?: string; // venue_name
  price?: number;    // base_price
  current_registration_count?: number;
  max_registrations?: number;
  registrations?: {
    current: number;
    max_regs?: number;
  };
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

  // Статус цвета для карточек
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    past: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  // Загрузка событий из новой системы
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем события из sh_events
      const { data: eventsData, error } = await supabase
        .from('sh_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching from sh_events:', error);
        throw error;
      }

      // Получаем количество регистраций для каждого события
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('sh_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('registration_status', 'active');

          return {
            ...event,
            // Маппинг новых полей на старые для совместимости
            location: event.venue_name,
            price: event.base_price,
            sh_registrations_count: count || 0,
            current_registration_count: count || 0,
            max_registrations: event.max_attendees,
            registrations: {
              current: count || 0,
              max_regs: event.max_attendees
            }
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Ошибка при загрузке мероприятий');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Удаление событий
  const handleDeleteEvents = async () => {
    if (!confirm(`Вы уверены, что хотите удалить ${selectedEvents.length} ${selectedEvents.length === 1 ? 'мероприятие' : 'мероприятия'}?`)) {
      return;
    }

    try {
      // Удаляем из новой таблицы sh_events
      const { error } = await supabase
        .from('sh_events')
        .delete()
        .in('id', selectedEvents);

      if (error) throw error;

      toast.success(`Удалено ${selectedEvents.length} ${selectedEvents.length === 1 ? 'мероприятие' : 'мероприятия'}`);
      setSelectedEvents([]);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Ошибка при удалении мероприятий');
    }
  };

  // Переключение выбора событий
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

  // Фильтрация событий
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Функции для получения данных о регистрациях (обновленные для новой системы)
  const getCurrentRegistrationCount = (event: Event): number => {
    return event.sh_registrations_count || 0;
  };

  const getMaxRegistrations = (event: Event): number | null => {
    return event.max_attendees || null;
  };

  // Функция отображения цены
  const getPriceDisplay = (event: Event): string => {
    const paymentType = event.payment_type;
    const price = event.base_price;

    if (paymentType === 'free') {
      return 'Бесплатно';
    } else if (paymentType === 'donation') {
      return 'Донат';
    } else if (paymentType === 'paid' && price !== null && price !== undefined) {
      return price === 0 ? 'Бесплатно' : `${price} ${event.currency || 'RSD'}`;
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
      event.status === 'active' || // Активное мероприятие
      event.registration_required // Требуется регистрация
    );
  };

  // Проверяет, есть ли система регистраций в мероприятии
  const hasRegistrationSystem = (event: Event): boolean => {
    return event.registration_required && event.registration_enabled;
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

  // Счетчики для табов
  const tabs = [
    { 
      id: 'all', 
      label: 'Все', 
      count: events.length 
    },
    { 
      id: 'active', 
      label: 'Активные', 
      count: events.filter(e => e.status === 'active' && (!e.end_at || !isPastEvent(e.end_at))).length 
    },
    { 
      id: 'past', 
      label: 'Прошедшие', 
      count: events.filter(e => e.status === 'past' || (e.end_at && isPastEvent(e.end_at))).length 
    },
    { 
      id: 'draft', 
      label: 'Черновики', 
      count: events.filter(e => e.status === 'draft').length 
    }
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

              return (
                <div
                  key={event.id}
                  className="group bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-dark-700 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                  onClick={() => handleEventClick(event)}
                >
                  {/* Заголовок карточки */}
                  <div className="relative p-4 border-b border-gray-200 dark:border-dark-600">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => toggleEventSelection(event.id, e)}
                        className="text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        {selectedEvents.includes(event.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isEventPast ? statusColors.past : statusColors[event.status as keyof typeof statusColors]
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
                      
                      {event.venue_name && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                            <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <span className="truncate font-medium">{event.venue_name}</span>
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
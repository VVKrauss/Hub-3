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

  
// src/pages/admin/AdminCalendarPage.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
// Часть 1: Импорты, типы, константы, хуки и утилиты

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  setHours,
  setMinutes
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

// === ТИПЫ ===
type ViewMode = 'day' | 'week' | 'month';

// ОБНОВЛЕННЫЙ ТИП для новой таблицы
interface TimeSlot {
  id: string;
  start_at: string;
  end_at: string;
  slot_type: 'event' | 'rent' | 'meeting' | 'maintenance' | 'other';
  slot_status: 'active' | 'draft' | 'past' | 'cancelled' | 'completed';
  title: string;
  description?: string;
  event_id?: string;
  venue_name?: string;
  venue_address?: string;
  price?: number;
  currency?: string;
  payment_type?: string;
  contact_name?: string;
  contact_info?: any;
  is_public: boolean;
  is_booked: boolean;
  max_attendees?: number;
  created_at: string;
  updated_at: string;
}

interface GroupedSlot extends TimeSlot {
  slots: TimeSlot[];
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  data: Partial<TimeSlot> | null;
}

// === КОНСТАНТЫ ===
const WORKING_HOURS = { start: 9, end: 21 };
const WEEK_OPTIONS = { weekStartsOn: 1 as const };

// === ХУКИ ===
const useTimeUtils = () => {
  const parseTimestamp = useCallback((timestamp: string): Date => {
    return new Date(timestamp);
  }, []);

  const formatSlotTime = useCallback((timestamp: string): string => {
    const date = parseTimestamp(timestamp);
    return format(date, 'HH:mm');
  }, [parseTimestamp]);

  const getSlotDate = useCallback((timestamp: string): string => {
    return format(parseTimestamp(timestamp), 'dd.MM.yyyy');
  }, [parseTimestamp]);

  const formatForInput = useCallback((timestamp: string): string => {
    const date = parseTimestamp(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, [parseTimestamp]);

  const isSlotPast = useCallback((endTimestamp: string): boolean => {
    return isBefore(parseTimestamp(endTimestamp), new Date());
  }, [parseTimestamp]);

  return { parseTimestamp, formatSlotTime, getSlotDate, formatForInput, isSlotPast };
};

const useSlotGrouping = (slots: TimeSlot[]) => {
  return useMemo(() => {
    return slots.reduce((acc, slot) => {
      const dateKey = format(new Date(slot.start_at), 'yyyy-MM-dd');
      const title = slot.title || 'Без названия';
      const key = `${dateKey}-${title}`;
      
      if (!acc[key]) {
        acc[key] = { ...slot, slots: [slot] };
      } else {
        acc[key].slots.push(slot);
      }
      
      return acc;
    }, {} as Record<string, GroupedSlot>);
  }, [slots]);
};

const useSlotPositioning = () => {
  return useCallback((startTimestamp: string, endTimestamp: string) => {
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);
    
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    
    const top = (startMinutes - WORKING_HOURS.start * 60) / ((WORKING_HOURS.end - WORKING_HOURS.start) * 60) * 100;
    const height = (endMinutes - startMinutes) / ((WORKING_HOURS.end - WORKING_HOURS.start) * 60) * 100;
    
    return { top: Math.max(0, top), height: Math.max(1, height) };
  }, []);
};

const useFilteredSlots = (slots: TimeSlot[], currentDate: Date, viewMode: ViewMode) => {
  return useMemo(() => {
    const getDateRange = () => {
      switch (viewMode) {
        case 'day': return { start: currentDate, end: currentDate };
        case 'week': return { 
          start: startOfWeek(currentDate, WEEK_OPTIONS), 
          end: endOfWeek(currentDate, WEEK_OPTIONS) 
        };
        case 'month': return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
      }
    };

    const range = getDateRange();
    const startISO = range.start.toISOString();
    const endISO = new Date(range.end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

    return slots.filter(slot => slot.start_at >= startISO && slot.start_at <= endISO);
  }, [slots, currentDate, viewMode]);
};

// === УТИЛИТЫ ===
const getSlotColorClasses = (type?: string, status?: string, isPast: boolean = false) => {
  if (isPast) {
    return 'bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-400 opacity-60 text-gray-600 dark:text-gray-400';
  }
  
  if (status === 'draft') {
    return 'bg-gray-50 dark:bg-gray-700/50 border-l-4 border-gray-300 opacity-80 text-gray-700 dark:text-gray-300';
  }

  switch (type) {
    case 'event': return 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-gray-900 dark:text-gray-100';
    case 'rent': return 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 text-gray-900 dark:text-gray-100';
    case 'meeting': return 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500 text-gray-900 dark:text-gray-100';
    case 'maintenance': return 'bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 text-gray-900 dark:text-gray-100';
    default: return 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-300 text-gray-900 dark:text-gray-100';
  }
};

const generateTimeSlots = (date: Date) => {
  const slots = [];
  for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
    slots.push({
      time: setMinutes(setHours(date, hour), 0),
      label: `${hour}:00`
    });
  }
  return slots;
};

// === КОМПОНЕНТЫ ===



// УЛУЧШЕНИЯ КАЛЕНДАРЯ
// 1. УПРОЩЕННАЯ ВЕРСИЯ TOOLTIP - замените tooltipContent в SlotComponent:

const SlotComponent = ({ 
  slot, 
  groupedSlot, 
  onEdit, 
  onDelete, 
  style,
  className = ""
}: {
  slot: TimeSlot;
  groupedSlot?: GroupedSlot;
  onEdit: (slot: TimeSlot) => void;
  onDelete: (id: string, type?: string) => void;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const { formatSlotTime, isSlotPast } = useTimeUtils();
  const isPastSlot = isSlotPast(slot.end_at);
  
  const firstSlot = groupedSlot?.slots[0] || slot;
  const lastSlot = groupedSlot?.slots[groupedSlot?.slots.length - 1] || slot;
  
  // ИСПРАВЛЕНО: Упрощенный tooltip для ВСЕХ представлений
  const tooltipContent = `${slot.title || 'Слот'}
Время: ${formatSlotTime(firstSlot.start_at)}-${formatSlotTime(lastSlot.end_at)}${slot.slot_status === 'draft' ? '\nСтатус: Черновик' : ''}${isPastSlot ? '\nСтатус: Прошедшее' : ''}`;

  return (
    <div
      data-tooltip-id={`tooltip-${slot.id}`}
      data-tooltip-content={tooltipContent}
      className={`rounded cursor-pointer ${getSlotColorClasses(
        slot.slot_type, 
        slot.slot_status, 
        isPastSlot
      )} ${className}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (slot.slot_type === 'rent' && !isPastSlot) {
          onEdit(slot);
        }
      }}
    >
      <div className="font-medium truncate">
        {formatSlotTime(firstSlot.start_at)} {slot.title && `- ${slot.title}`}
        {slot.slot_status === 'draft' && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(черновик)</span>}
        {isPastSlot && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(прошло)</span>}
      </div>
      
      {slot.description && (
        <div className="text-xs truncate opacity-75">
          {slot.description}
        </div>
      )}
      
      {slot.slot_type !== 'event' && !isPastSlot && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slot.id, slot.slot_type);
          }}
          className="absolute bottom-1 right-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          Удалить
        </button>
      )}
      
      <Tooltip 
        id={`tooltip-${slot.id}`} 
        className="z-50 whitespace-pre-line" 
        style={{ zIndex: 9999 }}
      />
    </div>
  );
};




const TimeGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="flex">
    <div className="w-16 flex-shrink-0 pr-2 text-right text-xs text-gray-500 dark:text-gray-400 pt-1">
      {generateTimeSlots(new Date()).map((slot, i) => (
        <div key={i} className="h-12 flex items-center justify-end">
          {slot.label}
        </div>
      ))}
    </div>
    <div className="flex-1 relative">
      {children}
    </div>
  </div>
);

// === ОСНОВНОЙ КОМПОНЕНТ ===
const AdminCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    data: null
  });

  const { parseTimestamp, formatSlotTime, formatForInput } = useTimeUtils();
  const filteredSlots = useFilteredSlots(timeSlots, currentDate, viewMode);
  const groupedSlots = useSlotGrouping(filteredSlots);
  const getSlotPosition = useSlotPositioning();

  // ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАГРУЗКИ ИЗ НОВОЙ ТАБЛИЦЫ
  const fetchTimeSlots = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sh_time_slots')
        .select('*')
        .order('start_at', { ascending: true });

      if (error) throw error;
      setTimeSlots(data || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      toast.error('Ошибка загрузки слотов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    const navigators = { day: addDays, week: addWeeks, month: addMonths };
    setCurrentDate(navigators[viewMode](currentDate, direction === 'prev' ? -1 : 1));
  }, [currentDate, viewMode]);

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ - запрещает создание в прошлом
  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    const startAt = new Date(date);
    startAt.setHours(hour, 0, 0, 0);
    
    // Запрещаем создание слотов в прошлом
    if (startAt < new Date()) {
      toast.error('Нельзя создавать слоты на прошедшее время');
      return;
    }
    
    const endAt = new Date(startAt);
    endAt.setHours(hour + 1, 0, 0, 0);
    
    setModalState({
      isOpen: true,
      mode: 'create',
      data: {
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        slot_type: 'rent',
        slot_status: 'active',
        title: '',
        is_public: true,
        is_booked: false
      }
    });
  }, []);

  const handleEditSlot = useCallback((slot: TimeSlot) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      data: slot
    });
  }, []);

  // ОБНОВЛЕННАЯ ФУНКЦИЯ СОЗДАНИЯ/ОБНОВЛЕНИЯ
  const createOrUpdateTimeSlot = useCallback(async () => {
    if (!modalState.data) return;

    try {
      const { start_at, end_at, title, description, slot_type = 'rent' } = modalState.data;
      
      if (!start_at || !end_at || !title) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      if (new Date(end_at) <= new Date(start_at)) {
        toast.error('Время окончания должно быть позже времени начала');
        return;
      }

      // Проверка пересечений в sh_time_slots
      let overlapQuery = supabase
        .from('sh_time_slots')
        .select('*')
        .or(`and(start_at.lte.${end_at},end_at.gte.${start_at})`);

      // Для редактирования исключаем текущий слот
      if (modalState.mode === 'edit' && modalState.data.id) {
        overlapQuery = overlapQuery.neq('id', modalState.data.id);
      }

      const { data: overlappingSlots, error: overlapError } = await overlapQuery;

      if (overlapError) throw overlapError;

      if (overlappingSlots && overlappingSlots.length > 0) {
        const overlappingDetails = overlappingSlots.map(slot => {
          const type = slot.slot_type === 'event' ? 'Мероприятие' : 'Аренда';
          const title = slot.title || 'Без названия';
          const time = `${formatSlotTime(slot.start_at)}-${formatSlotTime(slot.end_at)}`;
          return `• ${type}: ${title} (${time})`;
        }).join('\n');

        toast.error(`Время пересекается с:\n${overlappingDetails}`, { duration: 8000 });
        return;
      }

      const slotData = {
        start_at,
        end_at,
        slot_type,
        slot_status: 'active',
        title,
        description,
        venue_name: 'Science Hub',
        contact_name: title,
        is_public: true,
        is_booked: slot_type === 'rent'
      };

      if (modalState.mode === 'edit' && modalState.data.id) {
        const { error } = await supabase
          .from('sh_time_slots')
          .update(slotData)
          .eq('id', modalState.data.id);

        if (error) throw error;
        toast.success('Слот обновлен');
      } else {
        const { error } = await supabase
          .from('sh_time_slots')
          .insert([slotData]);

        if (error) throw error;
        toast.success('Слот создан');
      }
      
      setModalState({ isOpen: false, mode: 'create', data: null });
      fetchTimeSlots();
    } catch (err) {
      console.error('Error saving time slot:', err);
      toast.error('Ошибка сохранения слота');
    }
  }, [modalState, formatSlotTime, fetchTimeSlots]);

  // ОБНОВЛЕННАЯ ФУНКЦИЯ УДАЛЕНИЯ
  const deleteTimeSlot = useCallback(async (id: string, type?: string) => {
    if (type === 'event') {
      toast.error('Мероприятия удаляются через страницу управления мероприятиями');
      return;
    }

    if (!window.confirm('Удалить слот?')) return;

    try {
      const { error } = await supabase.from('sh_time_slots').delete().eq('id', id);
      if (error) throw error;
      toast.success('Слот удален');
      fetchTimeSlots();
    } catch (err) {
      console.error('Error deleting time slot:', err);
      toast.error('Ошибка удаления слота');
    }
  }, [fetchTimeSlots]);




  
  // === МЕТОДЫ РЕНДЕРИНГА ===
  const renderDayView = () => {
  const dayKey = format(currentDate, 'yyyy-MM-dd');
  const dayGroupedSlots = Object.values(groupedSlots).filter(
    group => format(parseTimestamp(group.start_at), 'yyyy-MM-dd') === dayKey
  );

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden">
      <h2 className="text-xl font-semibold p-6 pb-4 text-gray-900 dark:text-white">
        {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
      </h2>
      
      <TimeGrid>
        {generateTimeSlots(currentDate).map((slot, i) => {
          const slotHour = WORKING_HOURS.start + i;
          const slotTime = new Date(currentDate);
          slotTime.setHours(slotHour, 0, 0, 0);
          const isPastHour = slotTime < new Date();
          
          return (
            <div 
              key={i} 
              className={`h-12 border-b border-gray-100 dark:border-dark-700 relative transition-colors ${
                isPastHour 
                  ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50' 
                  : 'hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer'
              }`}
              onClick={() => !isPastHour && handleTimeSlotClick(currentDate, slotHour)}
              title={isPastHour ? 'Прошедшее время' : 'Создать слот'}
            >
              {isToday(currentDate) && new Date().getHours() === slotHour && (
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                >
                  <div className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          );
        })}

        {dayGroupedSlots.map((group, idx) => {
          const firstSlot = group.slots[0];
          const lastSlot = group.slots[group.slots.length - 1];
          const { top, height } = getSlotPosition(firstSlot.start_at, lastSlot.end_at);

          return (
            <div
              key={idx}
              data-tooltip-id={`day-tooltip-${group.id}`}
              data-tooltip-content={`${group.title || 'Слот'}
Время: ${formatSlotTime(firstSlot.start_at)}-${formatSlotTime(lastSlot.end_at)}${group.slot_status === 'draft' ? '\nСтатус: Черновик' : ''}${parseTimestamp(group.end_at) < new Date() ? '\nСтатус: Прошедшее' : ''}`}
              className={`absolute left-2 right-2 p-2 text-sm shadow-sm rounded cursor-pointer ${getSlotColorClasses(
                group.slot_type, 
                group.slot_status, 
                parseTimestamp(group.end_at) < new Date()
              )}`}
              style={{ top: `${top}%`, height: `${height}%`, zIndex: 10 + idx }}
              onClick={(e) => {
                e.stopPropagation();
                if (group.slot_type === 'rent' && !(parseTimestamp(group.end_at) < new Date())) {
                  handleEditSlot(group);
                }
              }}
            >
              <div className="font-medium truncate">
                {formatSlotTime(firstSlot.start_at)} {group.title && `- ${group.title}`}
                {group.slot_status === 'draft' && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(черновик)</span>}
                {parseTimestamp(group.end_at) < new Date() && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(прошло)</span>}
              </div>
              
              {group.description && (
                <div className="text-xs truncate opacity-75">
                  {group.description}
                </div>
              )}
              
              {group.slot_type !== 'event' && !(parseTimestamp(group.end_at) < new Date()) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTimeSlot(group.id, group.slot_type);
                  }}
                  className="absolute bottom-1 right-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Удалить
                </button>
              )}
              
              <Tooltip 
                id={`day-tooltip-${group.id}`} 
                className="z-50 whitespace-pre-line" 
                style={{ zIndex: 9999 }}
              />
            </div>
          );
        })}
      </TimeGrid>
    </div>
  );
};

// ИСПРАВЛЕННЫЙ renderWeekView:
const renderWeekView = () => {
  const weekStart = startOfWeek(currentDate, WEEK_OPTIONS);
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-200 dark:border-dark-600">
        <div className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400"></div>
        {weekDays.map(day => (
          <div key={day.toString()} className={`p-4 text-center border-l border-gray-200 dark:border-dark-600 ${
            isToday(day) ? 'bg-primary/5' : ''
          }`}>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {format(day, 'EEEEEE', { locale: ru })}
            </div>
            <div className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-8">
        <TimeGrid>
          <div></div>
        </TimeGrid>
        
        {weekDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayGroupedSlots = Object.values(groupedSlots).filter(
            group => format(parseTimestamp(group.start_at), 'yyyy-MM-dd') === dayKey
          );

          return (
            <div key={day.toString()} className="border-l border-gray-200 dark:border-dark-600 relative">
              {generateTimeSlots(day).map((slot, i) => {
                const slotHour = WORKING_HOURS.start + i;
                const slotTime = new Date(day);
                slotTime.setHours(slotHour, 0, 0, 0);
                const isPastHour = slotTime < new Date();
                
                return (
                  <div 
                    key={i} 
                    className={`h-12 border-b border-gray-100 dark:border-dark-700 relative transition-colors ${
                      isPastHour 
                        ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50' 
                        : 'hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer'
                    }`}
                    onClick={() => !isPastHour && handleTimeSlotClick(day, slotHour)}
                    title={isPastHour ? 'Прошедшее время' : 'Создать слот'}
                  />
                );
              })}

              {dayGroupedSlots.map((group, idx) => {
                const firstSlot = group.slots[0];
                const lastSlot = group.slots[group.slots.length - 1];
                const { top, height } = getSlotPosition(firstSlot.start_at, lastSlot.end_at);

                return (
                  <div
                    key={idx}
                    data-tooltip-id={`week-tooltip-${group.id}`}
                    data-tooltip-content={`${group.title || 'Слот'}
Время: ${formatSlotTime(firstSlot.start_at)}-${formatSlotTime(lastSlot.end_at)}${group.slot_status === 'draft' ? '\nСтатус: Черновик' : ''}${parseTimestamp(group.end_at) < new Date() ? '\nСтатус: Прошедшее' : ''}`}
                    className={`absolute left-1 right-1 p-1 text-xs overflow-hidden rounded cursor-pointer ${getSlotColorClasses(
                      group.slot_type, 
                      group.slot_status, 
                      parseTimestamp(group.end_at) < new Date()
                    )}`}
                    style={{ top: `${top}%`, height: `${height}%`, zIndex: 10 + idx }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (group.slot_type === 'rent' && !(parseTimestamp(group.end_at) < new Date())) {
                        handleEditSlot(group);
                      }
                    }}
                  >
                    <div className="font-medium truncate">
                      {formatSlotTime(firstSlot.start_at)} {group.title && `- ${group.title}`}
                      {group.slot_status === 'draft' && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(черновик)</span>}
                      {parseTimestamp(group.end_at) < new Date() && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(прошло)</span>}
                    </div>
                    
                    {group.description && (
                      <div className="text-xs truncate opacity-75">
                        {group.description}
                      </div>
                    )}
                    
                    <Tooltip 
                      id={`week-tooltip-${group.id}`} 
                      className="z-50 whitespace-pre-line" 
                      style={{ zIndex: 9999 }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderMonthView = () => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, WEEK_OPTIONS);
  const endDate = endOfWeek(monthEnd, WEEK_OPTIONS);
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setViewMode('day');
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-dark-600">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-dark-600 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {monthDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const daySlots = timeSlots.filter(slot => 
            format(parseTimestamp(slot.start_at), 'yyyy-MM-dd') === dayKey
          );
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`min-h-32 p-2 border-r border-b border-gray-200 dark:border-dark-600 last:border-r-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-dark-700 opacity-50' : 
                isDayToday ? 'bg-primary/5 border-primary' : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-600'
              }`}
              onClick={() => handleDayClick(day)}
              title={`Перейти к ${format(day, 'd MMMM', { locale: ru })}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isDayToday ? 'text-primary font-bold' : 'text-gray-900 dark:text-white'
              }`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1 relative">
                {daySlots.slice(0, 3).map((slot, idx) => (
                  // ИСПРАВЛЕНО: Используем тот же SlotComponent что и везде
                  <SlotComponent
                    key={idx}
                    slot={slot}
                    onEdit={handleEditSlot}
                    onDelete={deleteTimeSlot}
                    className="text-xs p-1 relative"
                    style={{}}
                  />
                ))}
                {daySlots.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    +{daySlots.length - 3} еще
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="container py-8">
        {/* Заголовок и навигация */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Календарь мероприятий
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  } ${mode === 'day' ? 'rounded-l-lg' : mode === 'month' ? 'rounded-r-lg' : ''}`}
                >
                  {mode === 'day' ? 'День' : mode === 'week' ? 'Неделя' : 'Месяц'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Навигация по датам */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('prev')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-48">
              {viewMode === 'month' 
                ? format(currentDate, 'LLLL yyyy', { locale: ru })
                : viewMode === 'week'
                ? `${format(startOfWeek(currentDate, WEEK_OPTIONS), 'd MMM', { locale: ru })} - ${format(endOfWeek(currentDate, WEEK_OPTIONS), 'd MMM yyyy', { locale: ru })}`
                : format(currentDate, 'd MMMM yyyy', { locale: ru })
              }
            </h2>
            
            <button
              onClick={() => navigate('next')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Сегодня
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <span>События</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span>Аренда</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
              <span>Прошедшие</span>
            </div>
          </div>
        </div>

        {/* Основное содержимое календаря */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
        )}

        {/* Модальное окно для создания/редактирования слотов */}
        {modalState.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border dark:border-gray-600">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {modalState.mode === 'edit' ? 'Редактировать слот' : 'Создать слот'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Название</label>
                  <input
                    type="text"
                    value={modalState.data?.title || ''}
                    onChange={(e) => setModalState(prev => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Название слота"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Описание</label>
                  <textarea
                    value={modalState.data?.description || ''}
                    onChange={(e) => setModalState(prev => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Описание слота"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Начало</label>
                    <input
                      type="datetime-local"
                      value={modalState.data?.start_at ? formatForInput(modalState.data.start_at) : ''}
                      onChange={(e) => setModalState(prev => ({
                        ...prev,
                        data: { ...prev.data, start_at: new Date(e.target.value).toISOString() }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Окончание</label>
                    <input
                      type="datetime-local"
                      value={modalState.data?.end_at ? formatForInput(modalState.data.end_at) : ''}
                      onChange={(e) => setModalState(prev => ({
                        ...prev,
                        data: { ...prev.data, end_at: new Date(e.target.value).toISOString() }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div>
                  {modalState.mode === 'edit' && modalState.data?.id && modalState.data?.slot_type !== 'event' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Удалить этот слот?')) {
                          deleteTimeSlot(modalState.data.id!, modalState.data.slot_type);
                          setModalState({ isOpen: false, mode: 'create', data: null });
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalState({ isOpen: false, mode: 'create', data: null })}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={createOrUpdateTimeSlot}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {modalState.mode === 'edit' ? 'Обновить' : 'Создать'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCalendarPage;
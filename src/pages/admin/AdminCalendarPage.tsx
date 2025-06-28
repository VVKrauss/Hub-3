import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, ChevronLeft, ChevronRight, Grid, List, Plus } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, setHours, setMinutes, parseISO, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// === КОНСТАНТЫ ===
const WORKING_HOURS = { start: 9, end: 23 };
const VIEW_MODES = ['day', 'week', 'month'] as const;
const WEEK_OPTIONS = { locale: ru, weekStartsOn: 1 };

// === ТИПЫ ===
interface TimeSlot {
  id: string;
  start_at: string;
  end_at: string;
  slot_details: {
    type?: 'event' | 'rent';
    title?: string;
    description?: string;
    booked?: boolean;
    user_name?: string;
    user_contact?: string;
    status?: 'draft' | 'published' | 'cancelled';
  };
}

type ViewMode = typeof VIEW_MODES[number];

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  data: TimeSlot | null;
}

interface GroupedSlot extends TimeSlot {
  slots: TimeSlot[];
}

// === ХУКИ ===
const useTimeUtils = () => {
  const parseTimestamp = useCallback((timestamp: string): Date => {
    // Обрабатываем PostgreSQL timestamp with timezone формат
    if (timestamp.includes(' ') && timestamp.includes('+')) {
      const [datePart, timePart] = timestamp.split(' ');
      const [timeWithoutTz, tz] = timePart.split('+');
      
      // Правильно форматируем timezone offset
      let timezone;
      if (tz === '00') {
        timezone = '+00:00';
      } else if (tz.length === 2) {
        timezone = `+${tz}:00`;
      } else {
        timezone = `+${tz}`;
      }
      
      const isoFormat = `${datePart}T${timeWithoutTz}${timezone}`;
      return new Date(isoFormat);
    }
    return parseISO(timestamp);
  }, []);

  // Форматируем время для отображения в временной зоне Белграда
  const formatSlotTime = useCallback((timestamp: string): string => {
    const date = parseTimestamp(timestamp);
    return date.toLocaleString('sr-RS', {
      timeZone: 'Europe/Belgrade',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, [parseTimestamp]);

  // Получаем дату в временной зоне Белграда
  const getSlotDate = useCallback((timestamp: string): string => {
    const date = parseTimestamp(timestamp);
    return date.toLocaleDateString('sr-RS', {
      timeZone: 'Europe/Belgrade',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('.').reverse().join('-'); // Конвертируем в yyyy-MM-dd формат
  }, [parseTimestamp]);

  // Форматируем для datetime-local input (нужно локальное время)
  const formatForInput = useCallback((timestamp: string): string => {
    const date = parseTimestamp(timestamp);
    // Для input нужно время в локальной зоне пользователя
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
      const title = slot.slot_details.title || 'Без названия';
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
    return 'bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-400 opacity-60';
  }
  
  if (status === 'draft') {
    return 'bg-gray-50 dark:bg-gray-700/50 border-l-4 border-gray-300 opacity-80';
  }

  switch (type) {
    case 'event': return 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500';
    case 'rent': return 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500';
    default: return 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-300';
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
  
  const tooltipContent = `
    ${slot.slot_details.title || 'Слот'}
    Время: ${formatSlotTime(firstSlot.start_at)}-${formatSlotTime(lastSlot.end_at)}
    ${slot.slot_details.description || ''}
    ${slot.slot_details.user_name ? `Клиент: ${slot.slot_details.user_name}` : ''}
    ${slot.slot_details.status === 'draft' ? 'Статус: Черновик' : ''}
    ${isPastSlot ? 'Прошедшее мероприятие' : ''}
  `;

  return (
    <div
      data-tooltip-id={`tooltip-${slot.id}`}
      data-tooltip-content={tooltipContent}
      className={`rounded cursor-pointer ${getSlotColorClasses(
        slot.slot_details.type, 
        slot.slot_details.status, 
        isPastSlot
      )} ${className}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (slot.slot_details.type === 'rent') {
          onEdit(slot);
        }
      }}
    >
      <div className="font-medium truncate">
        {formatSlotTime(firstSlot.start_at)} {slot.slot_details.title && `- ${slot.slot_details.title}`}
        {slot.slot_details.status === 'draft' && <span className="text-xs text-gray-500 ml-1">(черновик)</span>}
        {isPastSlot && <span className="text-xs text-gray-500 ml-1">(прошло)</span>}
      </div>
      
      {slot.slot_details.description && (
        <div className="text-xs truncate opacity-75">
          {slot.slot_details.description}
        </div>
      )}
      
      {slot.slot_details.type !== 'event' && !isPastSlot && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slot.id, slot.slot_details.type);
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

  const fetchTimeSlots = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_slots_table')
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

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    const startAt = new Date(date);
    startAt.setHours(hour, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setHours(hour + 1, 0, 0, 0);
    
    setModalState({
      isOpen: true,
      mode: 'create',
      data: {
        id: '',
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        slot_details: { type: 'rent', title: '', booked: false }
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

  const createOrUpdateTimeSlot = useCallback(async () => {
    if (!modalState.data) return;

    try {
      const { start_at, end_at, slot_details } = modalState.data;
      
      if (!start_at || !end_at) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      if (new Date(end_at) <= new Date(start_at)) {
        toast.error('Время окончания должно быть позже времени начала');
        return;
      }

      // Проверка пересечений
      const { data: overlappingSlots, error: overlapError } = await supabase
        .from('time_slots_table')
        .select('*')
        .or(`and(start_at.lte.${end_at},end_at.gte.${start_at})`)
        .neq('id', modalState.mode === 'edit' ? modalState.data.id : '');

      if (overlapError) throw overlapError;

      if (overlappingSlots && overlappingSlots.length > 0) {
        const overlappingDetails = overlappingSlots.map(slot => {
          const type = slot.slot_details?.type === 'event' ? 'Мероприятие' : 'Аренда';
          const title = slot.slot_details?.title || 'Без названия';
          const time = `${formatSlotTime(slot.start_at)}-${formatSlotTime(slot.end_at)}`;
          return `• ${type}: ${title} (${time})`;
        }).join('\n');

        toast.error(`Время пересекается с:\n${overlappingDetails}`, { duration: 8000 });
        return;
      }

      if (modalState.mode === 'edit') {
        const { error } = await supabase
          .from('time_slots_table')
          .update({ start_at, end_at, slot_details })
          .eq('id', modalState.data.id);

        if (error) throw error;
        toast.success('Слот обновлен');
      } else {
        const { error } = await supabase
          .from('time_slots_table')
          .insert([{ start_at, end_at, slot_details: { ...slot_details, type: 'rent' } }]);

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

  const deleteTimeSlot = useCallback(async (id: string, type?: string) => {
    if (type === 'event') {
      toast.error('Мероприятия удаляются через страницу управления мероприятиями');
      return;
    }

    if (!window.confirm('Удалить слот?')) return;

    try {
      const { error } = await supabase.from('time_slots_table').delete().eq('id', id);
      if (error) throw error;
      toast.success('Слот удален');
      fetchTimeSlots();
    } catch (err) {
      console.error('Error deleting time slot:', err);
      toast.error('Ошибка удаления слота');
    }
  }, [fetchTimeSlots]);

  // === РЕНДЕР МЕТОДЫ ===
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, WEEK_OPTIONS);
    const endDate = endOfWeek(monthEnd, WEEK_OPTIONS);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Заголовки дней недели */}
        {eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) }).map(day => (
          <div key={day.toString()} className="text-center py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            {format(day, 'EEEEEE', { locale: ru })}
          </div>
        ))}
        
        {/* Дни месяца */}
        {days.map(day => {
          const daySlots = filteredSlots.filter(slot => 
            isSameDay(parseTimestamp(slot.start_at), day)
          );
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div 
              key={day.toString()}
              onClick={() => { setCurrentDate(day); setViewMode('day'); }}
              className={`min-h-24 p-1.5 border rounded-md flex flex-col cursor-pointer ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-dark-700 opacity-50' : 
                isDayToday ? 'bg-primary/5 border-primary' : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-600'
              }`}
            >
              <div className={`text-sm font-medium mb-1 self-end px-1 rounded-full ${
                isDayToday ? 'bg-primary text-white px-2' : ''
              }`}>
                {format(day, 'd')}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {daySlots.map(slot => (
                  <SlotComponent
                    key={slot.id}
                    slot={slot}
                    onEdit={handleEditSlot}
                    onDelete={deleteTimeSlot}
                    className="text-xs p-1"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, WEEK_OPTIONS);
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="grid grid-cols-8 gap-1">
        <div className="row-span-25 pt-8 pr-2 text-right text-xs text-gray-500 dark:text-gray-400">
          {generateTimeSlots(currentDate).map((slot, i) => (
            <div key={i} className="h-12 flex items-center justify-end">
              {slot.label}
            </div>
          ))}
        </div>
        
        {days.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayGroupedSlots = Object.values(groupedSlots).filter(
            group => format(parseTimestamp(group.start_at), 'yyyy-MM-dd') === dayKey
          );

          return (
            <div key={day.toString()} className={`col-span-1 ${isToday(day) ? 'bg-primary/5' : 'bg-white dark:bg-dark-800'}`}>
              <div className={`text-center py-2 border-b ${isToday(day) ? 'border-primary' : 'border-gray-200 dark:border-dark-600'}`}>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {format(day, 'EEEEEE', { locale: ru })}
                </div>
                <div className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
              
              <div className="relative">
                {generateTimeSlots(day).map((slot, i) => (
                  <div 
                    key={i} 
                    className="h-12 border-b border-gray-100 dark:border-dark-700 relative hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer"
                    onClick={() => handleTimeSlotClick(day, WORKING_HOURS.start + i)}
                  />
                ))}

                {dayGroupedSlots.map((group, idx) => {
                  const firstSlot = group.slots[0];
                  const lastSlot = group.slots[group.slots.length - 1];
                  const { top, height } = getSlotPosition(firstSlot.start_at, lastSlot.end_at);

                  return (
                    <SlotComponent
                      key={idx}
                      slot={group}
                      groupedSlot={group}
                      onEdit={handleEditSlot}
                      onDelete={deleteTimeSlot}
                      className="absolute left-0 right-0 mx-1 p-1 text-xs overflow-hidden"
                      style={{ top: `${top}%`, height: `${height}%`, zIndex: 10 + idx }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    const dayGroupedSlots = Object.values(groupedSlots).filter(
      group => format(parseTimestamp(group.start_at), 'yyyy-MM-dd') === dayKey
    );

    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden">
        <h2 className="text-xl font-semibold p-6 pb-4">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
        </h2>
        
        <TimeGrid>
          {generateTimeSlots(currentDate).map((slot, i) => (
            <div 
              key={i} 
              className="h-12 border-b border-gray-100 dark:border-dark-700 relative hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer"
              onClick={() => handleTimeSlotClick(currentDate, WORKING_HOURS.start + i)}
            >
              {isToday(currentDate) && new Date().getHours() === slot.time.getHours() && (
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                  style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                >
                  <div className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          ))}

          {dayGroupedSlots.map((group, idx) => {
            const firstSlot = group.slots[0];
            const lastSlot = group.slots[group.slots.length - 1];
            const { top, height } = getSlotPosition(firstSlot.start_at, lastSlot.end_at);

            return (
              <SlotComponent
                key={idx}
                slot={group}
                groupedSlot={group}
                onEdit={handleEditSlot}
                onDelete={deleteTimeSlot}
                className="absolute left-2 right-2 p-2 text-sm shadow-sm"
                style={{ top: `${top}%`, height: `${height}%`, zIndex: 10 + idx }}
              />
            );
          })}
        </TimeGrid>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="container py-8">
        {/* Заголовок и навигация */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Календарь слотов</h1>
          
          <div className="flex items-center gap-4">
            {/* Навигация по датам */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('prev')}
                className="p-2 rounded-md bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="text-lg font-medium min-w-[200px] text-center text-gray-800 dark:text-gray-200">
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ru })}
                {viewMode === 'week' && `${format(startOfWeek(currentDate, WEEK_OPTIONS), 'd MMM')} - ${format(endOfWeek(currentDate, WEEK_OPTIONS), 'd MMM yyyy')}`}
                {viewMode === 'day' && format(currentDate, 'd MMMM yyyy', { locale: ru })}
              </div>
              
              <button 
                onClick={() => navigate('next')}
                className="p-2 rounded-md bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {/* Переключатель режимов */}
            <div className="flex rounded-md shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden bg-white dark:bg-dark-700">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${
                    viewMode === mode ? 'bg-primary text-white' : 'hover:bg-gray-50 dark:hover:bg-dark-600'
                  }`}
                >
                  {mode === 'day' && <Calendar className="w-4 h-4" />}
                  {mode === 'week' && <List className="w-4 h-4" />}
                  {mode === 'month' && <Grid className="w-4 h-4" />}
                  {mode === 'day' && 'День'}
                  {mode === 'week' && 'Неделя'}
                  {mode === 'month' && 'Месяц'}
                </button>
              ))}
            </div>

            {/* Кнопка создания */}
            <button
              onClick={() => handleTimeSlotClick(currentDate, 10)}
              className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Создать</span>
            </button>
          </div>
        </div>

        {/* Индикатор временной зоны */}
        <div className="flex items-center gap-4 mb-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span>Время отображается по Белграду (Europe/Belgrade)</span>
          </div>
        </div>

        {/* Легенда статусов */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border-l-4 border-green-500 rounded-sm" />
            <span>Мероприятия</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border-l-4 border-blue-500 rounded-sm" />
            <span>Аренда</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-300 rounded-sm" />
            <span>Черновики</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 border-l-4 border-gray-400 rounded-sm opacity-60" />
            <span>Прошедшие</span>
          </div>
        </div>

        {/* Основной календарь */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 overflow-hidden">
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {modalState.isOpen && modalState.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              {modalState.mode === 'edit' ? 'Редактировать слот' : 'Создать новый слот'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Дата и время начала
                </label>
                <input
                  type="datetime-local"
                  value={modalState.data.start_at ? formatForInput(modalState.data.start_at) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const startAt = new Date(e.target.value).toISOString();
                      setModalState(prev => ({
                        ...prev,
                        data: prev.data ? {
                          ...prev.data,
                          start_at: startAt,
                          end_at: !prev.data.end_at || new Date(prev.data.end_at) <= new Date(startAt) 
                            ? new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString()
                            : prev.data.end_at
                        } : null
                      }));
                    }
                  }}
                  className="w-full p-2 border rounded-md dark:bg-dark-700 border-gray-300 dark:border-dark-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Дата и время окончания
                </label>
                <input
                  type="datetime-local"
                  value={modalState.data.end_at ? formatForInput(modalState.data.end_at) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setModalState(prev => ({
                        ...prev,
                        data: prev.data ? {
                          ...prev.data,
                          end_at: new Date(e.target.value).toISOString()
                        } : null
                      }));
                    }
                  }}
                  className="w-full p-2 border rounded-md dark:bg-dark-700 border-gray-300 dark:border-dark-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Название
                </label>
                <input
                  type="text"
                  value={modalState.data.slot_details?.title || ''}
                  onChange={(e) => setModalState(prev => ({
                    ...prev,
                    data: prev.data ? {
                      ...prev.data,
                      slot_details: {
                        ...prev.data.slot_details,
                        title: e.target.value
                      }
                    } : null
                  }))}
                  className="w-full p-2 border rounded-md dark:bg-dark-700 border-gray-300 dark:border-dark-600"
                  placeholder="Название аренды"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Описание
                </label>
                <textarea
                  value={modalState.data.slot_details?.description || ''}
                  onChange={(e) => setModalState(prev => ({
                    ...prev,
                    data: prev.data ? {
                      ...prev.data,
                      slot_details: {
                        ...prev.data.slot_details,
                        description: e.target.value
                      }
                    } : null
                  }))}
                  className="w-full p-2 border rounded-md dark:bg-dark-700 border-gray-300 dark:border-dark-600"
                  rows={3}
                  placeholder="Дополнительная информация"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Статус
                </label>
                <select
                  value={modalState.data.slot_details?.status || 'published'}
                  onChange={(e) => setModalState(prev => ({
                    ...prev,
                    data: prev.data ? {
                      ...prev.data,
                      slot_details: {
                        ...prev.data.slot_details,
                        status: e.target.value as 'draft' | 'published' | 'cancelled'
                      }
                    } : null
                  }))}
                  className="w-full p-2 border rounded-md dark:bg-dark-700 border-gray-300 dark:border-dark-600"
                >
                  <option value="published">Опубликован</option>
                  <option value="draft">Черновик</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="booked"
                  checked={modalState.data.slot_details?.booked || false}
                  onChange={(e) => setModalState(prev => ({
                    ...prev,
                    data: prev.data ? {
                      ...prev.data,
                      slot_details: {
                        ...prev.data.slot_details,
                        booked: e.target.checked
                      }
                    } : null
                  }))}
                  className="mr-2"
                />
                <label htmlFor="booked" className="text-sm text-gray-700 dark:text-gray-300">
                  Забронировано
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalState({ isOpen: false, mode: 'create', data: null })}
                className="px-4 py-2 border rounded-md border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={createOrUpdateTimeSlot}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                {modalState.mode === 'edit' ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarPage; 
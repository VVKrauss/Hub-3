import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Используем единый экземпляр

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DateAvailability {
  date: string;
  status: 'free' | 'partial' | 'busy';
}

const DateTimePicker = ({ 
  initialDate = '',
  initialStartTime = '',
  initialEndTime = '',
  onDateTimeChange
}: {
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onDateTimeChange: (date: string, startTime: string, endTime: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [dateAvailabilities, setDateAvailabilities] = useState<DateAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate time slots from 9:00 to 23:00 with 30-minute intervals
  const generateTimeSlots = () => {
    const slots: { time: string; display: string }[] = [];
    for (let hour = 9; hour < 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          display: `${hour}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    return slots;
  };

  const timeIntervals = generateTimeSlots();

  // Fetch date availabilities
  useEffect(() => {
    const fetchDateAvailabilities = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('time_slots')
          .select('date, is_available')
          .gte('date', today)
          .order('date', { ascending: true });

        if (error) throw error;

        const dateMap = new Map<string, { total: number; available: number }>();
        
        data?.forEach(slot => {
          const date = slot.date.split('T')[0];
          const current = dateMap.get(date) || { total: 0, available: 0 };
          dateMap.set(date, {
            total: current.total + 1,
            available: current.available + (slot.is_available ? 1 : 0)
          });
        });

        const availabilities: DateAvailability[] = Array.from(dateMap.entries()).map(([date, stats]) => {
          const ratio = stats.available / stats.total;
          let status: 'free' | 'partial' | 'busy';
          
          if (ratio === 1) status = 'free';
          else if (ratio > 0) status = 'partial';
          else status = 'busy';

          return { date, status };
        });

        setDateAvailabilities(availabilities);
      } catch (error) {
        console.error('Error fetching date availabilities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDateAvailabilities();
  }, []);

  // Fetch time slots for selected date
  useEffect(() => {
    if (!currentDate) return;

    const fetchTimeSlots = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('time_slots')
          .select('*')
          .eq('date', currentDate)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setTimeSlots(data || []);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [currentDate]);

  const handleDateChange = (date: string) => {
    setCurrentDate(date);
    // Reset times when date changes
    setStartTime('');
    setEndTime('');
    onDateTimeChange(date, '', '');
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    // Clear end time if it's before start time
    if (endTime && time >= endTime) {
      setEndTime('');
      onDateTimeChange(currentDate, time, '');
    } else {
      onDateTimeChange(currentDate, time, endTime);
    }
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    onDateTimeChange(currentDate, startTime, time);
  };

  const isTimeSlotAvailable = (time: string) => {
    return timeSlots.some(slot => 
      slot.start_time <= time && 
      slot.end_time > time && 
      slot.is_available
    );
  };

  const getAvailableEndTimes = () => {
    if (!startTime) return [];
    
    return timeIntervals
      .filter(slot => slot.time > startTime)
      .filter(slot => isTimeSlotAvailable(slot.time));
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDateAvailabilityStatus = (date: string) => {
    const availability = dateAvailabilities.find(a => a.date === date);
    return availability?.status || 'unknown';
  };

  const getDateStatusColor = (status: string) => {
    switch (status) {
      case 'free': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'busy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Дата мероприятия
        </label>
        <input
          type="date"
          value={currentDate}
          onChange={(e) => handleDateChange(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {currentDate && (
          <div className="mt-2 flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${getDateStatusColor(getDateAvailabilityStatus(currentDate))}`}>
              {getDateAvailabilityStatus(currentDate) === 'free' && 'Свободно'}
              {getDateAvailabilityStatus(currentDate) === 'partial' && 'Частично занято'}
              {getDateAvailabilityStatus(currentDate) === 'busy' && 'Занято'}
              {getDateAvailabilityStatus(currentDate) === 'unknown' && 'Статус неизвестен'}
            </div>
            <span className="text-sm text-gray-600">
              {formatDisplayDate(currentDate)}
            </span>
          </div>
        )}
      </div>

      {currentDate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время начала
            </label>
            <select
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            >
              <option value="">Выберите время начала</option>
              {timeIntervals
                .filter(slot => isTimeSlotAvailable(slot.time))
                .map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {slot.display}
                  </option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время окончания
            </label>
            <select
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading || !startTime}
            >
              <option value="">Выберите время окончания</option>
              {getAvailableEndTimes().map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {slot.display}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600">Загрузка доступного времени...</span>
        </div>
      )}

      {currentDate && timeSlots.length === 0 && !loading && (
        <div className="text-center py-4 text-gray-600">
          <p>Нет доступных временных слотов для выбранной даты</p>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
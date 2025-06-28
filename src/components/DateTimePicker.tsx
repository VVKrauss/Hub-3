import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

        const availabilities: DateAvailability[] = [];
        dateMap.forEach((value, date) => {
          let status: 'free' | 'partial' | 'busy' = 'busy';
          if (value.available === value.total) status = 'free';
          else if (value.available > 0) status = 'partial';
          
          availabilities.push({ date, status });
        });

        setDateAvailabilities(availabilities);
      } catch (error) {
        console.error('Error fetching date availabilities:', error);
      } finally {
        setLoading(false);
      }
    };

    if (showPicker) {
      fetchDateAvailabilities();
    }
  }, [showPicker]);

  // Fetch time slots for selected date
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!currentDate) return;
      
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
      } finally {
        setLoading(false);
      }
    };

    if (showPicker && currentDate) {
      fetchTimeSlots();
    }
  }, [showPicker, currentDate]);

  const handleDateChange = (date: string) => {
    setCurrentDate(date);
    setStartTime('');
    setEndTime('');
  };

  const handleTimeSelect = (time: string) => {
    if (!startTime || endTime) {
      setStartTime(time);
      setEndTime('');
    } else {
      if (time > startTime) {
        setEndTime(time);
        onDateTimeChange(currentDate, startTime, time);
        setShowPicker(false);
      } else {
        alert('Время окончания должно быть позже времени начала');
      }
    }
  };

  const getDateStatus = (date: string) => {
    const availability = dateAvailabilities.find(d => d.date === date);
    return availability ? availability.status : 'busy';
  };

  const isTimeSlotAvailable = (time: string) => {
    if (!currentDate) return false;
    
    const slot = timeSlots.find(s => 
      s.start_time <= `${currentDate}T${time}:00` && 
      s.end_time >= `${currentDate}T${time}:00`
    );
    
    return slot ? slot.is_available : false;
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
      >
        <span>
          {currentDate || 'Выберите дату'} 
          {startTime && ` ${startTime} - ${endTime}`}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 transition-transform ${showPicker ? 'rotate-180' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {showPicker && (
        <div className="absolute z-10 mt-2 w-full max-w-2xl bg-white rounded-lg shadow-xl border p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Date selection */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Выберите дату</h3>
                <div className="flex overflow-x-auto pb-2 gap-2">
                  {dateAvailabilities.map(({ date }) => {
                    const status = getDateStatus(date);
                    const bgColor = {
                      'free': 'bg-green-500 hover:bg-green-600',
                      'partial': 'bg-yellow-500 hover:bg-yellow-600',
                      'busy': 'bg-gray-300 hover:bg-gray-400'
                    }[status];

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => handleDateChange(date)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-white ${bgColor} ${
                          date === currentDate ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-medium">{new Date(date).getDate()}</div>
                          <div className="text-xs opacity-80">
                            {new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Time selection */}
              {currentDate && (
                <div>
                  <h3 className="font-medium mb-3">
                    Выберите время ({formatDisplayDate(currentDate)})
                  </h3>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {timeIntervals.map(({ time, display }) => {
                      const isAvailable = isTimeSlotAvailable(time);
                      const isSelected = time === startTime || time === endTime;
                      const isBetween = startTime && endTime && time > startTime && time < endTime;

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleTimeSelect(time)}
                          className={`p-2 border rounded-lg text-center ${
                            isAvailable
                              ? 'bg-green-100 hover:bg-green-200 border-green-300'
                              : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                          } ${
                            isSelected ? 'bg-blue-100 border-blue-400' : ''
                          } ${
                            isBetween ? 'bg-blue-50' : ''
                          }`}
                        >
                          {display}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-6 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentDate && startTime && endTime) {
                      onDateTimeChange(currentDate, startTime, endTime);
                      setShowPicker(false);
                    }
                  }}
                  disabled={!currentDate || !startTime || !endTime}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Применить
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
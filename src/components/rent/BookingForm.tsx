import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isPast, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { sendTelegramNotification } from '../../utils/telegramNotifications';

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_details: {
    type?: string;
    title?: string;
    description?: string;
    user_name?: string;
    user_contact?: string;
    social_contact?: string;
    event_id?: string;
  };
  created_at: string;
  updated_at: string;
}

interface DateAvailability {
  date: string;
  status: 'free' | 'partial' | 'busy';
}

interface BookingData {
  name: string;
  email: string;
  phone: string;
  social_contact: string;
  selectedSlots: {
    start_time: string;
    end_time: string;
  }[];
  selectionState: 'initial' | 'first-selected' | 'range-selected';
}

const BookingForm = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [bookingData, setBookingData] = useState<BookingData>({
    name: '',
    email: '',
    phone: '',
    social_contact: '',
    selectedSlots: [],
    selectionState: 'initial'
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [toastId, setToastId] = useState<any>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const fetchTimeSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('time_slots_table')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (supabaseError) throw supabaseError;
      
      setTimeSlots(data || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Не удалось загрузить занятые слоты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const showErrorToast = (message: React.ReactNode) => {
    if (!toast.isActive(toastId)) {
      const id = toast.error(message, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setToastId(id);
    }
  };

  const showSuccessToast = (message: React.ReactNode) => {
    if (!toast.isActive(toastId)) {
      const id = toast.success(message, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      setToastId(id);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookedSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots = timeSlots
      .filter(slot => slot.date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    if (slots.length === 0) return [];
    
    const groupedSlots = [];
    let currentGroup = { ...slots[0] };
    
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].start_time === currentGroup.end_time) {
        currentGroup.end_time = slots[i].end_time;
      } else {
        groupedSlots.push(currentGroup);
        currentGroup = { ...slots[i] };
      }
    }
    groupedSlots.push(currentGroup);
    
    return groupedSlots;
  };

  const handleDateSelect = (day: Date) => {
    if (!isPast(day)) {
      setSelectedDate(day);
      setBookingData(prev => ({ 
        ...prev, 
        selectedSlots: [],
        selectionState: 'initial'
      }));
    }
  };

  const generateAvailableSlots = (date: Date) => {
    if (!date) return [];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedSlots = getBookedSlotsForDate(date);
    
    const allSlots = [];
    for (let hour = 9; hour < 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endTime = minute === 30 
          ? `${(hour + 1).toString().padStart(2, '0')}:00`
          : `${hour.toString().padStart(2, '0')}:30`;
          
        const isAvailable = !bookedSlots.some(booked => {
          const bookedStart = booked.start_time;
          const bookedEnd = booked.end_time;
          return (
            (startTime >= bookedStart && startTime < bookedEnd) ||
            (endTime > bookedStart && endTime <= bookedEnd) ||
            (startTime <= bookedStart && endTime >= bookedEnd)
          );
        });
        
        if (isAvailable) {
          allSlots.push({
            start_time: startTime,
            end_time: endTime
          });
        }
      }
    }
    
    return allSlots;
  };

  const getDayStatus = (date: Date) => {
    const availableSlots = generateAvailableSlots(date);
    const bookedSlots = getBookedSlotsForDate(date);
    
    if (availableSlots.length === 0 && bookedSlots.length > 0) return 'busy';
    if (availableSlots.length > 0 && bookedSlots.length > 0) return 'partial';
    if (availableSlots.length > 0 && bookedSlots.length === 0) return 'free';
    return 'unknown';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSlotClick = (slot: { start_time: string, end_time: string }) => {
    const availableSlots = generateAvailableSlots(selectedDate!);
    const bookedSlots = getBookedSlotsForDate(selectedDate!);
    
    setBookingData(prev => {
      if (prev.selectionState === 'range-selected') {
        return {
          ...prev,
          selectedSlots: [slot],
          selectionState: 'first-selected'
        };
      }
      
      if (prev.selectionState === 'initial') {
        return {
          ...prev,
          selectedSlots: [slot],
          selectionState: 'first-selected'
        };
      }
      
      if (prev.selectionState === 'first-selected' && prev.selectedSlots.length === 1) {
        const firstSlot = prev.selectedSlots[0];
        const firstIndex = availableSlots.findIndex(s => 
          s.start_time === firstSlot.start_time && s.end_time === firstSlot.end_time
        );
        const currentIndex = availableSlots.findIndex(s => 
          s.start_time === slot.start_time && s.end_time === slot.end_time
        );
        
        if (firstIndex === -1 || currentIndex === -1) return prev;
        
        const startIndex = Math.min(firstIndex, currentIndex);
        const endIndex = Math.max(firstIndex, currentIndex);
        
        const rangeStart = availableSlots[startIndex].start_time;
        const rangeEnd = availableSlots[endIndex].end_time;
        
        const hasBookedInRange = bookedSlots.some(booked => {
          return (
            (booked.start_time >= rangeStart && booked.start_time < rangeEnd) ||
            (booked.end_time > rangeStart && booked.end_time <= rangeEnd) ||
            (booked.start_time <= rangeStart && booked.end_time >= rangeEnd)
          );
        });
        
        if (hasBookedInRange) {
          const bookedInRange = bookedSlots.find(booked => 
            (booked.start_time >= rangeStart && booked.start_time < rangeEnd) ||
            (booked.end_time > rangeStart && booked.end_time <= rangeEnd) ||
            (booked.start_time <= rangeStart && booked.end_time >= rangeEnd)
          );
          
          showErrorToast(
            <div>
              <span className="font-medium">🚨 Ошибка бронирования</span>
              <p>В выбранном промежутке {rangeStart}-{rangeEnd} есть занятое время:</p>
              <p className="mt-1 font-medium">
                {bookedInRange?.start_time}-{bookedInRange?.end_time} -{' '}
                {bookedInRange?.slot_details?.type === 'event' 
                  ? bookedInRange.slot_details.title 
                  : 'Занято'}
              </p>
            </div>
          );
          
          return prev;
        }
        
        const rangeSlots = availableSlots.slice(startIndex, endIndex + 1);
        
        return {
          ...prev,
          selectedSlots: rangeSlots,
          selectionState: 'range-selected'
        };
      }
      
      return prev;
    });
  };

  const sendTelegramNotification2 = async (bookingDetails: {
    date: string;
    startTime: string;
    endTime: string;
    name: string;
    email: string;
    phone?: string;
    social_contact?: string;
  }) => {
    try {
      const message = `📅 Новая бронь пространства:\n\n` +
        `📌 Дата: ${bookingDetails.date}\n` +
        `⏰ Время: ${bookingDetails.startTime}-${bookingDetails.endTime}\n` +
        `👤 Имя: ${bookingDetails.name}\n` +
        `📧 Email: ${bookingDetails.email}\n` +
        `${bookingDetails.phone ? `📞 Телефон: ${bookingDetails.phone}\n` : ''}` +
        `${bookingDetails.social_contact ? `💬 Соцсети: ${bookingDetails.social_contact}\n` : ''}`;
      
      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      await sendTelegramNotification(chatId, message);
      
    } catch (err) {
      console.error('Ошибка отправки в Telegram:', err);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.name || !bookingData.email) {
      showErrorToast(
        <div>
          <span className="font-medium">Пожалуйста, заполните имя и email</span>
        </div>
      );
      return;
    }
    
    try {
      setLoading(true);
      
      const firstSlot = bookingData.selectedSlots[0];
      const lastSlot = bookingData.selectedSlots[bookingData.selectedSlots.length - 1];
      
      const insertPromises = bookingData.selectedSlots.map(slot => 
        supabase.from('time_slots_table').insert([{
          date: format(selectedDate!, 'yyyy-MM-dd'),
          start_time: slot.start_time,
          end_time: slot.end_time,
          slot_details: {
            user_name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            social_contact: bookingData.social_contact,
            type: 'booking',
            title: `Бронирование ${bookingData.name}`,
            description: `Продолжительность: ${calculateTotalDuration()} часа(ов)`
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      );
      
      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;
      
      await sendTelegramNotification2({
        date: format(selectedDate!, 'dd.MM.yyyy'),
        startTime: firstSlot.start_time,
        endTime: lastSlot.end_time,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        social_contact: bookingData.social_contact
      });
      
      await fetchTimeSlots();
      
      showSuccessToast(
        <div>
          <span className="font-medium">🎉 Бронирование успешно!</span>
          <p className="mt-1">
            {format(selectedDate!, 'dd.MM.yyyy')} {firstSlot.start_time}-{lastSlot.end_time}
          </p>
        </div>
      );
      
      setBookingData({
        name: '',
        email: '',
        phone: '',
        social_contact: '',
        selectedSlots: [],
        selectionState: 'initial'
      });
      
      setShowBookingModal(false);
    } catch (err) {
      console.error('Booking error:', err);
      showErrorToast(
        <div>
          <span className="font-medium">😕 Ошибка бронирования</span>
          <p className="mt-1">Пожалуйста, попробуйте еще раз или свяжитесь с нами</p>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalDuration = () => {
    if (bookingData.selectedSlots.length === 0) return 0;
    
    const firstSlot = bookingData.selectedSlots[0];
    const lastSlot = bookingData.selectedSlots[bookingData.selectedSlots.length - 1];
    
    const [startHour, startMinute] = firstSlot.start_time.split(':').map(Number);
    const [endHour, endMinute] = lastSlot.end_time.split(':').map(Number);
    
    return (endHour - startHour) + (endMinute - startMinute) / 60;
  };

  const calculateTotalPrice = () => {
    const pricePerHour = 20;
    return pricePerHour * calculateTotalDuration();
  };

  const handleEventClick = (eventId?: string) => {
    if (eventId) {
      console.log('Navigate to event:', eventId);
      alert(`Переход на мероприятие с ID: ${eventId}`);
    }
  };

  const hasAvailableSlots = (date: Date) => {
    return generateAvailableSlots(date).length > 0;
  };

  const hasBookedSlots = (date: Date) => {
    return timeSlots.some(slot => slot.date === format(date, 'yyyy-MM-dd'));
  };

  const getDayOfWeekOffset = () => {
    const firstDayOfMonth = getDay(monthStart);
    return firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  };

  const openBookingModal = () => {
    if (bookingData.selectedSlots.length === 0) {
      showErrorToast(
        <div>
          <span className="font-medium">Пожалуйста, выберите хотя бы один слот</span>
        </div>
      );
      return;
    }
    setShowBookingModal(true);
  };

  const getSelectedTimeRange = () => {
    if (bookingData.selectedSlots.length === 0) return '';
    const first = bookingData.selectedSlots[0];
    const last = bookingData.selectedSlots[bookingData.selectedSlots.length - 1];
    return `${first.start_time}-${last.end_time}`;
  };

  const getDayStatusLabel = (date: Date) => {
    const status = getDayStatus(date);
    switch (status) {
      case 'free': return 'Свободно';
      case 'busy': return 'Занято';
      case 'partial': return 'Есть слоты';
      default: return '';
    }
  };

  const getDayStatusColor = (date: Date) => {
    const status = getDayStatus(date);
    switch (status) {
      case 'free': 
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          border: 'border-2 border-green-500 dark:border-green-700',
          text: 'text-green-800 dark:text-green-200'
        };
      case 'busy': 
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          border: 'border-2 border-red-500 dark:border-red-700',
          text: 'text-red-800 dark:text-red-200'
        };
      case 'partial': 
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          border: 'border-2 border-orange-500 dark:border-orange-700',
          text: 'text-orange-800 dark:text-orange-200'
        };
      default: 
        return {
          bg: '',
          border: '',
          text: ''
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
      <ToastContainer />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Бронирование пространства</h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Calendar Section */}
      <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 mb-8 rounded-lg shadow" ref={calendarRef}>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm sm:text-base"
          >
            &lt; Назад
          </button>
          <h2 className="text-lg sm:text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: ru })}
          </h2>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm sm:text-base"
          >
            Вперед &gt;
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="text-center font-medium text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: getDayOfWeekOffset() }).map((_, index) => (
            <div key={`empty-${index}`} className="h-8 sm:h-10"></div>
          ))}
          
          {monthDays.map(day => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isDisabled = isPast(day) && !isSameDay(day, new Date());
            const isToday = isSameDay(day, today);
            const status = getDayStatus(day);
            const statusLabel = getDayStatusLabel(day);
            const { bg, border, text } = getDayStatusColor(day);
            
            return (
              <button
                key={day.toString()}
                data-today={isToday}
                onClick={() => handleDateSelect(day)}
                disabled={isDisabled || status === 'busy'}
                className={`h-12 sm:h-16 flex flex-col items-center justify-center rounded-md transition-colors text-sm sm:text-base
                  ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-500' : ''}
                  ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-600' : `${bg} ${border} ${text}`}
                  ${isToday && !isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                `}
              >
                <div className="font-medium">
                  {format(day, 'd')}
                </div>
                {isCurrentMonth && !isDisabled && status !== 'unknown' && (
                  <div className="text-xs mt-1 hidden sm:block">
                    {statusLabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Time Slots for Selected Date */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 mb-8 rounded-lg shadow animate-fade-in">
          <h2 className="text-xl font-semibold mb-4">
            {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
          </h2>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Занятые слоты:</h3>
            {getBookedSlotsForDate(selectedDate).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {getBookedSlotsForDate(selectedDate).map((slot, index) => (
                  <div 
                    key={index}
                    className={`p-3 border-2 rounded-md ${
                      slot.slot_details?.type === 'event' 
                        ? 'border-blue-500 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600'
                    }`}
                    onClick={() => slot.slot_details?.type === 'event' && handleEventClick(slot.slot_details.event_id)}
                  >
                    <div className="font-medium">
                      {slot.start_time}-{slot.end_time}
                    </div>
                    <div className="text-sm">
                      {slot.slot_details?.type === 'event' 
                        ? slot.slot_details.title 
                        : 'Занято'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Нет занятых слотов</div>
            )}
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Доступные слоты:</h3>
            {loading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
                  {generateAvailableSlots(selectedDate).map((slot, index) => {
                    const isSelected = bookingData.selectedSlots.some(
                      s => s.start_time === slot.start_time && s.end_time === slot.end_time
                    );
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => handleSlotClick(slot)}
                        className={`p-3 sm:p-4 border-2 rounded-md cursor-pointer transition-colors text-center ${
                          isSelected 
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-700' 
                            : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        <div className="font-medium text-sm sm:text-base">
                          {slot.start_time}-{slot.end_time}
                        </div>
                      </div>
                    );
                  })}
                  
                  {generateAvailableSlots(selectedDate).length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                      На выбранную дату нет доступных слотов
                    </div>
                  )}
                </div>
                
                {bookingData.selectedSlots.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-600 rounded-md border-2 border-gray-300 dark:border-gray-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="font-medium">Выбрано:</span> {getSelectedTimeRange()}
                      </div>
                      <button
                        onClick={openBookingModal}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800"
                      >
                        Выбрать
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-700 rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Подтверждение бронирования</h2>
              
              <div className="mb-6">
                <h3 className="font-medium mb-2">Выбранное время:</h3>
                <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded-md border-2 border-gray-300 dark:border-gray-500">
                  {getSelectedTimeRange()}
                </div>
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Имя *</label>
                  <input
                    type="text"
                    name="name"
                    value={bookingData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={bookingData.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Телефон</label>
                  <input
                    type="tel"
                    name="phone"
                    value={bookingData.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    placeholder="Необязательно"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Ссылка на соцсети</label>
                  <input
                    type="text"
                    name="social_contact"
                    value={bookingData.social_contact}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    placeholder="Необязательно"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="w-full sm:w-auto px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800"
                    disabled={loading}
                  >
                    {loading ? 'Отправка...' : 'Подтвердить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
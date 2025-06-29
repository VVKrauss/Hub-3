// src/api/bookings.ts
// API для работы с новой системой бронирований пространства (sh_space_bookings)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShSpaceBooking,
  BookingFilters
} from '../types/database';

// Получение списка бронирований с фильтрацией и пагинацией
export const getBookings = async (
  filters: BookingFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<ShSpaceBooking>> => {
  try {
    let query = supabase
      .from('sh_space_bookings')
      .select(`
        *,
        event:sh_events (
          id,
          title,
          slug,
          cover_image_url
        ),
        booked_by:sh_users (
          id,
          name,
          email,
          avatar_url
        )
      `, { count: 'exact' });

    // Фильтруем неудаленные записи
    query = query.is('deleted_at', null);

    // Применяем фильтры
    if (filters.booking_type?.length) {
      query = query.in('booking_type', filters.booking_type);
    }
    
    if (filters.booking_status?.length) {
      query = query.in('booking_status', filters.booking_status);
    }
    
    if (filters.date_from) {
      query = query.gte('booking_date', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('booking_date', filters.date_to);
    }
    
    if (filters.space_name) {
      query = query.eq('space_name', filters.space_name);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`);
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('start_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    return createPaginatedResponse(
      data || [], 
      null, 
      page, 
      limit, 
      count || 0
    );
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного бронирования по ID
export const getBooking = async (bookingId: string): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .select(`
        *,
        event:sh_events (
          id,
          title,
          slug,
          description,
          cover_image_url,
          status
        ),
        booked_by:sh_users (
          id,
          name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('id', bookingId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание нового бронирования
export const createBooking = async (
  bookingData: Omit<ShSpaceBooking, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    // Проверяем конфликты времени
    const conflicts = await checkTimeConflicts(
      bookingData.start_at,
      bookingData.end_at,
      bookingData.space_name || 'Main Hall'
    );

    if (conflicts.error) {
      throw new Error(conflicts.error);
    }

    if (conflicts.data && conflicts.data.length > 0) {
      throw new Error('В указанное время пространство уже забронировано');
    }

    const { data, error } = await supabase
      .from('sh_space_bookings')
      .insert([bookingData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление бронирования
export const updateBooking = async (
  bookingId: string,
  updates: Partial<Omit<ShSpaceBooking, 'id' | 'created_at' | 'deleted_at'>>
): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    // Если обновляется время, проверяем конфликты
    if (updates.start_at || updates.end_at) {
      const currentBooking = await getBooking(bookingId);
      if (currentBooking.error || !currentBooking.data) {
        throw new Error('Бронирование не найдено');
      }

      const startAt = updates.start_at || currentBooking.data.start_at;
      const endAt = updates.end_at || currentBooking.data.end_at;
      const spaceName = updates.space_name || currentBooking.data.space_name || 'Main Hall';

      const conflicts = await checkTimeConflicts(startAt, endAt, spaceName, bookingId);
      if (conflicts.error) {
        throw new Error(conflicts.error);
      }

      if (conflicts.data && conflicts.data.length > 0) {
        throw new Error('В указанное время пространство уже забронировано');
      }
    }

    const { data, error } = await supabase
      .from('sh_space_bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Мягкое удаление бронирования
export const deleteBooking = async (bookingId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_space_bookings')
      .update({ 
        deleted_at: new Date().toISOString(),
        booking_status: 'cancelled'
      })
      .eq('id', bookingId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Восстановление удаленного бронирования
export const restoreBooking = async (bookingId: string): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .update({ 
        deleted_at: null,
        booking_status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Проверка конфликтов времени
export const checkTimeConflicts = async (
  startAt: string,
  endAt: string,
  spaceName: string = 'Main Hall',
  excludeBookingId?: string
): Promise<ApiResponse<ShSpaceBooking[]>> => {
  try {
    let query = supabase
      .from('sh_space_bookings')
      .select('*')
      .eq('space_name', spaceName)
      .eq('booking_status', 'confirmed')
      .is('deleted_at', null)
      .or(`and(start_at.lte.${startAt},end_at.gt.${startAt}),and(start_at.lt.${endAt},end_at.gte.${endAt}),and(start_at.gte.${startAt},end_at.lte.${endAt})`);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение доступных временных слотов
export const getAvailableTimeSlots = async (
  date: string,
  spaceName: string = 'Main Hall',
  duration: number = 60 // минуты
): Promise<ApiResponse<{ start_time: string; end_time: string; available: boolean }[]>> => {
  try {
    // Получаем существующие бронирования на указанную дату
    const { data: bookings, error } = await supabase
      .from('sh_space_bookings')
      .select('start_time, end_time')
      .eq('booking_date', date)
      .eq('space_name', spaceName)
      .eq('booking_status', 'confirmed')
      .is('deleted_at', null)
      .order('start_time');

    if (error) throw error;

    // Генерируем временные слоты (например, с 9:00 до 21:00 с шагом в 1 час)
    const slots = [];
    const startHour = 9;
    const endHour = 21;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + Math.floor(duration / 60)).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;
      
      // Проверяем конфликты с существующими бронированиями
      const hasConflict = (bookings || []).some(booking => {
        const bookingStart = booking.start_time;
        const bookingEnd = booking.end_time;
        
        return (startTime < bookingEnd && endTime > bookingStart);
      });

      slots.push({
        start_time: startTime,
        end_time: endTime,
        available: !hasConflict
      });
    }

    return createApiResponse(slots);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Изменение статуса бронирования
export const updateBookingStatus = async (
  bookingId: string,
  status: 'confirmed' | 'pending' | 'cancelled'
): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .update({ 
        booking_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение бронирований на конкретную дату
export const getBookingsByDate = async (
  date: string,
  spaceName?: string
): Promise<ApiResponse<ShSpaceBooking[]>> => {
  try {
    let query = supabase
      .from('sh_space_bookings')
      .select(`
        *,
        event:sh_events (
          id,
          title,
          cover_image_url
        ),
        booked_by:sh_users (
          id,
          name,
          avatar_url
        )
      `)
      .eq('booking_date', date)
      .is('deleted_at', null)
      .order('start_time');

    if (spaceName) {
      query = query.eq('space_name', spaceName);
    }

    const { data, error } = await query;

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение бронирований пользователя
export const getUserBookings = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<ShSpaceBooking>> => {
  try {
    return await getBookings({ search: '' }, page, limit);
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение статистики бронирований
export const getBookingsStats = async (): Promise<ApiResponse<{
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  this_month: number;
  event_bookings: number;
  rental_bookings: number;
  recurring_bookings: number;
  total_revenue: number;
}>> => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: total },
      { count: confirmed },
      { count: pending },
      { count: cancelled },
      { count: thisMonth },
      { count: eventBookings },
      { count: rentalBookings },
      { count: recurringBookings },
      { data: allBookings }
    ] = await Promise.all([
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('booking_status', 'confirmed').is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('booking_status', 'pending').is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('booking_status', 'cancelled').is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth).is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('booking_type', 'event').is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('booking_type', 'rental').is('deleted_at', null),
      supabase.from('sh_space_bookings').select('*', { count: 'exact', head: true }).eq('is_recurring', true).is('deleted_at', null),
      supabase.from('sh_space_bookings').select('price_amount').eq('booking_status', 'confirmed').is('deleted_at', null)
    ]);

    const totalRevenue = (allBookings || []).reduce((sum, booking) => {
      return sum + (parseFloat(booking.price_amount || '0'));
    }, 0);

    return createApiResponse({
      total: total || 0,
      confirmed: confirmed || 0,
      pending: pending || 0,
      cancelled: cancelled || 0,
      this_month: thisMonth || 0,
      event_bookings: eventBookings || 0,
      rental_bookings: rentalBookings || 0,
      recurring_bookings: recurringBookings || 0,
      total_revenue: totalRevenue
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание повторяющегося бронирования
export const createRecurringBooking = async (
  bookingData: Omit<ShSpaceBooking, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>,
  recurrencePattern: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // каждые N дней/недель/месяцев
    end_date: string;
    days_of_week?: number[]; // для еженедельных повторений (0-6, где 0 = воскресенье)
  }
): Promise<ApiResponse<ShSpaceBooking[]>> => {
  try {
    const bookings: ShSpaceBooking[] = [];
    const startDate = new Date(bookingData.booking_date!);
    const endDate = new Date(recurrencePattern.end_date);
    
    // Создаем родительское бронирование
    const parentBooking = await createBooking({
      ...bookingData,
      is_recurring: true,
      recurrence_pattern: recurrencePattern
    });

    if (parentBooking.error || !parentBooking.data) {
      throw new Error(parentBooking.error || 'Не удалось создать родительское бронирование');
    }

    bookings.push(parentBooking.data);

    // Генерируем дочерние бронирования
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Пропускаем первую дату (уже создана как родительское бронирование)
      if (currentDate.getTime() === startDate.getTime()) {
        currentDate = getNextRecurrenceDate(currentDate, recurrencePattern);
        continue;
      }

      // Проверяем день недели для еженедельных повторений
      if (recurrencePattern.frequency === 'weekly' && recurrencePattern.days_of_week) {
        if (!recurrencePattern.days_of_week.includes(currentDate.getDay())) {
          currentDate = getNextRecurrenceDate(currentDate, recurrencePattern);
          continue;
        }
      }

      const childBookingData = {
        ...bookingData,
        booking_date: currentDate.toISOString().split('T')[0],
        start_at: new Date(currentDate.toISOString().split('T')[0] + 'T' + bookingData.start_time + ':00').toISOString(),
        end_at: new Date(currentDate.toISOString().split('T')[0] + 'T' + bookingData.end_time + ':00').toISOString(),
        is_recurring: false,
        parent_booking_id: parentBooking.data.id
      };

      const childBooking = await createBooking(childBookingData);
      if (childBooking.data) {
        bookings.push(childBooking.data);
      }

      currentDate = getNextRecurrenceDate(currentDate, recurrencePattern);
    }

    return createApiResponse(bookings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Вспомогательная функция для расчета следующей даты повторения
function getNextRecurrenceDate(
  currentDate: Date, 
  pattern: { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
): Date {
  const nextDate = new Date(currentDate);
  
  switch (pattern.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + pattern.interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + pattern.interval);
      break;
  }
  
  return nextDate;
}

// Отмена всех дочерних бронирований повторяющейся серии
export const cancelRecurringBookingSeries = async (
  parentBookingId: string
): Promise<ApiResponse<number>> => {
  try {
    // Отменяем родительское бронирование
    await updateBookingStatus(parentBookingId, 'cancelled');

    // Отменяем все дочерние бронирования
    const { error, count } = await supabase
      .from('sh_space_bookings')
      .update({ 
        booking_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('parent_booking_id', parentBookingId)
      .is('deleted_at', null);

    if (error) throw error;
    return createApiResponse((count || 0) + 1); // +1 за родительское бронирование
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Экспорт бронирований в CSV
export const exportBookings = async (
  filters: BookingFilters = {}
): Promise<ApiResponse<string>> => {
  try {
    const { data } = await getBookings(filters, 1, 1000); // Получаем до 1000 записей

    if (!data) {
      throw new Error('Нет данных для экспорта');
    }

    const headers = [
      'ID', 'Тип', 'Статус', 'Название', 'Описание',
      'Дата', 'Время начала', 'Время окончания', 
      'Пространство', 'Контактное лицо', 'Email', 'Телефон',
      'Сумма', 'Валюта', 'Статус оплаты',
      'Дата создания', 'Заметки'
    ];

    const rows = data.map(booking => [
      booking.id,
      booking.booking_type,
      booking.booking_status,
      booking.title,
      booking.description || '',
      booking.booking_date || '',
      booking.start_time || '',
      booking.end_time || '',
      
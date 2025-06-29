// src/api/bookings.ts
// Полный API для работы с новой системой бронирований пространства (sh_space_bookings)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShSpaceBooking,
  BookingFilters,
  ShBookingType,
  ShBookingStatus
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
          cover_image_url,
          status
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
      .select('id, title, start_at, end_at, space_name, booking_status')
      .eq('space_name', spaceName)
      .in('booking_status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .or(`and(start_at.lte.${startAt},end_at.gte.${startAt}),and(start_at.lte.${endAt},end_at.gte.${endAt}),and(start_at.gte.${startAt},end_at.lte.${endAt})`);

    // Исключаем текущее бронирование при обновлении
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
      .insert([{
        ...bookingData,
        updated_at: new Date().toISOString()
      }])
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
      `)
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
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
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
      `)
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
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Жесткое удаление бронирования (осторожно!)
export const permanentDeleteBooking = async (bookingId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_space_bookings')
      .delete()
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

// Получение бронирований по событию
export const getBookingsByEvent = async (eventId: string): Promise<ApiResponse<ShSpaceBooking[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .select(`
        *,
        booked_by:sh_users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение бронирований пользователя
export const getBookingsByUser = async (userId: string): Promise<ApiResponse<ShSpaceBooking[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .select(`
        *,
        event:sh_events (
          id,
          title,
          slug,
          cover_image_url
        )
      `)
      .eq('booked_by_user_id', userId)
      .is('deleted_at', null)
      .order('start_at', { ascending: false });

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение статистики бронирований
export const getBookingsStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ApiResponse<{
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  totalRevenue: number;
  averageDuration: number;
}>> => {
  try {
    let query = supabase
      .from('sh_space_bookings')
      .select('booking_status, start_at, end_at, price_amount')
      .is('deleted_at', null);

    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      confirmed: data?.filter(b => b.booking_status === 'confirmed').length || 0,
      pending: data?.filter(b => b.booking_status === 'pending').length || 0,
      cancelled: data?.filter(b => b.booking_status === 'cancelled').length || 0,
      totalRevenue: data?.reduce((sum, b) => sum + (Number(b.price_amount) || 0), 0) || 0,
      averageDuration: 0
    };

    // Вычисляем среднюю продолжительность
    if (data && data.length > 0) {
      const totalHours = data.reduce((sum, booking) => {
        if (booking.start_at && booking.end_at) {
          const start = new Date(booking.start_at);
          const end = new Date(booking.end_at);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      
      stats.averageDuration = totalHours / data.length;
    }

    return createApiResponse(stats);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение доступных временных слотов для даты
export const getAvailableSlots = async (
  date: string,
  spaceName: string = 'Main Hall',
  duration: number = 1 // продолжительность в часах
): Promise<ApiResponse<Array<{ start: string; end: string; available: boolean }>>> => {
  try {
    // Получаем все бронирования на эту дату
    const { data: bookings, error } = await supabase
      .from('sh_space_bookings')
      .select('start_at, end_at')
      .eq('space_name', spaceName)
      .eq('booking_date', date)
      .in('booking_status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (error) throw error;

    // Генерируем временные слоты с 9:00 до 21:00 с шагом в 1 час
    const slots = [];
    const startHour = 9;
    const endHour = 21;

    for (let hour = startHour; hour <= endHour - duration; hour++) {
      const slotStart = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
      const slotEnd = `${date}T${(hour + duration).toString().padStart(2, '0')}:00:00`;
      
      // Проверяем, не пересекается ли слот с существующими бронированиями
      const isAvailable = !bookings?.some(booking => {
        const bookingStart = new Date(booking.start_at);
        const bookingEnd = new Date(booking.end_at);
        const slotStartDate = new Date(slotStart);
        const slotEndDate = new Date(slotEnd);
        
        return (
          (slotStartDate >= bookingStart && slotStartDate < bookingEnd) ||
          (slotEndDate > bookingStart && slotEndDate <= bookingEnd) ||
          (slotStartDate <= bookingStart && slotEndDate >= bookingEnd)
        );
      });

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: isAvailable
      });
    }

    return createApiResponse(slots);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение списка доступных пространств
export const getAvailableSpaces = async (): Promise<ApiResponse<string[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .select('space_name')
      .is('deleted_at', null);

    if (error) throw error;

    const spaces = [...new Set(data?.map(b => b.space_name).filter(Boolean))];
    
    // Добавляем стандартные пространства, если их нет в списке
    const defaultSpaces = ['Main Hall', 'Conference Room', 'Workshop Room', 'Lecture Hall'];
    defaultSpaces.forEach(space => {
      if (!spaces.includes(space)) {
        spaces.push(space);
      }
    });

    return createApiResponse(spaces);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Изменение статуса бронирования
export const updateBookingStatus = async (
  bookingId: string,
  status: ShBookingStatus
): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    const { data, error } = await supabase
      .from('sh_space_bookings')
      .update({ 
        booking_status: status,
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

// Клонирование бронирования
export const cloneBooking = async (
  bookingId: string,
  newStartAt: string,
  newEndAt: string
): Promise<ApiResponse<ShSpaceBooking>> => {
  try {
    // Получаем оригинальное бронирование
    const originalBooking = await getBooking(bookingId);
    if (originalBooking.error || !originalBooking.data) {
      throw new Error('Оригинальное бронирование не найдено');
    }

    // Создаем новое бронирование на основе оригинального
    const { id, created_at, updated_at, deleted_at, ...bookingData } = originalBooking.data;
    
    const newBooking = await createBooking({
      ...bookingData,
      start_at: newStartAt,
      end_at: newEndAt,
      booking_date: newStartAt.split('T')[0],
      start_time: newStartAt.split('T')[1].substring(0, 5),
      end_time: newEndAt.split('T')[1].substring(0, 5),
      title: `${bookingData.title} (копия)`,
      external_booking_id: null // Сбрасываем внешний ID
    });

    return newBooking;
  } catch (error) {
    return createApiResponse(null, error);
  }
};
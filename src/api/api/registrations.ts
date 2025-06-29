// src/api/registrations.ts
// API для работы с новой системой регистраций (sh_registrations)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShRegistration, 
  ShRegistrationTicket,
  RegistrationWithTickets,
  ShEvent,
  ShUser
} from '../types/database';

// Фильтры для поиска регистраций
export interface RegistrationFilters {
  event_id?: string;
  user_id?: string;
  registration_status?: ('active' | 'cancelled' | 'waitlist')[];
  payment_status?: ('pending' | 'confirmed' | 'failed' | 'refunded')[];
  registration_type?: ('user' | 'admin' | 'import')[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Получение списка регистраций с фильтрацией и пагинацией
export const getRegistrations = async (
  filters: RegistrationFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<RegistrationWithTickets>> => {
  try {
    let query = supabase
      .from('sh_registrations')
      .select(`
        *,
        sh_registration_tickets (
          id,
          ticket_name,
          quantity,
          unit_price,
          total_price,
          currency,
          ticket_status,
          qr_codes
        ),
        event:sh_events (
          id,
          title,
          slug,
          start_at,
          end_at,
          cover_image_url,
          venue_name
        ),
        user:sh_users (
          id,
          name,
          email,
          avatar_url,
          status
        )
      `, { count: 'exact' });

    // Применяем фильтры
    if (filters.event_id) {
      query = query.eq('event_id', filters.event_id);
    }
    
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters.registration_status?.length) {
      query = query.in('registration_status', filters.registration_status);
    }
    
    if (filters.payment_status?.length) {
      query = query.in('payment_status', filters.payment_status);
    }
    
    if (filters.registration_type?.length) {
      query = query.in('registration_type', filters.registration_type);
    }
    
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    
    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,external_registration_id.ilike.%${filters.search}%`);
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('created_at', { ascending: false });

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

// Получение конкретной регистрации по ID
export const getRegistration = async (
  registrationId: string
): Promise<ApiResponse<RegistrationWithTickets>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .select(`
        *,
        sh_registration_tickets (
          id,
          ticket_type_id,
          ticket_name,
          quantity,
          unit_price,
          total_price,
          currency,
          ticket_status,
          qr_codes,
          created_at
        ),
        event:sh_events (
          id,
          title,
          slug,
          description,
          start_at,
          end_at,
          cover_image_url,
          venue_name,
          venue_address,
          payment_type,
          currency
        ),
        user:sh_users (
          id,
          name,
          email,
          phone,
          avatar_url,
          status
        )
      `)
      .eq('id', registrationId)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание новой регистрации
export const createRegistration = async (
  registrationData: Omit<ShRegistration, 'id' | 'qr_code' | 'created_at' | 'updated_at'>,
  tickets?: Omit<ShRegistrationTicket, 'id' | 'registration_id' | 'created_at'>[]
): Promise<ApiResponse<RegistrationWithTickets>> => {
  try {
    // Создаем регистрацию
    const { data: registration, error: regError } = await supabase
      .from('sh_registrations')
      .insert([{
        ...registrationData,
        qr_code: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }])
      .select()
      .single();

    if (regError) throw regError;

    // Создаем билеты если они переданы
    let registrationTickets: ShRegistrationTicket[] = [];
    if (tickets && tickets.length > 0) {
      const ticketsData = tickets.map(ticket => ({
        ...ticket,
        registration_id: registration.id
      }));

      const { data: createdTickets, error: ticketsError } = await supabase
        .from('sh_registration_tickets')
        .insert(ticketsData)
        .select();

      if (ticketsError) throw ticketsError;
      registrationTickets = createdTickets || [];
    }

    // Получаем полную информацию о регистрации
    const fullRegistration = await getRegistration(registration.id);
    return fullRegistration;
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление регистрации
export const updateRegistration = async (
  registrationId: string,
  updates: Partial<Omit<ShRegistration, 'id' | 'created_at' | 'qr_code'>>
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Отмена регистрации
export const cancelRegistration = async (
  registrationId: string,
  reason?: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        registration_status: 'cancelled',
        notes: reason ? `Отменено: ${reason}` : 'Отменено пользователем',
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    // Отменяем все связанные билеты
    await supabase
      .from('sh_registration_tickets')
      .update({ ticket_status: 'cancelled' })
      .eq('registration_id', registrationId);

    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Восстановление отмененной регистрации
export const restoreRegistration = async (
  registrationId: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        registration_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    // Восстанавливаем все связанные билеты
    await supabase
      .from('sh_registration_tickets')
      .update({ ticket_status: 'active' })
      .eq('registration_id', registrationId);

    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Подтверждение регистрации
export const confirmRegistration = async (
  registrationId: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        payment_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Отметка о посещении
export const markAttendance = async (
  registrationId: string,
  notes?: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        attended_at: new Date().toISOString(),
        attendee_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение регистраций конкретного события
export const getEventRegistrations = async (
  eventId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<RegistrationWithTickets>> => {
  try {
    return await getRegistrations({ event_id: eventId }, page, limit);
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение регистраций конкретного пользователя
export const getUserRegistrations = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<RegistrationWithTickets>> => {
  try {
    return await getRegistrations({ user_id: userId }, page, limit);
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение регистрации по QR коду
export const getRegistrationByQr = async (
  qrCode: string
): Promise<ApiResponse<RegistrationWithTickets>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .select(`
        *,
        sh_registration_tickets (
          id,
          ticket_name,
          quantity,
          unit_price,
          total_price,
          currency,
          ticket_status,
          qr_codes
        ),
        event:sh_events (
          id,
          title,
          slug,
          start_at,
          end_at,
          venue_name,
          cover_image_url
        ),
        user:sh_users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('qr_code', qrCode)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Статистика регистраций
export const getRegistrationsStats = async (
  eventId?: string
): Promise<ApiResponse<{
  total: number;
  active: number;
  cancelled: number;
  waitlist: number;
  confirmed: number;
  pending: number;
  attended: number;
  total_tickets: number;
  total_amount: number;
  average_tickets_per_registration: number;
}>> => {
  try {
    let baseQuery = supabase.from('sh_registrations');
    
    if (eventId) {
      baseQuery = baseQuery.select('*').eq('event_id', eventId);
    } else {
      baseQuery = baseQuery.select('*');
    }

    const [
      { data: allRegistrations },
      { count: total },
      { count: active },
      { count: cancelled },
      { count: waitlist },
      { count: confirmed },
      { count: pending },
      { count: attended }
    ] = await Promise.all([
      baseQuery,
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('registration_status', 'active').eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('registration_status', 'cancelled').eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('registration_status', 'waitlist').eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('payment_status', 'confirmed').eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending').eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null'),
      supabase.from('sh_registrations').select('*', { count: 'exact', head: true }).not('attended_at', 'is', null).eq('event_id', eventId || '').or(eventId ? undefined : 'event_id.is.null,event_id.is.not.null')
    ]);

    // Вычисляем статистику по билетам и суммам
    const totalTickets = (allRegistrations || []).reduce((sum, reg) => sum + (reg.adult_tickets + reg.child_tickets), 0);
    const totalAmount = (allRegistrations || []).reduce((sum, reg) => sum + parseFloat(reg.total_amount || 0), 0);
    const averageTicketsPerReg = total ? totalTickets / total : 0;

    return createApiResponse({
      total: total || 0,
      active: active || 0,
      cancelled: cancelled || 0,
      waitlist: waitlist || 0,
      confirmed: confirmed || 0,
      pending: pending || 0,
      attended: attended || 0,
      total_tickets: totalTickets,
      total_amount: totalAmount,
      average_tickets_per_registration: Math.round(averageTicketsPerReg * 100) / 100
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Массовое обновление статуса регистраций
export const bulkUpdateRegistrationStatus = async (
  registrationIds: string[],
  status: 'active' | 'cancelled' | 'waitlist',
  notes?: string
): Promise<ApiResponse<number>> => {
  try {
    const updates: any = { 
      registration_status: status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updates.notes = notes;
    }

    const { error, count } = await supabase
      .from('sh_registrations')
      .update(updates)
      .in('id', registrationIds);

    if (error) throw error;
    return createApiResponse(count || 0);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Экспорт регистраций события в CSV
export const exportEventRegistrations = async (
  eventId: string
): Promise<ApiResponse<string>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .select(`
        *,
        event:sh_events (title),
        user:sh_users (name, email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Формируем CSV
    const headers = [
      'ID', 'Внешний ID', 'Имя', 'Email', 'Телефон', 
      'Взрослые билеты', 'Детские билеты', 'Общая сумма', 'Валюта',
      'Статус регистрации', 'Статус оплаты', 'QR код',
      'Дата регистрации', 'Дата подтверждения', 'Дата посещения',
      'Заметки', 'Особые требования'
    ];

    const rows = (data || []).map(reg => [
      reg.id,
      reg.external_registration_id || '',
      reg.full_name,
      reg.email,
      reg.phone || '',
      reg.adult_tickets,
      reg.child_tickets,
      reg.total_amount,
      reg.currency,
      reg.registration_status,
      reg.payment_status,
      reg.qr_code,
      new Date(reg.created_at).toLocaleString('ru-RU'),
      reg.confirmed_at ? new Date(reg.confirmed_at).toLocaleString('ru-RU') : '',
      reg.attended_at ? new Date(reg.attended_at).toLocaleString('ru-RU') : '',
      reg.notes || '',
      reg.special_requirements || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n');

    return createApiResponse(csvContent);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Добавление билета к регистрации
export const addTicketToRegistration = async (
  registrationId: string,
  ticketData: Omit<ShRegistrationTicket, 'id' | 'registration_id' | 'created_at'>
): Promise<ApiResponse<ShRegistrationTicket>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registration_tickets')
      .insert([{
        ...ticketData,
        registration_id: registrationId
      }])
      .select()
      .single();

    if (error) throw error;

    // Обновляем общую сумму регистрации
    await supabase
      .from('sh_registrations')
      .update({
        total_amount: supabase.sql`total_amount + ${ticketData.total_price}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId);

    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Удаление билета из регистрации
export const removeTicketFromRegistration = async (
  ticketId: string
): Promise<ApiResponse<boolean>> => {
  try {
    // Получаем информацию о билете
    const { data: ticket, error: ticketError } = await supabase
      .from('sh_registration_tickets')
      .select('registration_id, total_price')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Удаляем билет
    const { error } = await supabase
      .from('sh_registration_tickets')
      .delete()
      .eq('id', ticketId);

    if (error) throw error;

    // Обновляем общую сумму регистрации
    await supabase
      .from('sh_registrations')
      .update({
        total_amount: supabase.sql`total_amount - ${ticket.total_price}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticket.registration_id);

    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Генерация QR кодов для билетов
export const generateTicketQrCodes = async (
  ticketId: string,
  count: number
): Promise<ApiResponse<string[]>> => {
  try {
    const qrCodes = Array.from({ length: count }, (_, i) => 
      `ticket_${ticketId}_${Date.now()}_${i + 1}_${Math.random().toString(36).substr(2, 6)}`
    );

    const { data, error } = await supabase
      .from('sh_registration_tickets')
      .update({ qr_codes: qrCodes })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(qrCodes);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Проверка доступности мест для регистрации
export const checkEventAvailability = async (
  eventId: string,
  requestedTickets: number
): Promise<ApiResponse<{
  available: boolean;
  remaining_spots: number;
  max_attendees: number;
  current_registrations: number;
}>> => {
  try {
    // Получаем информацию о событии
    const { data: event, error: eventError } = await supabase
      .from('sh_events')
      .select('max_attendees')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Подсчитываем текущие активные регистрации
    const { data: registrations, error: regError } = await supabase
      .from('sh_registrations')
      .select('adult_tickets, child_tickets')
      .eq('event_id', eventId)
      .eq('registration_status', 'active');

    if (regError) throw regError;

    const currentRegistrations = (registrations || []).reduce(
      (sum, reg) => sum + reg.adult_tickets + reg.child_tickets, 
      0
    );

    const maxAttendees = event.max_attendees || Infinity;
    const remainingSpots = maxAttendees - currentRegistrations;
    const available = remainingSpots >= requestedTickets;

    return createApiResponse({
      available,
      remaining_spots: Math.max(0, remainingSpots),
      max_attendees: maxAttendees,
      current_registrations: currentRegistrations
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Перенос в лист ожидания
export const moveToWaitlist = async (
  registrationId: string,
  reason?: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        registration_status: 'waitlist',
        notes: reason ? `Перенесено в лист ожидания: ${reason}` : 'Перенесено в лист ожидания',
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Активация из листа ожидания
export const activateFromWaitlist = async (
  registrationId: string
): Promise<ApiResponse<ShRegistration>> => {
  try {
    // Проверяем доступность мест
    const registration = await getRegistration(registrationId);
    if (registration.error || !registration.data) {
      throw new Error('Регистрация не найдена');
    }

    const availability = await checkEventAvailability(
      registration.data.event_id,
      registration.data.adult_tickets + registration.data.child_tickets
    );

    if (availability.error || !availability.data?.available) {
      throw new Error('Недостаточно свободных мест');
    }

    const { data, error } = await supabase
      .from('sh_registrations')
      .update({ 
        registration_status: 'active',
        notes: 'Активировано из листа ожидания',
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение списка ожидания события
export const getEventWaitlist = async (
  eventId: string,
  limit: number = 20
): Promise<ApiResponse<RegistrationWithTickets[]>> => {
  try {
    const response = await getRegistrations(
      { 
        event_id: eventId, 
        registration_status: ['waitlist'] 
      }, 
      1, 
      limit
    );
    
    return createApiResponse(response.data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
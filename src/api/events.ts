// src/api/events.ts - ЧАСТЬ 1
// API для работы с новой системой событий (sh_events)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShEvent, 
  EventWithDetails, 
  ShEventSpeaker,
  ShEventSchedule,
  ShEventTicketType,
  EventFilters,
  ShEventType,
  ShEventStatus,
  ShAgeCategory,
  ShPaymentType
} from '../types/database';

// Вспомогательная функция для обогащения данных спикеров
const enrichEventSpeakers = async (eventSpeakers: any[]) => {
  return Promise.all(
    eventSpeakers.map(async (eventSpeaker: any) => {
      const { data: speaker } = await supabase
        .from('sh_speakers')
        .select('id, name, slug, bio, field_of_expertise, avatar_url, status')
        .eq('id', eventSpeaker.speaker_id)
        .single();
      
      return {
        ...eventSpeaker,
        speaker
      };
    })
  );
};

// Вспомогательная функция для получения счетчиков регистраций
const getRegistrationCounts = async (eventId: string) => {
  const { count: registrationsCount } = await supabase
    .from('sh_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('registration_status', 'active');

  return registrationsCount || 0;
};

// Получение списка событий с фильтрацией и пагинацией
export const getEvents = async (
  filters: EventFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<EventWithDetails>> => {
  try {
    let query = supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          bio_override,
          speaker_id
        ),
        sh_event_schedule (
          id,
          title,
          description,
          start_time,
          end_time,
          date,
          location_override,
          display_order,
          speaker_id
        ),
        sh_event_ticket_types (
          id,
          name,
          description,
          price,
          currency,
          max_quantity,
          min_age,
          max_age,
          is_active,
          display_order
        )
      `, { count: 'exact' });

    // Применяем фильтры
if (!filters.status?.length) {
  query = query.eq('status', 'active');
}
    
    if (filters.event_type?.length) {
      query = query.in('event_type', filters.event_type);
    }
    
    if (filters.age_category?.length) {
      query = query.in('age_category', filters.age_category);
    }
    
    if (filters.payment_type?.length) {
      query = query.in('payment_type', filters.payment_type);
    }
    
    if (filters.date_from) {
      query = query.gte('start_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('start_at', filters.date_to);
    }
    
    if (filters.location_type) {
      query = query.eq('location_type', filters.location_type);
    }
    
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%`);
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('start_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    // Обогащаем данными спикеров и добавляем счетчики
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        const registrationsCount = await getRegistrationCounts(event.id);

        const availableSpots = event.max_attendees 
          ? Math.max(0, event.max_attendees - registrationsCount)
          : null;

        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData, // для обратной совместимости
          registrations_count: registrationsCount,
          available_spots: availableSpots
        };
      })
    );

    return createPaginatedResponse(
      eventsWithDetails, 
      null, 
      page, 
      limit, 
      count || 0
    );
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного события по ID
export const getEvent = async (eventId: string): Promise<ApiResponse<EventWithDetails>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          bio_override,
          speaker_id
        ),
        sh_event_schedule (
          id,
          title,
          description,
          start_time,
          end_time,
          date,
          location_override,
          display_order,
          speaker_id
        ),
        sh_event_ticket_types (
          id,
          name,
          description,
          price,
          currency,
          max_quantity,
          min_age,
          max_age,
          is_active,
          display_order
        )
      `)
      .eq('id', eventId)
      .single();

    if (error) throw error;

    // Получаем данные спикеров с их социальными ссылками
    const speakersWithData = await Promise.all(
      (data.sh_event_speakers || []).map(async (eventSpeaker: any) => {
        const { data: speaker } = await supabase
          .from('sh_speakers')
          .select('id, name, slug, bio, field_of_expertise, birth_date, avatar_url, status')
          .eq('id', eventSpeaker.speaker_id)
          .single();

        // Получаем социальные ссылки спикера
        const { data: socialLinks } = await supabase
          .from('sh_speaker_social_links')
          .select('id, platform, url, display_name, is_public, display_order')
          .eq('speaker_id', eventSpeaker.speaker_id)
          .eq('is_public', true)
          .order('display_order');
        
        return {
          ...eventSpeaker,
          speaker: {
            ...speaker,
            sh_speaker_social_links: socialLinks || []
          }
        };
      })
    );

    // Получаем количество регистраций
    const registrationsCount = await getRegistrationCounts(eventId);

    const availableSpots = data.max_attendees 
      ? Math.max(0, data.max_attendees - registrationsCount)
      : null;

    const eventWithDetails = {
      ...data,
      sh_event_speakers: speakersWithData,
      speakers: speakersWithData, // для обратной совместимости
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    return createApiResponse(eventWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение события по slug
export const getEventBySlug = async (slug: string): Promise<ApiResponse<EventWithDetails>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          bio_override,
          speaker_id
        ),
        sh_event_schedule (
          id,
          title,
          description,
          start_time,
          end_time,
          date,
          location_override,
          display_order,
          speaker_id
        ),
        sh_event_ticket_types (
          id,
          name,
          description,
          price,
          currency,
          max_quantity,
          min_age,
          max_age,
          is_active,
          display_order
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Получаем данные спикеров с их социальными ссылками
    const speakersWithData = await Promise.all(
      (data.sh_event_speakers || []).map(async (eventSpeaker: any) => {
        const { data: speaker } = await supabase
          .from('sh_speakers')
          .select('id, name, slug, bio, field_of_expertise, birth_date, avatar_url, status')
          .eq('id', eventSpeaker.speaker_id)
          .single();

        // Получаем социальные ссылки спикера
        const { data: socialLinks } = await supabase
          .from('sh_speaker_social_links')
          .select('id, platform, url, display_name, is_public, display_order')
          .eq('speaker_id', eventSpeaker.speaker_id)
          .eq('is_public', true)
          .order('display_order');
        
        return {
          ...eventSpeaker,
          speaker: {
            ...speaker,
            sh_speaker_social_links: socialLinks || []
          }
        };
      })
    );

    // Получаем количество регистраций
    const registrationsCount = await getRegistrationCounts(data.id);

    const availableSpots = data.max_attendees 
      ? Math.max(0, data.max_attendees - registrationsCount)
      : null;

    const eventWithDetails = {
      ...data,
      sh_event_speakers: speakersWithData,
      speakers: speakersWithData, // для обратной совместимости
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    return createApiResponse(eventWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание нового события
export const createEvent = async (
  eventData: Omit<ShEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление события
export const updateEvent = async (
  eventId: string,
  updates: Partial<Omit<ShEvent, 'id' | 'created_at'>>
): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Удаление события
export const deleteEvent = async (eventId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Публикация события
export const publishEvent = async (eventId: string): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// src/api/events.ts - ЧАСТЬ 2
// Продолжение API для работы с событиями

// Получение ближайших событий
export const getUpcomingEvents = async (limit: number = 10): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id
        )
      `)
      .gte('start_at', now)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров и добавляем счетчики
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        const registrationsCount = await getRegistrationCounts(event.id);

        const availableSpots = event.max_attendees 
          ? Math.max(0, event.max_attendees - registrationsCount)
          : null;

        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData,
          registrations_count: registrationsCount,
          available_spots: availableSpots
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение рекомендуемых событий
export const getFeaturedEvents = async (limit: number = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id
        )
      `)
      .eq('is_featured', true)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров и добавляем счетчики
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        const registrationsCount = await getRegistrationCounts(event.id);

        const availableSpots = event.max_attendees 
          ? Math.max(0, event.max_attendees - registrationsCount)
          : null;

        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData,
          registrations_count: registrationsCount,
          available_spots: availableSpots
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Поиск событий
export const searchEvents = async (
  searchQuery: string,
  filters: EventFilters = {},
  limit: number = 20
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    let query = supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id
        )
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,short_description.ilike.%${searchQuery}%`);

    // Применяем дополнительные фильтры
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    
    if (filters.event_type?.length) {
      query = query.in('event_type', filters.event_type);
    }
    
    if (filters.payment_type?.length) {
      query = query.in('payment_type', filters.payment_type);
    }

    query = query
      .order('start_at', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    // Обогащаем данными спикеров и добавляем счетчики
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        const registrationsCount = await getRegistrationCounts(event.id);

        const availableSpots = event.max_attendees 
          ? Math.max(0, event.max_attendees - registrationsCount)
          : null;

        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData,
          registrations_count: registrationsCount,
          available_spots: availableSpots
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение статистики событий
export const getEventsStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ApiResponse<{
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  past: number;
  upcoming: number;
  featured: number;
  totalRegistrations: number;
  totalRevenue: number;
  averageAttendance: number;
}>> => {
  try {
    let query = supabase
      .from('sh_events')
      .select('id, status, start_at, end_at, is_featured, base_price, currency');

    if (dateFrom) {
      query = query.gte('start_at', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('start_at', dateTo);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Получаем статистику регистраций
    let registrationsQuery = supabase
      .from('sh_registrations')
      .select('total_amount, currency, event_id, registration_status');

    if (dateFrom || dateTo) {
      // Фильтруем регистрации по событиям в указанном диапазоне
      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        registrationsQuery = registrationsQuery.in('event_id', eventIds);
      }
    }

    const { data: registrations, error: regError } = await registrationsQuery;

    if (regError) throw regError;

    const now = new Date();
    const stats = {
      total: events?.length || 0,
      published: events?.filter(e => e.status === 'published').length || 0,
      draft: events?.filter(e => e.status === 'draft').length || 0,
      cancelled: events?.filter(e => e.status === 'cancelled').length || 0,
      past: events?.filter(e => new Date(e.end_at) < now).length || 0,
      upcoming: events?.filter(e => new Date(e.start_at) > now).length || 0,
      featured: events?.filter(e => e.is_featured).length || 0,
      totalRegistrations: registrations?.filter(r => r.registration_status === 'active').length || 0,
      totalRevenue: registrations?.reduce((sum, r) => {
        return r.registration_status === 'active' ? sum + (Number(r.total_amount) || 0) : sum;
      }, 0) || 0,
      averageAttendance: 0
    };

    // Вычисляем среднюю посещаемость
    if (stats.total > 0) {
      stats.averageAttendance = stats.totalRegistrations / stats.total;
    }

    return createApiResponse(stats);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Дублирование события
export const duplicateEvent = async (
  eventId: string,
  newTitle: string,
  newStartAt: string,
  newEndAt: string
): Promise<ApiResponse<ShEvent>> => {
  try {
    // Получаем оригинальное событие
    const originalEvent = await getEvent(eventId);
    if (originalEvent.error || !originalEvent.data) {
      throw new Error('Событие не найдено');
    }

    // Создаем новое событие на основе оригинального
    const { id, created_at, updated_at, published_at, slug, sh_event_speakers, sh_event_schedule, sh_event_ticket_types, speakers, registrations_count, available_spots, ...eventData } = originalEvent.data;
    
    const newEvent = await createEvent({
      ...eventData,
      title: newTitle,
      start_at: newStartAt,
      end_at: newEndAt,
      slug: `${eventData.slug || 'event'}-copy-${Date.now()}`,
      status: 'draft',
      published_at: null
    });

    if (newEvent.error || !newEvent.data) {
      throw new Error('Ошибка при создании копии события');
    }

    // Копируем спикеров
    if (originalEvent.data.sh_event_speakers?.length) {
      await Promise.all(
        originalEvent.data.sh_event_speakers.map(async (eventSpeaker) => {
          const { id, created_at, updated_at, speaker, ...speakerData } = eventSpeaker;
          await supabase
            .from('sh_event_speakers')
            .insert([{
              ...speakerData,
              event_id: newEvent.data!.id
            }]);
        })
      );
    }

    // Копируем типы билетов
    if (originalEvent.data.sh_event_ticket_types?.length) {
      await Promise.all(
        originalEvent.data.sh_event_ticket_types.map(async (ticketType) => {
          const { id, created_at, updated_at, ...ticketData } = ticketType;
          await supabase
            .from('sh_event_ticket_types')
            .insert([{
              ...ticketData,
              event_id: newEvent.data!.id
            }]);
        })
      );
    }

    return newEvent;
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Архивирование события
export const archiveEvent = async (eventId: string): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Отмена события
export const cancelEvent = async (
  eventId: string,
  reason?: string
): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Управление спикерами события
export const addEventSpeaker = async (
  eventId: string,
  speakerId: string,
  role: string = 'speaker',
  displayOrder: number = 0,
  bioOverride?: string
): Promise<ApiResponse<ShEventSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_speakers')
      .insert([{
        event_id: eventId,
        speaker_id: speakerId,
        role,
        display_order: displayOrder,
        bio_override: bioOverride
      }])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const removeEventSpeaker = async (
  eventId: string,
  speakerId: string
): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_event_speakers')
      .delete()
      .eq('event_id', eventId)
      .eq('speaker_id', speakerId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Управление расписанием события
export const addEventScheduleItem = async (
  scheduleData: Omit<ShEventSchedule, 'id' | 'created_at'>
): Promise<ApiResponse<ShEventSchedule>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_schedule')
      .insert([scheduleData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const updateEventScheduleItem = async (
  scheduleId: string,
  updates: Partial<Omit<ShEventSchedule, 'id' | 'created_at'>>
): Promise<ApiResponse<ShEventSchedule>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_schedule')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const deleteEventScheduleItem = async (scheduleId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_event_schedule')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Управление типами билетов
export const addEventTicketType = async (
  ticketData: Omit<ShEventTicketType, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<ShEventTicketType>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_ticket_types')
      .insert([ticketData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const updateEventTicketType = async (
  ticketTypeId: string,
  updates: Partial<Omit<ShEventTicketType, 'id' | 'created_at'>>
): Promise<ApiResponse<ShEventTicketType>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_ticket_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ticketTypeId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const deleteEventTicketType = async (ticketTypeId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_event_ticket_types')
      .delete()
      .eq('id', ticketTypeId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение событий по спикеру
export const getEventsBySpeaker = async (speakerId: string): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    // Сначала получаем события, где участвует спикер
    const { data: eventSpeakers, error: speakerError } = await supabase
      .from('sh_event_speakers')
      .select('event_id, role, display_order')
      .eq('speaker_id', speakerId);

    if (speakerError) throw speakerError;

    if (!eventSpeakers || eventSpeakers.length === 0) {
      return createApiResponse([]);
    }

    const eventIds = eventSpeakers.map(es => es.event_id);

    // Получаем данные событий
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id
        )
      `)
      .in('id', eventIds)
      .order('start_at', { ascending: false });

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        
        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение событий по типу
export const getEventsByType = async (
  eventType: ShEventType,
  limit: number = 20
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id
        )
      `)
      .eq('event_type', eventType)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        
        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
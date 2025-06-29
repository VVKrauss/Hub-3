// src/api/events.ts
// API для работы с новой системой событий (sh_events)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShEvent, 
  ShEventSpeaker,
  ShEventSchedule,
  ShEventTicketType,
  ShRegistration,
  EventWithDetails,
  EventFilters 
} from '../types/database';

// Получение списка событий с фильтрацией и пагинацией
export const getEvents = async (
  filters: EventFilters = {},
  page: number = 1,
  limit: number = 10
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
          sh_speakers (
            id,
            name,
            slug,
            bio,
            field_of_expertise,
            avatar_url,
            is_featured
          )
        ),
        sh_event_schedule (
          id,
          title,
          description,
          start_time,
          end_time,
          date,
          location_override,
          display_order
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
    if (filters.status?.length) {
      query = query.in('status', filters.status);
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
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('start_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    // Добавляем подсчет регистраций и доступных мест
    const eventsWithCounts = await Promise.all(
      (data || []).map(async (event) => {
        const { count: registrationsCount } = await supabase
          .from('sh_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('registration_status', 'active');

        const availableSpots = event.max_attendees 
          ? Math.max(0, event.max_attendees - (registrationsCount || 0))
          : null;

        return {
          ...event,
          registrations_count: registrationsCount || 0,
          available_spots: availableSpots
        };
      })
    );

    return createPaginatedResponse(
      eventsWithCounts, 
      null, 
      page, 
      limit, 
      count || 0
    );
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного события по ID или slug
export const getEvent = async (
  identifier: string,
  bySlug: boolean = false
): Promise<ApiResponse<EventWithDetails>> => {
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
          sh_speakers (
            id,
            name,
            slug,
            bio,
            field_of_expertise,
            avatar_url,
            is_featured,
            sh_speaker_social_links (
              id,
              platform,
              url,
              display_name,
              is_public,
              is_primary
            )
          )
        ),
        sh_event_schedule (
          id,
          title,
          description,
          start_time,
          end_time,
          date,
          speaker_id,
          location_override,
          display_order
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
      .single();

    if (bySlug) {
      query = query.eq('slug', identifier);
    } else {
      query = query.eq('id', identifier);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Добавляем статистику регистраций
    const { count: registrationsCount } = await supabase
      .from('sh_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', data.id)
      .eq('registration_status', 'active');

    const availableSpots = data.max_attendees 
      ? Math.max(0, data.max_attendees - (registrationsCount || 0))
      : null;

    const eventWithCounts = {
      ...data,
      registrations_count: registrationsCount || 0,
      available_spots: availableSpots
    };

    return createApiResponse(eventWithCounts);
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

// Получение ближайших событий для главной страницы
export const getFeaturedEvents = async (limit: number = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          sh_speakers (
            id,
            name,
            avatar_url
          )
        )
      `)
      .eq('status', 'published')
      .eq('is_public', true)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Добавляем подсчет регистраций
    const eventsWithCounts = await Promise.all(
      (data || []).map(async (event) => {
        const { count } = await supabase
          .from('sh_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('registration_status', 'active');

        return {
          ...event,
          registrations_count: count || 0,
          available_spots: event.max_attendees 
            ? Math.max(0, event.max_attendees - (count || 0))
            : null
        };
      })
    );

    return createApiResponse(eventsWithCounts);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение событий конкретного спикера
export const getSpeakerEvents = async (speakerId: string): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers!inner (
          role,
          display_order
        )
      `)
      .eq('sh_event_speakers.speaker_id', speakerId)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('start_at', { ascending: false });

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Статистика событий
export const getEventsStats = async (): Promise<ApiResponse<{
  total: number;
  published: number;
  draft: number;
  upcoming: number;
  past: number;
  this_month: number;
}>> => {
  try {
    const now = new Date().toISOString();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: total },
      { count: published },
      { count: draft },
      { count: upcoming },
      { count: past },
      { count: thisMonth }
    ] = await Promise.all([
      supabase.from('sh_events').select('*', { count: 'exact', head: true }),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).gte('start_at', now),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).lt('start_at', now),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth)
    ]);

    return createApiResponse({
      total: total || 0,
      published: published || 0,
      draft: draft || 0,
      upcoming: upcoming || 0,
      past: past || 0,
      this_month: thisMonth || 0
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Поиск событий
export const searchEvents = async (
  searchQuery: string,
  limit: number = 20
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          sh_speakers (
            name,
            avatar_url
          )
        )
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Работа со спикерами события
export const addSpeakerToEvent = async (
  eventId: string,
  speakerId: string,
  role: string = 'speaker',
  displayOrder?: number
): Promise<ApiResponse<ShEventSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_speakers')
      .insert([{
        event_id: eventId,
        speaker_id: speakerId,
        role,
        display_order: displayOrder || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const removeSpeakerFromEvent = async (
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

// Работа с расписанием события
export const addScheduleItem = async (
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

export const updateScheduleItem = async (
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

export const deleteScheduleItem = async (scheduleId: string): Promise<ApiResponse<boolean>> => {
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

// Работа с типами билетов
export const addTicketType = async (
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

export const updateTicketType = async (
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

export const deleteTicketType = async (ticketTypeId: string): Promise<ApiResponse<boolean>> => {
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

// Дублирование события
export const duplicateEvent = async (
  eventId: string,
  updates?: Partial<Pick<ShEvent, 'title' | 'slug' | 'start_at' | 'end_at'>>
): Promise<ApiResponse<ShEvent>> => {
  try {
    // Получаем оригинальное событие
    const { data: originalEvent, error: fetchError } = await supabase
      .from('sh_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError) throw fetchError;

    // Создаем копию с новыми данными
    const { id, created_at, updated_at, published_at, ...eventData } = originalEvent;
    const duplicatedEvent = {
      ...eventData,
      ...updates,
      status: 'draft' as const,
      slug: updates?.slug || `${originalEvent.slug}-copy-${Date.now()}`,
      title: updates?.title || `${originalEvent.title} (копия)`,
      published_at: null
    };

    const { data, error } = await supabase
      .from('sh_events')
      .insert([duplicatedEvent])
      .select()
      .single();

    if (error) throw error;

    // Копируем связанные данные (спикеры, расписание, типы билетов)
    const [speakers, schedule, ticketTypes] = await Promise.all([
      supabase.from('sh_event_speakers').select('*').eq('event_id', eventId),
      supabase.from('sh_event_schedule').select('*').eq('event_id', eventId),
      supabase.from('sh_event_ticket_types').select('*').eq('event_id', eventId)
    ]);

    // Копируем спикеров
    if (speakers.data?.length) {
      const speakersData = speakers.data.map(({ id, created_at, updated_at, ...speaker }) => ({
        ...speaker,
        event_id: data.id
      }));
      await supabase.from('sh_event_speakers').insert(speakersData);
    }

    // Копируем расписание
    if (schedule.data?.length) {
      const scheduleData = schedule.data.map(({ id, created_at, ...item }) => ({
        ...item,
        event_id: data.id
      }));
      await supabase.from('sh_event_schedule').insert(scheduleData);
    }

    // Копируем типы билетов
    if (ticketTypes.data?.length) {
      const ticketTypesData = ticketTypes.data.map(({ id, created_at, updated_at, ...ticket }) => ({
        ...ticket,
        event_id: data.id
      }));
      await supabase.from('sh_event_ticket_types').insert(ticketTypesData);
    }

    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
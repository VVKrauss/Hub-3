// src/api/events.ts
// ФИНАЛЬНАЯ ВЕРСИЯ API для работы с новой системой событий (sh_events)
// Использует статусы 'active' и 'past' вместо 'published' и 'completed'

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
  if (!eventSpeakers || eventSpeakers.length === 0) {
    return [];
  }

  return Promise.all(
    eventSpeakers.map(async (eventSpeaker: any) => {
      try {
        const { data: speaker } = await supabase
          .from('sh_speakers')
          .select('id, name, slug, bio, field_of_expertise, avatar_url, status')
          .eq('id', eventSpeaker.speaker_id)
          .single();
        
        return {
          ...eventSpeaker,
          speaker: speaker || null
        };
      } catch (error) {
        console.warn(`Error loading speaker ${eventSpeaker.speaker_id}:`, error);
        return {
          ...eventSpeaker,
          speaker: null
        };
      }
    })
  );
};

// Вспомогательная функция для получения счетчиков регистраций
const getRegistrationCounts = async (eventId: string) => {
  try {
    const { count: registrationsCount } = await supabase
      .from('sh_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('registration_status', 'active');

    return registrationsCount || 0;
  } catch (error) {
    console.warn(`Error getting registration count for event ${eventId}:`, error);
    return 0;
  }
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

    // По умолчанию показываем только активные события (если статус не указан)
    if (!filters.status?.length) {
      query = query.eq('status', 'active');
    } else {
      query = query.in('status', filters.status);
    }
    
    // Только публичные события
    query = query.eq('is_public', true);
    
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

    // Пагинация
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('start_at', { ascending: true });

    const { data, error, count } = await query;
    if (error) throw error;

    // Обогащаем события данными спикеров и счетчиками
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          // Обогащаем спикеров
          const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);

          // Получаем счетчик регистраций
          const registrationsCount = await getRegistrationCounts(event.id);

          const availableSpots = event.max_attendees 
            ? Math.max(0, event.max_attendees - registrationsCount)
            : null;

          return {
            ...event,
            sh_event_speakers: speakersWithData,
            speakers: speakersWithData, // Алиас для обратной совместимости
            schedule: event.sh_event_schedule || [],
            ticket_types: event.sh_event_ticket_types || [],
            registrations_count: registrationsCount,
            available_spots: availableSpots
          };
        } catch (error) {
          console.warn(`Error loading details for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            schedule: event.sh_event_schedule || [],
            ticket_types: event.sh_event_ticket_types || [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createPaginatedResponse(eventsWithDetails, null, page, limit, count || 0);
  } catch (error) {
    console.error('Error in getEvents:', error);
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение рекомендуемых событий
export const getFeaturedEvents = async (limit: number = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'active') // Используем 'active' вместо 'published'
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
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
        } catch (error) {
          console.warn(`Error loading speakers for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    console.error('Error in getFeaturedEvents:', error);
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
      .select('*')
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,short_description.ilike.%${searchQuery}%`);

    // Применяем фильтры
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    } else {
      // По умолчанию ищем только в активных событиях
      query = query.eq('status', 'active');
    }

    if (filters.event_type?.length) {
      query = query.in('event_type', filters.event_type);
    }

    if (filters.payment_type?.length) {
      query = query.in('payment_type', filters.payment_type);
    }

    query = query
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, bio_override, speaker_id')
            .eq('event_id', event.id);

          const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
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
        } catch (error) {
          console.warn(`Error loading details for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    console.error('Error in searchEvents:', error);
    return createApiResponse(null, error);
  }
};

// Получение события по ID или slug
export const getEventById = async (idOrSlug: string): Promise<ApiResponse<EventWithDetails | null>> => {
  try {
    // Пробуем найти по ID, если не найдено - по slug
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
      `)
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .single();

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return createApiResponse(null);

    // Обогащаем спикеров данными
    const speakersWithData = await enrichEventSpeakers(data.sh_event_speakers || []);

    // Получаем счетчик регистраций
    const registrationsCount = await getRegistrationCounts(data.id);

    const availableSpots = data.max_attendees 
      ? Math.max(0, data.max_attendees - registrationsCount)
      : null;

    const enrichedEvent = {
      ...data,
      sh_event_speakers: speakersWithData,
      speakers: speakersWithData,
      schedule: data.sh_event_schedule || [],
      ticket_types: data.sh_event_ticket_types || [],
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    return createApiResponse(enrichedEvent);
  } catch (error) {
    console.error('Error in getEventById:', error);
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
      .eq('status', 'active') // Используем 'active' вместо 'published'
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
        const registrationsCount = await getRegistrationCounts(event.id);
        
        return {
          ...event,
          sh_event_speakers: speakersWithData,
          speakers: speakersWithData,
          registrations_count: registrationsCount,
          available_spots: event.max_attendees 
            ? Math.max(0, event.max_attendees - registrationsCount)
            : null
        };
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение статистики событий
export const getEventsStats = async (): Promise<ApiResponse<{
  total: number;
  active: number;
  past: number;
  draft: number;
  cancelled: number;
  featured: number;
}>> => {
  try {
    // Получаем статистику через обычные запросы
    const [totalResult, activeResult, pastResult, draftResult, cancelledResult, featuredResult] = await Promise.all([
      supabase.from('sh_events').select('*', { count: 'exact', head: true }),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'past'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('is_featured', true)
    ]);

    const stats = {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      past: pastResult.count || 0,
      draft: draftResult.count || 0,
      cancelled: cancelledResult.count || 0,
      featured: featuredResult.count || 0
    };

    return createApiResponse(stats);
  } catch (error) {
    console.error('Error in getEventsStats:', error);
    return createApiResponse(null, error);
  }
};

// Получение активных событий (для главной страницы)
export const getActiveEvents = async (limit: number = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true)
      .gte('start_at', new Date().toISOString()) // Только будущие события
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
          const registrationsCount = await getRegistrationCounts(event.id);

          return {
            ...event,
            sh_event_speakers: speakersWithData,
            speakers: speakersWithData,
            registrations_count: registrationsCount,
            available_spots: event.max_attendees 
              ? Math.max(0, event.max_attendees - registrationsCount)
              : null
          };
        } catch (error) {
          console.warn(`Error loading details for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    console.error('Error in getActiveEvents:', error);
    return createApiResponse(null, error);
  }
};

// Создание нового события
export const createEvent = async (eventData: Partial<ShEvent>): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .insert([{
        ...eventData,
        status: eventData.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    console.error('Error in createEvent:', error);
    return createApiResponse(null, error);
  }
};

// Обновление события
export const updateEvent = async (id: string, eventData: Partial<ShEvent>): Promise<ApiResponse<ShEvent>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    console.error('Error in updateEvent:', error);
    return createApiResponse(null, error);
  }
};

// Удаление события (мягкое удаление через статус)
export const deleteEvent = async (id: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_events')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    return createApiResponse(null, error);
  }
};

// Изменение статуса события
export const updateEventStatus = async (id: string, status: ShEventStatus): Promise<ApiResponse<ShEvent>> => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Если статус меняется на 'active', устанавливаем published_at
    if (status === 'active') {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('sh_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    console.error('Error in updateEventStatus:', error);
    return createApiResponse(null, error);
  }
};

// Получение событий по статусу (для админки)
export const getEventsByStatus = async (
  status: ShEventStatus,
  limit: number = 50
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Обогащаем базовыми данными без спикеров для производительности
    const eventsWithCounts = await Promise.all(
      (data || []).map(async (event) => {
        const registrationsCount = await getRegistrationCounts(event.id);
        
        return {
          ...event,
          speakers: [],
          sh_event_speakers: [],
          schedule: [],
          ticket_types: [],
          registrations_count: registrationsCount,
          available_spots: event.max_attendees 
            ? Math.max(0, event.max_attendees - registrationsCount)
            : null
        };
      })
    );

    return createApiResponse(eventsWithCounts);
  } catch (error) {
    console.error('Error in getEventsByStatus:', error);
    return createApiResponse(null, error);
  }
};

// Получение прошедших событий
export const getPastEvents = async (limit: number = 20): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('status', 'past')
      .eq('is_public', true)
      .order('start_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Обогащаем данными спикеров
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
          const registrationsCount = await getRegistrationCounts(event.id);

          return {
            ...event,
            sh_event_speakers: speakersWithData,
            speakers: speakersWithData,
            registrations_count: registrationsCount,
            available_spots: null // Для прошедших событий не актуально
          };
        } catch (error) {
          console.warn(`Error loading details for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    console.error('Error in getPastEvents:', error);
    return createApiResponse(null, error);
  }
};
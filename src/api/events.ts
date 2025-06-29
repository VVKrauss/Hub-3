// src/api/events.ts
// API для работы с новой системой событий (sh_events) с обработкой ошибок БД

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

// Получение списка событий с фильтрацией и пагинацией
export const getEvents = async (
  filters: EventFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<EventWithDetails>> => {
  try {
    // Сначала получаем основные данные событий без связанных таблиц
    let query = supabase
      .from('sh_events')
      .select('*', { count: 'exact' });

    // Применяем фильтры
    if (filters.status?.length) {
      // Фильтруем только валидные статусы enum
      const validStatuses = filters.status.filter(status => 
        ['draft', 'published', 'cancelled', 'completed', 'archived'].includes(status)
      );
      
      if (validStatuses.length > 0) {
        query = query.in('status', validStatuses);
      }
      
      // Обрабатываем специальные фильтры
      if (filters.status.includes('past')) {
        const now = new Date().toISOString();
        query = query.lte('end_at', now);
      }
      
      if (filters.status.includes('upcoming')) {
        const now = new Date().toISOString();
        query = query.gte('start_at', now);
      }
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

    const { data: events, error, count } = await query;

    if (error) throw error;

    // Получаем связанные данные отдельными запросами для каждого события
    const eventsWithDetails = await Promise.all(
      (events || []).map(async (event) => {
        try {
          // Получаем спикеров события
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, bio_override, speaker_id')
            .eq('event_id', event.id);

          // Получаем данные спикеров отдельно
          let speakers = [];
          if (eventSpeakers && eventSpeakers.length > 0) {
            const speakerIds = eventSpeakers.map(es => es.speaker_id);
            const { data: speakersData } = await supabase
              .from('sh_speakers')
              .select('id, name, slug, bio, field_of_expertise, avatar_url, status')
              .in('id', speakerIds);

            // Объединяем данные спикеров с данными связи
            speakers = eventSpeakers.map(eventSpeaker => ({
              ...eventSpeaker,
              speaker: speakersData?.find(s => s.id === eventSpeaker.speaker_id) || null
            }));
          }

          // Получаем расписание события
          const { data: schedule } = await supabase
            .from('sh_event_schedule')
            .select('*')
            .eq('event_id', event.id)
            .order('date, start_time');

          // Получаем типы билетов
          const { data: ticketTypes } = await supabase
            .from('sh_event_ticket_types')
            .select('*')
            .eq('event_id', event.id)
            .eq('is_active', true)
            .order('display_order');

          // Получаем количество регистраций
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
            sh_event_speakers: speakers || [],
            sh_event_schedule: schedule || [],
            sh_event_ticket_types: ticketTypes || [],
            registrations_count: registrationsCount || 0,
            available_spots: availableSpots
          };
        } catch (err) {
          console.warn(`Error loading details for event ${event.id}:`, err);
          // Возвращаем событие без дополнительных данных
          return {
            ...event,
            sh_event_speakers: [],
            sh_event_schedule: [],
            sh_event_ticket_types: [],
            registrations_count: 0,
            available_spots: null
          };
        }
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
    console.error('Error in getEvents:', error);
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного события по ID
export const getEvent = async (eventId: string): Promise<ApiResponse<EventWithDetails>> => {
  try {
    // Получаем основные данные события
    const { data: event, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    // Получаем связанные данные отдельными запросами
    const [eventSpeakersResult, scheduleResult, ticketTypesResult, registrationsResult] = await Promise.allSettled([
      // Спикеры события
      supabase
        .from('sh_event_speakers')
        .select('id, role, display_order, bio_override, speaker_id')
        .eq('event_id', eventId),
      
      // Расписание
      supabase
        .from('sh_event_schedule')
        .select('*')
        .eq('event_id', eventId)
        .order('date, start_time'),
      
      // Типы билетов
      supabase
        .from('sh_event_ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order'),
      
      // Количество регистраций
      supabase
        .from('sh_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('registration_status', 'active')
    ]);

    // Обрабатываем спикеров
    let speakers = [];
    if (eventSpeakersResult.status === 'fulfilled' && eventSpeakersResult.value.data) {
      const eventSpeakers = eventSpeakersResult.value.data;
      if (eventSpeakers.length > 0) {
        const speakerIds = eventSpeakers.map(es => es.speaker_id);
        const { data: speakersData } = await supabase
          .from('sh_speakers')
          .select(`
            id, name, slug, bio, field_of_expertise, birth_date, avatar_url, status
          `)
          .in('id', speakerIds);

        // Получаем социальные ссылки для каждого спикера
        const speakersWithSocial = await Promise.all(
          (speakersData || []).map(async (speaker) => {
            const { data: socialLinks } = await supabase
              .from('sh_speaker_social_links')
              .select('id, platform, url, display_name, is_public, display_order')
              .eq('speaker_id', speaker.id)
              .eq('is_public', true)
              .order('display_order');

            return {
              ...speaker,
              sh_speaker_social_links: socialLinks || []
            };
          })
        );

        speakers = eventSpeakers.map(eventSpeaker => ({
          ...eventSpeaker,
          speaker: speakersWithSocial.find(s => s.id === eventSpeaker.speaker_id) || null
        }));
      }
    }

    // Обрабатываем остальные данные
    const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value.data || [] : [];
    const ticketTypes = ticketTypesResult.status === 'fulfilled' ? ticketTypesResult.value.data || [] : [];
    const registrationsCount = registrationsResult.status === 'fulfilled' ? registrationsResult.value.count || 0 : 0;

    const availableSpots = event.max_attendees 
      ? Math.max(0, event.max_attendees - registrationsCount)
      : null;

    const eventWithDetails = {
      ...event,
      sh_event_speakers: speakers,
      sh_event_schedule: schedule,
      sh_event_ticket_types: ticketTypes,
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    return createApiResponse(eventWithDetails);
  } catch (error) {
    console.error('Error in getEvent:', error);
    return createApiResponse(null, error);
  }
};

// Получение события по slug
export const getEventBySlug = async (slug: string): Promise<ApiResponse<EventWithDetails>> => {
  try {
    const { data: event, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Используем getEvent для получения полных данных
    return await getEvent(event.id);
  } catch (error) {
    console.error('Error in getEventBySlug:', error);
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

// Получение ближайших событий
export const getUpcomingEvents = async (limit: number = 10): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const now = new Date().toISOString();
    
    const { data: events, error } = await supabase
      .from('sh_events')
      .select('*')
      .gte('start_at', now)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Получаем базовую информацию о спикерах для каждого события
    const eventsWithSpeakers = await Promise.all(
      (events || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          let speakers = [];
          if (eventSpeakers && eventSpeakers.length > 0) {
            const speakerIds = eventSpeakers.map(es => es.speaker_id);
            const { data: speakersData } = await supabase
              .from('sh_speakers')
              .select('id, name, slug, avatar_url')
              .in('id', speakerIds);

            speakers = eventSpeakers.map(eventSpeaker => ({
              ...eventSpeaker,
              speaker: speakersData?.find(s => s.id === eventSpeaker.speaker_id) || null
            }));
          }

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
            sh_event_speakers: speakers,
            registrations_count: registrationsCount || 0,
            available_spots: availableSpots
          };
        } catch (err) {
          console.warn(`Error loading speakers for event ${event.id}:`, err);
          return {
            ...event,
            sh_event_speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithSpeakers);
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    return createApiResponse(null, error);
  }
};

// Получение рекомендуемых событий
export const getFeaturedEvents = async (limit: number = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data: events, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Получаем базовую информацию о спикерах для каждого события
    const eventsWithSpeakers = await Promise.all(
      (events || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          let speakers = [];
          if (eventSpeakers && eventSpeakers.length > 0) {
            const speakerIds = eventSpeakers.map(es => es.speaker_id);
            const { data: speakersData } = await supabase
              .from('sh_speakers')
              .select('id, name, slug, avatar_url')
              .in('id', speakerIds);

            speakers = eventSpeakers.map(eventSpeaker => ({
              ...eventSpeaker,
              speaker: speakersData?.find(s => s.id === eventSpeaker.speaker_id) || null
            }));
          }

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
            sh_event_speakers: speakers,
            registrations_count: registrationsCount || 0,
            available_spots: availableSpots
          };
        } catch (err) {
          console.warn(`Error loading speakers for event ${event.id}:`, err);
          return {
            ...event,
            sh_event_speakers: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    return createApiResponse(eventsWithSpeakers);
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

    // Применяем дополнительные фильтры
    if (filters.status?.length) {
      // Фильтруем только валидные статусы enum
      const validStatuses = filters.status.filter(status => 
        ['draft', 'published', 'cancelled', 'completed', 'archived'].includes(status)
      );
      
      if (validStatuses.length > 0) {
        query = query.in('status', validStatuses);
      }
      
      // Обрабатываем специальные фильтры
      if (filters.status.includes('past')) {
        const now = new Date().toISOString();
        query = query.lte('end_at', now);
      }
      
      if (filters.status.includes('upcoming')) {
        const now = new Date().toISOString();
        query = query.gte('start_at', now);
      }
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

    const { data: events, error } = await query;

    if (error) throw error;

    // Добавляем базовую информацию о спикерах и регистрациях
    const eventsWithDetails = await Promise.all(
      (events || []).map(async (event) => {
        try {
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id')
            .eq('event_id', event.id);

          let speakers = [];
          if (eventSpeakers && eventSpeakers.length > 0) {
            const speakerIds = eventSpeakers.map(es => es.speaker_id);
            const { data: speakersData } = await supabase
              .from('sh_speakers')
              .select('id, name, slug, avatar_url')
              .in('id', speakerIds);

            speakers = eventSpeakers.map(eventSpeaker => ({
              ...eventSpeaker,
              speaker: speakersData?.find(s => s.id === eventSpeaker.speaker_id) || null
            }));
          }

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
            sh_event_speakers: speakers,
            registrations_count: registrationsCount || 0,
            available_spots: availableSpots
          };
        } catch (err) {
          console.warn(`Error loading details for event ${event.id}:`, err);
          return {
            ...event,
            sh_event_speakers: [],
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
    const now = new Date().toISOString();
    
    let query = supabase
      .from('sh_events')
      .select('status, start_at, end_at, is_featured, base_price, currency');

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

    if (regError) {
      console.warn('Error loading registrations stats:', regError);
    }

    const stats = {
      total: events?.length || 0,
      published: events?.filter(e => e.status === 'published').length || 0,
      draft: events?.filter(e => e.status === 'draft').length || 0,
      cancelled: events?.filter(e => e.status === 'cancelled').length || 0,
      past: events?.filter(e => new Date(e.end_at) < new Date()).length || 0,
      upcoming: events?.filter(e => new Date(e.start_at) > new Date()).length || 0,
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
    console.error('Error in getEventsStats:', error);
    return createApiResponse(null, error);
  }
};

// Остальные функции остаются без изменений...
export const duplicateEvent = async (
  eventId: string,
  newTitle: string,
  newStartAt: string,
  newEndAt: string
): Promise<ApiResponse<ShEvent>> => {
  try {
    const originalEvent = await getEvent(eventId);
    if (originalEvent.error || !originalEvent.data) {
      throw new Error('Событие не найдено');
    }

    const { id, created_at, updated_at, published_at, slug, ...eventData } = originalEvent.data;
    
    const newEvent = await createEvent({
      ...eventData,
      title: newTitle,
      start_at: newStartAt,
      end_at: newEndAt,
      slug: `${eventData.slug}-copy-${Date.now()}`,
      status: 'draft',
      published_at: null
    });

    if (newEvent.error || !newEvent.data) {
      throw new Error('Ошибка при создании копии события');
    }

    return newEvent;
  } catch (error) {
    return createApiResponse(null, error);
  }
};

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
    const { data: eventSpeakers, error } = await supabase
      .from('sh_event_speakers')
      .select('event_id')
      .eq('speaker_id', speakerId);

    if (error) throw error;

    if (!eventSpeakers || eventSpeakers.length === 0) {
      return createApiResponse([]);
    }

    const eventIds = eventSpeakers.map(es => es.event_id);
    
    const { data: events, error: eventsError } = await supabase
      .from('sh_events')
      .select('*')
      .in('id', eventIds)
      .order('start_at', { ascending: false });

    if (eventsError) throw eventsError;

    return createApiResponse(events || []);
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
    const { data: events, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('event_type', eventType)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return createApiResponse(events || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
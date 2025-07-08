import { supabase } from '../lib/supabase';
import type { EventWithDetails, PaginatedResponse, ApiResponse } from '../types/database';

// Helper function to create API response
const createApiResponse = <T>(data: T | null, error?: any): ApiResponse<T> => {
  if (error) {
    console.error('API Error:', error);
    return {
      data: null,
      error: error.message || 'An error occurred',
      success: false
    };
  }
  return {
    data,
    error: null,
    success: true
  };
};

// Helper function to enrich event speakers with full speaker data
const enrichEventSpeakers = async (eventSpeakers: any[]) => {
  if (!eventSpeakers || eventSpeakers.length === 0) return [];

  const speakerIds = eventSpeakers.map(es => es.speaker_id).filter(Boolean);
  
  if (speakerIds.length === 0) return [];

  const { data: speakers, error } = await supabase
    .from('sh_speakers')
    .select('*')
    .in('id', speakerIds)
    .eq('status', 'active');

  if (error) {
    console.warn('Error loading speakers:', error);
    return eventSpeakers;
  }

  return eventSpeakers.map(eventSpeaker => {
    const speaker = speakers?.find(s => s.id === eventSpeaker.speaker_id);
    return {
      ...eventSpeaker,
      speaker: speaker || null
    };
  });
};

// Helper function to get registration counts
const getRegistrationCounts = async (eventId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('sh_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('registration_status', 'active');

    if (error) {
      console.warn(`Error getting registration count for event ${eventId}:`, error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.warn(`Error getting registration count for event ${eventId}:`, error);
    return 0;
  }
};

// Helper function to get event schedule
const getEventSchedule = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('sh_event_schedule')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.warn(`Error getting schedule for event ${eventId}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn(`Error getting schedule for event ${eventId}:`, error);
    return [];
  }
};

// Helper function to get event ticket types
const getEventTicketTypes = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('sh_event_ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn(`Error getting ticket types for event ${eventId}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn(`Error getting ticket types for event ${eventId}:`, error);
    return [];
  }
};

// Get single event by ID with all details
export const getEventById = async (eventId: string): Promise<ApiResponse<EventWithDetails>> => {
  try {
    console.log('Fetching event by ID:', eventId);

    // First, get the event with speakers
    const { data: event, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          role,
          display_order,
          speaker_id,
          bio_override
        )
      `)
      .eq('id', eventId)
      .eq('is_public', true)
      .in('status', ['active', 'past'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Мероприятие не найдено');
      }
      throw error;
    }

    if (!event) {
      throw new Error('Мероприятие не найдено');
    }

    // Enrich with speaker data
    const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
    
    // Get registration count
    const registrationsCount = await getRegistrationCounts(event.id);

    // Get schedule
    const schedule = await getEventSchedule(event.id);

    // Get ticket types
    const ticketTypes = await getEventTicketTypes(event.id);

    // Calculate available spots
    const availableSpots = event.max_attendees 
      ? Math.max(0, event.max_attendees - registrationsCount)
      : null;

    const eventWithDetails: EventWithDetails = {
      ...event,
      sh_event_speakers: speakersWithData,
      speakers: speakersWithData, // Alias for backward compatibility
      schedule,
      ticket_types: ticketTypes,
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    console.log(`Event ${eventId} loaded successfully with ${speakersWithData.length} speakers`);

    return createApiResponse(eventWithDetails);
  } catch (error) {
    console.error('Error in getEventById:', error);
    return createApiResponse(null, error);
  }
};





// src/api/events.ts - БЫСТРОЕ ИСПРАВЛЕНИЕ

const getEvents = async (filters = {}, page = 1, limit = 12) => {
  try {
    let query = supabase
      .from('sh_events')
      .select('*, sh_event_speakers(id, role, display_order, speaker_id)')
      .eq('is_public', true)
      .in('status', ['active', 'past']);

    // УБИРАЕМ проблемный фильтр по event_type
    // if (filters.event_type?.length) {
    //   query = query.in('event_type', filters.event_type);
    // }

    if (filters.search?.trim()) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order('start_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: data || [],
      hasNext: (data?.length || 0) === limit,
    };
  } catch (error) {
    return { data: [], hasNext: false, error: error.message };
  }
};






// Получение событий конкретного спикера
export const getEventsBySpeaker = async (
  speakerId: string
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    console.log('Fetching events for speaker:', speakerId);

    const { data, error } = await supabase
      .from('sh_event_speakers')
      .select(`
        sh_events!inner (
          *,
          sh_event_speakers (
            id,
            role,
            display_order,
            speaker_id
          )
        )
      `)
      .eq('speaker_id', speakerId);

    if (error) throw error;

    // Извлекаем события и обогащаем их данными
    const events = (data || [])
      .map(item => item.sh_events)
      .filter(Boolean);

    // Обогащаем каждое событие данными спикеров и счетчиками
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        try {
          // Получаем всех спикеров события
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
            schedule: [], // Можно добавить загрузку расписания если нужно
            ticket_types: [], // Можно добавить загрузку типов билетов если нужно
            registrations_count: registrationsCount,
            available_spots: availableSpots
          };
        } catch (error) {
          console.warn(`Error loading details for event ${event.id}:`, error);
          return {
            ...event,
            sh_event_speakers: [],
            speakers: [],
            schedule: [],
            ticket_types: [],
            registrations_count: 0,
            available_spots: null
          };
        }
      })
    );

    // Сортируем: сначала будущие, потом прошедшие
    const sortedEvents = eventsWithDetails.sort((a, b) => {
      const dateA = new Date(a.start_at);
      const dateB = new Date(b.start_at);
      return dateB.getTime() - dateA.getTime(); // От новых к старым
    });

    console.log(`Found ${sortedEvents.length} events for speaker ${speakerId}`);

    return createApiResponse(sortedEvents);
  } catch (error) {
    console.error('Error in getEventsBySpeaker:', error);
    return createApiResponse(null, error);
  }
};
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

// Main function to get events with pagination and filters
export const getEvents = async (
  filters: {
    event_type?: string;
    status?: string;
    search?: string;
    featured?: boolean;
    upcoming?: boolean;
    past?: boolean;
  } = {},
  page: number = 1,
  limit: number = 12
): Promise<PaginatedResponse<EventWithDetails>> => {
  try {
    console.log('Fetching events with filters:', filters, 'page:', page, 'limit:', limit);

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
      `, { count: 'exact' })
      .eq('is_public', true)
      .in('status', ['active', 'past']);

    // Apply filters
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.featured) {
      query = query.eq('is_featured', true);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.upcoming) {
      query = query.gte('start_at', new Date().toISOString());
    }

    if (filters.past) {
      query = query.lt('start_at', new Date().toISOString());
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by start date (upcoming first, then past events)
    query = query.order('start_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    // Enrich events with speaker data and registration counts
    const eventsWithDetails = await Promise.all(
      (data || []).map(async (event) => {
        try {
          // Get speakers data
          const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
          
          // Get registration count
          const registrationsCount = await getRegistrationCounts(event.id);

          const availableSpots = event.max_attendees 
            ? Math.max(0, event.max_attendees - registrationsCount)
            : null;

          return {
            ...event,
            sh_event_speakers: speakersWithData,
            speakers: speakersWithData, // Alias for backward compatibility
            schedule: [], // Can be loaded separately if needed
            ticket_types: [], // Can be loaded separately if needed
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

    const totalPages = Math.ceil((count || 0) / limit);

    console.log(`Found ${eventsWithDetails.length} events (page ${page}/${totalPages})`);

    return {
      data: eventsWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      error: null,
      success: true
    };
  } catch (error) {
    console.error('Error in getEvents:', error);
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      error: error instanceof Error ? error.message : 'An error occurred',
      success: false
    };
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
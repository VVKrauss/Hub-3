import { supabase } from '../lib/supabase';
import type { EventWithDetails, PaginatedResponse, ApiResponse } from '../types/database';

// Helper function to create API response
const createApiResponse = <T>(data: T | null, error?: any): ApiResponse<T> => {
  if (error) {
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

    // Get the event without restrictive filters
    let { data: event, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('id', eventId)
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

    // Check accessibility for public viewing
    if (!event.is_public) {
      throw new Error('Мероприятие недоступно для публичного просмотра');
    }

    if (!['active', 'past', 'draft'].includes(event.status)) {
      throw new Error('Мероприятие отменено или недоступно');
    }

    // Load event speakers separately
    const { data: eventSpeakers, error: speakersError } = await supabase
      .from('sh_event_speakers')
      .select('id, role, display_order, speaker_id, bio_override')
      .eq('event_id', eventId)
      .order('display_order');

    if (speakersError) {
      console.warn('Error loading event speakers:', speakersError);
    }

    // Enrich speakers with full data
    const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
    
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
      speakers: speakersWithData,
      schedule,
      ticket_types: ticketTypes,
      registrations_count: registrationsCount,
      available_spots: availableSpots
    };

    return createApiResponse(eventWithDetails);
  } catch (error) {
    console.error('Error in getEventById:', error);
    return createApiResponse(null, error);
  }
};

// Get events with filters and pagination
export const getEvents = async (filters = {}, page = 1, limit = 12) => {
  try {
    let query = supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .in('status', ['active', 'past']);

    // Apply filters
    if (filters.search?.trim()) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters.event_type?.length) {
      query = query.in('event_type', filters.event_type);
    }

    if (filters.payment_type?.length) {
      query = query.in('payment_type', filters.payment_type);
    }

    if (filters.location_type) {
      query = query.eq('location_type', filters.location_type);
    }

    if (filters.is_featured) {
      query = query.eq('is_featured', true);
    }

    if (filters.date_from) {
      query = query.gte('start_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('start_at', filters.date_to);
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
    console.error('Error in getEvents:', error);
    return { data: [], hasNext: false, error: error.message };
  }
};

// Get events by speaker
export const getEventsBySpeaker = async (
  speakerId: string
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    console.log('Fetching events for speaker:', speakerId);

    // Get speaker event links
    const { data: eventSpeakerLinks, error: linksError } = await supabase
      .from('sh_event_speakers')
      .select('event_id')
      .eq('speaker_id', speakerId);

    if (linksError) throw linksError;

    if (!eventSpeakerLinks || eventSpeakerLinks.length === 0) {
      return createApiResponse([]);
    }

    const eventIds = eventSpeakerLinks.map(link => link.event_id);

    // Get events separately
    const { data: events, error: eventsError } = await supabase
      .from('sh_events')
      .select('*')
      .in('id', eventIds)
      .eq('is_public', true)
      .in('status', ['active', 'past'])
      .order('start_at', { ascending: false });

    if (eventsError) throw eventsError;

    // Enrich each event with details
    const eventsWithDetails = await Promise.all(
      (events || []).map(async (event) => {
        try {
          // Get event speakers
          const { data: eventSpeakers } = await supabase
            .from('sh_event_speakers')
            .select('id, role, display_order, speaker_id, bio_override')
            .eq('event_id', event.id)
            .order('display_order');

          const speakersWithData = await enrichEventSpeakers(eventSpeakers || []);
          
          // Get registration count
          const registrationsCount = await getRegistrationCounts(event.id);

          const availableSpots = event.max_attendees 
            ? Math.max(0, event.max_attendees - registrationsCount)
            : null;

          return {
            ...event,
            sh_event_speakers: speakersWithData,
            speakers: speakersWithData,
            schedule: [],
            ticket_types: [],
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

    return createApiResponse(eventsWithDetails);
  } catch (error) {
    console.error('Error in getEventsBySpeaker:', error);
    return createApiResponse(null, error);
  }
};

// Get featured events
export const getFeaturedEvents = async (limit = 6): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .eq('is_featured', true)
      .in('status', ['active'])
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in getFeaturedEvents:', error);
    return createApiResponse(null, error);
  }
};

// Get upcoming events
export const getUpcomingEvents = async (limit = 10): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'active')
      .gte('start_at', now)
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    return createApiResponse(null, error);
  }
};

// Get past events
export const getPastEvents = async (limit = 10): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .in('status', ['past'])
      .lt('end_at', now)
      .order('start_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in getPastEvents:', error);
    return createApiResponse(null, error);
  }
};

// Search events
export const searchEvents = async (
  query: string, 
  filters = {}, 
  limit = 20
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    let supabaseQuery = supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .in('status', ['active', 'past']);

    // Search in title and description
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Apply filters
    if (filters.event_type?.length) {
      supabaseQuery = supabaseQuery.in('event_type', filters.event_type);
    }

    if (filters.payment_type?.length) {
      supabaseQuery = supabaseQuery.in('payment_type', filters.payment_type);
    }

    supabaseQuery = supabaseQuery
      .order('start_at', { ascending: false })
      .limit(limit);

    const { data, error } = await supabaseQuery;

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in searchEvents:', error);
    return createApiResponse(null, error);
  }
};

// Get events by date range
export const getEventsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .in('status', ['active', 'past'])
      .gte('start_at', startDate)
      .lte('start_at', endDate)
      .order('start_at', { ascending: true });

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in getEventsByDateRange:', error);
    return createApiResponse(null, error);
  }
};

// Get events by type
export const getEventsByType = async (
  eventType: string,
  limit = 10
): Promise<ApiResponse<EventWithDetails[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_events')
      .select('*')
      .eq('is_public', true)
      .eq('event_type', eventType)
      .in('status', ['active', 'past'])
      .order('start_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error in getEventsByType:', error);
    return createApiResponse(null, error);
  }
};

// Get event statistics
export const getEventStats = async (): Promise<ApiResponse<any>> => {
  try {
    const [totalEvents, activeEvents, pastEvents, featuredEvents] = await Promise.all([
      supabase.from('sh_events').select('*', { count: 'exact', head: true }),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('status', 'past'),
      supabase.from('sh_events').select('*', { count: 'exact', head: true }).eq('is_featured', true)
    ]);

    const stats = {
      total: totalEvents.count || 0,
      active: activeEvents.count || 0,
      past: pastEvents.count || 0,
      featured: featuredEvents.count || 0
    };

    return createApiResponse(stats);
  } catch (error) {
    console.error('Error in getEventStats:', error);
    return createApiResponse(null, error);
  }
};
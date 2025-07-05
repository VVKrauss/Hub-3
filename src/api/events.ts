// Добавить эту функцию в src/api/events.ts

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
// src/api/speakers.ts - ФИНАЛЬНАЯ ВЕРСИЯ без fallback

export const getSpeaker = async (
  idOrSlug: string
): Promise<ApiResponse<SpeakerWithSocials>> => {
  try {
    console.log('Fetching speaker:', idOrSlug);

    const { data, error } = await supabase
      .from('sh_speakers')
      .select(`
        *,
        sh_speaker_social_links (
          id,
          platform,
          url,
          display_name,
          description,
          is_public,
          is_primary,
          display_order
        )
      `)
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Спикер не найден');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Спикер не найден');
    }

    // Сортируем социальные ссылки
    const speakerWithSortedSocials = {
      ...data,
      social_links: (data.sh_speaker_social_links || [])
        .filter(link => link.is_public)
        .sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
    };

    console.log('Speaker loaded successfully:', speakerWithSortedSocials.name);
    return createApiResponse(speakerWithSortedSocials);
  } catch (error) {
    console.error('Error in getSpeaker:', error);
    return createApiResponse(null, error);
  }
};

// src/api/events.ts - ФИНАЛЬНАЯ ВЕРСИЯ без fallback

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

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No events found for speaker:', speakerId);
      return createApiResponse([]);
    }

    // Извлекаем события и фильтруем
    const events = data
      .map(item => item.sh_events)
      .filter(Boolean)
      .filter(event => 
        event.is_public && 
        ['active', 'past'].includes(event.status)
      );

    // Обогащаем каждое событие
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const speakersWithData = await enrichEventSpeakers(event.sh_event_speakers || []);
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
      })
    );

    // Сортируем по дате
    const sortedEvents = eventsWithDetails.sort((a, b) => {
      const dateA = new Date(a.start_at);
      const dateB = new Date(b.start_at);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`Found ${sortedEvents.length} events for speaker`);
    return createApiResponse(sortedEvents);
  } catch (error) {
    console.error('Error in getEventsBySpeaker:', error);
    return createApiResponse(null, error);
  }
};

// src/pages/admin/CreateEditEventPage.tsx - ФИНАЛЬНАЯ ВЕРСИЯ без fallback

const loadEvent = async (id: string) => {
  try {
    setLoading(true);
    console.log('Loading event with ID:', id);

    const { data, error } = await supabase
      .from('sh_events')
      .select(`
        *,
        sh_event_speakers (
          id,
          speaker_id,
          role,
          display_order,
          bio_override
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
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        toast.error('Мероприятие не найдено');
        navigate('/admin/events');
        return;
      }
      throw error;
    }

    if (!data) {
      toast.error('Мероприятие не найдено');
      navigate('/admin/events');
      return;
    }

    // Загружаем данные спикеров
    const speakersData = await loadEventSpeakers(data.id);

    const eventToSet = {
      ...data,
      tags: data.tags || [],
      gallery_images: data.gallery_images || [],
      meta_keywords: data.meta_keywords || [],
      meta_title: data.meta_title || '',
      meta_description: data.meta_description || '',
      speakers: speakersData,
      festival_program: data.sh_event_schedule || []
    };

    console.log('Event loaded successfully:', data.title);
    setEvent(eventToSet);
    setSlugManuallyEdited(true);
  } catch (error) {
    console.error('Error loading event:', error);
    toast.error('Ошибка при загрузке мероприятия: ' + (error as any).message);
    navigate('/admin/events');
  } finally {
    setLoading(false);
  }
};
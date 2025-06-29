// src/api/speakers.ts
// API для работы с новой системой спикеров (sh_speakers)

import { supabase, createApiResponse, createPaginatedResponse, type ApiResponse, type PaginatedResponse } from '../lib/supabase';
import type { 
  ShSpeaker, 
  ShSpeakerSocialLink,
  SpeakerWithSocials,
  ShEventSpeaker,
  ShEvent
} from '../types/database';

// Фильтры для поиска спикеров
export interface SpeakerFilters {
  status?: ('active' | 'inactive' | 'pending')[];
  is_featured?: boolean;
  field_of_expertise?: string;
  search?: string;
}

// Получение списка спикеров с фильтрацией и пагинацией
export const getSpeakers = async (
  filters: SpeakerFilters = {},
  page: number = 1,
  limit: number = 12
): Promise<PaginatedResponse<SpeakerWithSocials>> => {
  try {
    let query = supabase
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
      `, { count: 'exact' });

    // Применяем фильтры
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }
    
    if (filters.field_of_expertise) {
      query = query.ilike('field_of_expertise', `%${filters.field_of_expertise}%`);
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%,field_of_expertise.ilike.%${filters.search}%`);
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .range(from, to)
      .order('name', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    // Сортируем социальные ссылки
    const speakersWithSortedSocials = (data || []).map(speaker => ({
      ...speaker,
      social_links: (speaker.sh_speaker_social_links || [])
        .filter(link => link.is_public)
        .sort((a, b) => {
          // Сначала основные ссылки, потом по порядку отображения
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
    }));

    return createPaginatedResponse(
      speakersWithSortedSocials, 
      null, 
      page, 
      limit, 
      count || 0
    );
  } catch (error) {
    return createPaginatedResponse(null, error, page, limit, 0);
  }
};

// Получение конкретного спикера по ID или slug
export const getSpeaker = async (
  identifier: string,
  bySlug: boolean = false
): Promise<ApiResponse<SpeakerWithSocials>> => {
  try {
    let query = supabase
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
        ),
        sh_event_speakers (
          id,
          role,
          display_order,
          bio_override,
          sh_events (
            id,
            slug,
            title,
            short_description,
            start_at,
            end_at,
            cover_image_url,
            status,
            is_public
          )
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

    // Формируем результат с отсортированными ссылками и событиями
    const speakerWithDetails = {
      ...data,
      social_links: (data.sh_speaker_social_links || [])
        .filter(link => link.is_public)
        .sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        }),
      events: (data.sh_event_speakers || [])
        .filter(eventSpeaker => 
          eventSpeaker.sh_events?.status === 'published' && 
          eventSpeaker.sh_events?.is_public
        )
        .sort((a, b) => 
          new Date(b.sh_events!.start_at).getTime() - new Date(a.sh_events!.start_at).getTime()
        )
        .map(eventSpeaker => ({
          ...eventSpeaker,
          event: eventSpeaker.sh_events
        }))
    };

    return createApiResponse(speakerWithDetails);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание нового спикера
export const createSpeaker = async (
  speakerData: Omit<ShSpeaker, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<ShSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .insert([speakerData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление спикера
export const updateSpeaker = async (
  speakerId: string,
  updates: Partial<Omit<ShSpeaker, 'id' | 'created_at'>>
): Promise<ApiResponse<ShSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', speakerId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Удаление спикера
export const deleteSpeaker = async (speakerId: string): Promise<ApiResponse<boolean>> => {
  try {
    // Сначала удаляем связанные социальные ссылки
    await supabase
      .from('sh_speaker_social_links')
      .delete()
      .eq('speaker_id', speakerId);

    // Удаляем связи с событиями
    await supabase
      .from('sh_event_speakers')
      .delete()
      .eq('speaker_id', speakerId);

    // Удаляем самого спикера
    const { error } = await supabase
      .from('sh_speakers')
      .delete()
      .eq('id', speakerId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение рекомендуемых спикеров для главной страницы
export const getFeaturedSpeakers = async (limit: number = 6): Promise<ApiResponse<SpeakerWithSocials[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .select(`
        *,
        sh_speaker_social_links (
          id,
          platform,
          url,
          display_name,
          is_public,
          is_primary,
          display_order
        )
      `)
      .eq('status', 'active')
      .eq('is_featured', true)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const speakersWithSortedSocials = (data || []).map(speaker => ({
      ...speaker,
      social_links: (speaker.sh_speaker_social_links || [])
        .filter(link => link.is_public)
        .sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
    }));

    return createApiResponse(speakersWithSortedSocials);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение спикеров конкретного события
export const getEventSpeakers = async (eventId: string): Promise<ApiResponse<(ShEventSpeaker & { speaker: SpeakerWithSocials })[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_event_speakers')
      .select(`
        *,
        sh_speakers (
          *,
          sh_speaker_social_links (
            id,
            platform,
            url,
            display_name,
            is_public,
            is_primary,
            display_order
          )
        )
      `)
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    const eventSpeakers = (data || []).map(eventSpeaker => ({
      ...eventSpeaker,
      speaker: {
        ...eventSpeaker.sh_speakers,
        social_links: (eventSpeaker.sh_speakers?.sh_speaker_social_links || [])
          .filter(link => link.is_public)
          .sort((a, b) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
          })
      }
    }));

    return createApiResponse(eventSpeakers);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Поиск спикеров
export const searchSpeakers = async (
  searchQuery: string,
  limit: number = 20
): Promise<ApiResponse<SpeakerWithSocials[]>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .select(`
        *,
        sh_speaker_social_links (
          id,
          platform,
          url,
          display_name,
          is_public,
          is_primary
        )
      `)
      .or(`name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%,field_of_expertise.ilike.%${searchQuery}%`)
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const speakersWithSortedSocials = (data || []).map(speaker => ({
      ...speaker,
      social_links: (speaker.sh_speaker_social_links || [])
        .filter(link => link.is_public)
        .sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return 0;
        })
    }));

    return createApiResponse(speakersWithSortedSocials);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Работа с социальными ссылками спикера
export const addSpeakerSocialLink = async (
  socialLinkData: Omit<ShSpeakerSocialLink, 'id' | 'created_at'>
): Promise<ApiResponse<ShSpeakerSocialLink>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speaker_social_links')
      .insert([socialLinkData])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const updateSpeakerSocialLink = async (
  linkId: string,
  updates: Partial<Omit<ShSpeakerSocialLink, 'id' | 'created_at'>>
): Promise<ApiResponse<ShSpeakerSocialLink>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speaker_social_links')
      .update(updates)
      .eq('id', linkId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

export const deleteSpeakerSocialLink = async (linkId: string): Promise<ApiResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('sh_speaker_social_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
    return createApiResponse(true);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Статистика спикеров
export const getSpeakersStats = async (): Promise<ApiResponse<{
  total: number;
  active: number;
  inactive: number;
  pending: number;
  featured: number;
  with_events: number;
}>> => {
  try {
    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: pending },
      { count: featured },
      { count: withEvents }
    ] = await Promise.all([
      supabase.from('sh_speakers').select('*', { count: 'exact', head: true }),
      supabase.from('sh_speakers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('sh_speakers').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
      supabase.from('sh_speakers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sh_speakers').select('*', { count: 'exact', head: true }).eq('is_featured', true),
      supabase.from('sh_event_speakers').select('speaker_id', { count: 'exact', head: true })
    ]);

    return createApiResponse({
      total: total || 0,
      active: active || 0,
      inactive: inactive || 0,
      pending: pending || 0,
      featured: featured || 0,
      with_events: withEvents || 0
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Установка статуса "рекомендуемый"
export const toggleSpeakerFeatured = async (
  speakerId: string,
  featured: boolean
): Promise<ApiResponse<ShSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .update({ 
        is_featured: featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', speakerId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Изменение статуса спикера
export const updateSpeakerStatus = async (
  speakerId: string,
  status: 'active' | 'inactive' | 'pending'
): Promise<ApiResponse<ShSpeaker>> => {
  try {
    const { data, error } = await supabase
      .from('sh_speakers')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', speakerId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
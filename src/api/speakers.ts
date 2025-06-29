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
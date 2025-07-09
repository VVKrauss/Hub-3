// src/api/courses.ts - API функции для работы с курсами
import { supabase } from '../lib/supabase';
import type { ApiResponse } from '../types/database';

// Интерфейс курса
export interface Course {
  id: string;
  title: string;
  slug?: string;
  short_description?: string;
  description?: string;
  course_type: 'offline' | 'online' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  duration_hours?: number;
  start_date?: string;
  end_date?: string;
  enrollment_start?: string;
  enrollment_end?: string;
  max_students?: number;
  current_students: number;
  price?: number;
  currency: string;
  payment_type: 'free' | 'paid' | 'subscription';
  cover_image_url?: string;
  gallery_images?: string[];
  video_url?: string;
  instructor_id?: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  online_platform?: string;
  is_featured: boolean;
  is_public: boolean;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// Интерфейс курса с данными инструктора
export interface CourseWithInstructor extends Course {
  instructor?: {
    id: string;
    name: string;
    avatar_url?: string;
    field_of_expertise?: string;
    bio?: string;
  };
}

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

// Получение всех публичных курсов
export const getCourses = async (): Promise<ApiResponse<Course[]>> => {
  try {

    const { data, error } = await supabase
      .from('sh_courses')
      .select('*')
      .eq('is_public', true)
      .in('status', ['published'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение курса по ID
export const getCourseById = async (courseId: string): Promise<ApiResponse<CourseWithInstructor>> => {
  try {

    const { data: course, error } = await supabase
      .from('sh_courses')
      .select(`
        *,
        instructor:sh_speakers(
          id,
          name,
          avatar_url,
          field_of_expertise,
          bio
        )
      `)
      .eq('id', courseId)
      .eq('is_public', true)
      .in('status', ['published'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Курс не найден');
      }
      throw error;
    }

    if (!course) {
      throw new Error('Курс не найден');
    }

    return createApiResponse(course);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение курсов по инструктору (спикеру)
export const getCoursesByInstructor = async (instructorId: string): Promise<ApiResponse<Course[]>> => {
  try {

    const { data, error } = await supabase
      .from('sh_courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('is_public', true)
      .in('status', ['published'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Found ${data?.length || 0} courses for instructor ${instructorId}`);
    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение рекомендуемых курсов
export const getFeaturedCourses = async (): Promise<ApiResponse<Course[]>> => {
  try {

    const { data, error } = await supabase
      .from('sh_courses')
      .select('*')
      .eq('is_public', true)
      .eq('is_featured', true)
      .in('status', ['published'])
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение курсов по категории
export const getCoursesByCategory = async (category: string): Promise<ApiResponse<Course[]>> => {
  try {

    const { data, error } = await supabase
      .from('sh_courses')
      .select('*')
      .eq('is_public', true)
      .eq('category', category)
      .in('status', ['published'])
      .order('created_at', { ascending: false });

    if (error) throw error;


    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Поиск курсов
export const searchCourses = async (
  query: string,
  filters?: {
    course_type?: string[];
    level?: string[];
    payment_type?: string[];
    category?: string[];
  }
): Promise<ApiResponse<Course[]>> => {
  try {

    let supabaseQuery = supabase
      .from('sh_courses')
      .select('*')
      .eq('is_public', true)
      .in('status', ['published']);

    // Поиск по тексту
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${query}%,short_description.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    // Применяем фильтры
    if (filters?.course_type && filters.course_type.length > 0) {
      supabaseQuery = supabaseQuery.in('course_type', filters.course_type);
    }

    if (filters?.level && filters.level.length > 0) {
      supabaseQuery = supabaseQuery.in('level', filters.level);
    }

    if (filters?.payment_type && filters.payment_type.length > 0) {
      supabaseQuery = supabaseQuery.in('payment_type', filters.payment_type);
    }

    if (filters?.category && filters.category.length > 0) {
      supabaseQuery = supabaseQuery.in('category', filters.category);
    }

    // Сортировка: сначала рекомендуемые, потом по дате
    supabaseQuery = supabaseQuery.order('is_featured', { ascending: false });
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

    const { data, error } = await supabaseQuery;

    if (error) throw error;

    return createApiResponse(data || []);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение статистики курсов
export const getCoursesStats = async (): Promise<ApiResponse<{
  total: number;
  byType: Record<string, number>;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
}>> => {
  try {

    const { data, error } = await supabase
      .from('sh_courses')
      .select('course_type, level, category')
      .eq('is_public', true)
      .in('status', ['published']);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    // Подсчитываем статистику
    data?.forEach(course => {
      // По типу
      stats.byType[course.course_type] = (stats.byType[course.course_type] || 0) + 1;
      
      // По уровню
      stats.byLevel[course.level] = (stats.byLevel[course.level] || 0) + 1;
      
      // По категории
      if (course.category) {
        stats.byCategory[course.category] = (stats.byCategory[course.category] || 0) + 1;
      }
    });

    return createApiResponse(stats);
  } catch (error) {
    return createApiResponse(null, error);
  }
};




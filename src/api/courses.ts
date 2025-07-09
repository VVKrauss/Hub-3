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
    console.log('Fetching courses...');

    const { data, error } = await supabase
      .from('sh_courses')
      .select('*')
      .eq('is_public', true)
      .in('status', ['published'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Loaded ${data?.length || 0} courses`);
    return createApiResponse(data || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return createApiResponse(null, error);
  }
};

// Получение курса по ID
export const getCourseById = async (courseId: string): Promise<ApiResponse<CourseWithInstructor>> => {
  try {
    console.log('Fetching course by ID:', courseId);

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

    console.log('Course loaded successfully:', course.title);
    return createApiResponse(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return createApiResponse(null, error);
  }
};

// Получение курсов по инструктору (спикеру)
export const getCoursesByInstructor = async (instructorId: string): Promise<ApiResponse<Course[]>> => {
  try {
    console.log('Fetching courses by instructor:', instructorId);

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
    console.error('Error fetching courses by instructor:', error);
    return createApiResponse(null, error);
  }
};

// Получение рекомендуемых курсов
export const getFeaturedCour
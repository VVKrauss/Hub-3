// src/types/database.ts
// Типы для новой структуры БД с префиксом sh_ 
// ФИНАЛЬНАЯ ВЕРСИЯ с исправленными статусами и поддержкой медиафайлов

// Основные enum типы из БД

type ShEventType = 
  | 'lecture' 
  | 'workshop' 
  | 'conference'
  | 'seminar'
  | 'festival' 
  | 'discussion'
  | 'concert'
  | 'standup'
  | 'excursion'
  | 'quiz'
  | 'swap'
  | 'movie_discussion'
  | 'conversation_club'
  | 'other';
type ShEventStatus = 'draft' | 'active' | 'past' | 'cancelled';
type ShAgeCategory = '0+' | '6+' | '12+' | '16+' | '18+';
type ShPaymentType = 'free' | 'paid' | 'donation';
type ShUserRole = 'admin' | 'moderator' | 'member' | 'guest';
type ShUserStatus = 'active' | 'inactive' | 'banned' | 'pending';
type ShRegistrationStatus = 'active' | 'cancelled' | 'waitlist';
type ShPaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';
type ShRegistrationType = 'user' | 'admin' | 'import';
type ShSpeakerStatus = 'pending' | 'active' | 'inactive';
type ShBookingType = 'event' | 'rental' | 'meeting' | 'other';
type ShBookingStatus = 'confirmed' | 'pending' | 'cancelled';
type ShAuthProvider = 'email' | 'google' | 'facebook' | 'github';
type ShSocialPlatform = 'website' | 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'github';

// Главные таблицы
export interface ShEvent {
  id: string;
  slug: string;
  title: string;
  short_description?: string;
  description?: string;
  event_type: ShEventType;
  status: ShEventStatus;
  age_category: ShAgeCategory;
  tags?: string[];
  language_code: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: string;
  venue_name?: string;
  venue_address?: string;
  venue_coordinates?: any; // PostGIS point
  online_meeting_url?: string;
  online_platform?: string;
  
  // ПОЛЯ ДЛЯ МЕДИАФАЙЛОВ
  cover_image_url?: string;              // Кадрированное фоновое изображение (3:1)
  cover_image_original_url?: string;     // Оригинальное фоновое изображение
  gallery_images?: string[];             // Массив URL изображений галереи
  
  video_url?: string;
  payment_type: ShPaymentType;
  base_price?: number;
  currency: string;
  price_description?: string;
  registration_required: boolean;
  registration_enabled: boolean;
  registration_start_at?: string;
  registration_end_at?: string;
  max_attendees?: number;
  attendee_limit_per_registration: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  is_featured: boolean;
  is_public: boolean;
  show_attendees_count: boolean;
  allow_waitlist: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface ShUser {
  id: string;
  email?: string;
  name: string;
  avatar_url?: string;
  role: ShUserRole;
  status: ShUserStatus;
  phone?: string;
  location?: string;
  bio?: string;
  auth_provider: ShAuthProvider;
  auth_provider_id?: string;
  email_confirmed: boolean;
  email_confirmed_at?: string;
  phone_confirmed: boolean;
  phone_confirmed_at?: string;
  qr_token: string;
  last_sign_in_at?: string;
  sign_in_count?: number;
  banned_until?: string;
  ban_reason?: string;
  language_code?: string;
  timezone?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  additional_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ShSpeaker {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  field_of_expertise?: string;
  birth_date?: string;
  avatar_url?: string;
  private_notes?: string;
  status: ShSpeakerStatus;
  is_featured: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShSpeakerSocialLink {
  id: string;
  speaker_id: string;
  platform: ShSocialPlatform;
  url: string;
  display_name?: string;
  description?: string;
  is_public: boolean;
  is_primary: boolean;
  display_order?: number;
  created_at: string;
}

interface ShRegistration {
  id: string;
  external_registration_id?: string;
  event_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  adult_tickets: number;
  child_tickets: number;
  total_tickets?: number;
  total_amount: number;
  currency: string;
  registration_status: ShRegistrationStatus;
  payment_status: ShPaymentStatus;
  registration_type: ShRegistrationType;
  qr_code: string;
  confirmed_at?: string;
  attended_at?: string;
  notes?: string;
  attendee_notes?: string;
  special_requirements?: string;
  registration_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface ShRegistrationTicket {
  id: string;
  registration_id: string;
  ticket_type_id?: string;
  ticket_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  ticket_status: ShRegistrationStatus;
  qr_codes?: string[];
  created_at: string;
}

interface ShEventTicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  max_quantity?: number;
  min_age?: number;
  max_age?: number;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface ShEventSpeaker {
  id: string;
  event_id: string;
  speaker_id: string;
  role: string;
  display_order?: number;
  bio_override?: string;
  created_at: string;
  updated_at: string;
}

interface ShEventSchedule {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  start_time: string; // time
  end_time: string; // time  
  date: string; // date
  speaker_id?: string;
  location_override?: string;
  display_order?: number;
  created_at: string;
}

interface ShSpaceBooking {
  id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  booking_type: ShBookingType;
  booking_status: ShBookingStatus;
  event_id?: string;
  booked_by_user_id?: string;
  title: string;
  description?: string;
  booking_details?: Record<string, any>;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  space_name?: string;
  required_equipment?: string[];
  setup_notes?: string;
  price_amount?: number;
  currency?: string;
  payment_status?: string;
  is_recurring?: boolean;
  recurrence_pattern?: Record<string, any>;
  parent_booking_id?: string;
  external_booking_id?: string;
  source?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Настройки сайта
interface ShSiteSettings {
  id: string;
  site_title?: string;
  site_description?: string;
  site_logo_url?: string;
  site_favicon_url?: string;
  navigation_items?: Record<string, any>;
  navigation_style?: Record<string, any>;
  footer_settings?: Record<string, any>;
  homepage_hero_section?: Record<string, any>;
  homepage_about_section?: Record<string, any>;
  homepage_events_section?: Record<string, any>;
  homepage_services_section?: Record<string, any>;
  about_page_settings?: Record<string, any>;
  rent_page_settings?: Record<string, any>;
  coworking_page_settings?: Record<string, any>;
  events_page_settings?: Record<string, any>;
  speakers_page_settings?: Record<string, any>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

// Пользовательские связи и сессии
interface ShUserConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  connection_type: string;
  created_at: string;
}

interface ShUserSession {
  id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  started_at: string;
  ended_at?: string;
  last_activity_at?: string;
  is_active: boolean;
}

// Вспомогательные типы для работы с API
export interface EventWithDetails extends ShEvent {
  speakers?: (ShEventSpeaker & { speaker: ShSpeaker })[];
  schedule?: ShEventSchedule[];
  ticket_types?: ShEventTicketType[];
  registrations_count?: number;
  available_spots?: number;
  // Алиасы для обратной совместимости
  sh_event_speakers?: (ShEventSpeaker & { speaker: ShSpeaker })[];
  sh_event_schedule?: ShEventSchedule[];
  sh_event_ticket_types?: ShEventTicketType[];
  // Поля для медиафайлов (из view sh_events_with_media)
  display_cover_image?: string;
  media_count?: number;
  has_cover_image?: boolean;
  has_gallery_images?: boolean;
}

export interface SpeakerWithSocials extends ShSpeaker {
  social_links?: ShSpeakerSocialLink[];
  events?: (ShEventSpeaker & { event: ShEvent })[];
}

interface RegistrationWithTickets extends ShRegistration {
  tickets?: ShRegistrationTicket[];
  event?: ShEvent;
  user?: ShUser;
}

// API Response типы
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Фильтры и параметры поиска
interface EventFilters {
  status?: ShEventStatus[];
  event_type?: ShEventType[];
  age_category?: ShAgeCategory[];
  payment_type?: ShPaymentType[];
  date_from?: string;
  date_to?: string;
  location_type?: string;
  is_featured?: boolean;
  search?: string;
}

interface UserFilters {
  role?: ShUserRole[];
  status?: ShUserStatus[];
  search?: string;
  registration_date_from?: string;
  registration_date_to?: string;
}

interface BookingFilters {
  booking_type?: ShBookingType[];
  booking_status?: ShBookingStatus[];
  date_from?: string;
  date_to?: string;
  space_name?: string;
  search?: string;
}

interface SpeakerFilters {
  status?: ShSpeakerStatus[];
  is_featured?: boolean;
  field_of_expertise?: string;
  search?: string;
}

interface RegistrationFilters {
  event_id?: string;
  registration_status?: ShRegistrationStatus[];
  payment_status?: ShPaymentStatus[];
  registration_type?: ShRegistrationType[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Константы для использования в приложении
const EVENT_STATUS_LABELS: Record<ShEventStatus, string> = {
  draft: 'Черновик',
  active: 'Активное',
  past: 'Прошедшее', 
  cancelled: 'Отменено'
};

// Обновить лейблы:
const EVENT_TYPE_LABELS: Record<ShEventType, string> = {
  lecture: 'Лекция',
  workshop: 'Мастер-класс',
  conference: 'Конференция',
  seminar: 'Семинар', 
  festival: 'Фестиваль',
  discussion: 'Дискуссия',
  concert: 'Концерт',
  standup: 'Стендап',
  excursion: 'Экскурсия',
  quiz: 'Викторина',
  swap: 'Обмен',
  movie_discussion: 'Обсуждение фильма',
  conversation_club: 'Разговорный клуб',
  other: 'Другое'
};

const PAYMENT_TYPE_LABELS: Record<ShPaymentType, string> = {
  free: 'Бесплатно',
  paid: 'Платно',
  donation: 'Донейшн'
};

const AGE_CATEGORY_LABELS: Record<ShAgeCategory, string> = {
  '0+': '0+',
  '6+': '6+', 
  '12+': '12+',
  '16+': '16+',
  '18+': '18+'
};

// Утилиты для работы со статусами
const getEventStatusFromDate = (startDate: string): ShEventStatus => {
  const now = new Date();
  const eventDate = new Date(startDate);
  
  return eventDate < now ? 'past' : 'active';
};

const isEventActive = (event: ShEvent): boolean => {
  return event.status === 'active' && event.is_public;
};

const isEventUpcoming = (event: ShEvent): boolean => {
  const now = new Date();
  const eventDate = new Date(event.start_at);
  
  return eventDate > now && event.status === 'active';
};

const isEventPast = (event: ShEvent): boolean => {
  const now = new Date();
  const eventDate = new Date(event.start_at);
  
  return eventDate < now;
};

const getEventDisplayStatus = (event: ShEvent): string => {
  if (isEventPast(event) && event.status === 'active') {
    return 'Завершено';
  }
  return EVENT_STATUS_LABELS[event.status];
};

// ==============================
// ДОПОЛНИТЕЛЬНЫЕ ТИПЫ И УТИЛИТЫ ДЛЯ МЕДИАФАЙЛОВ
// ==============================

// Интерфейс для работы с медиафайлами события
export interface EventMediaFields {
  cover_image_url?: string;
  cover_image_original_url?: string;
  gallery_images?: string[];
}

// Расширенный интерфейс события с медиафайлами
export interface EventWithMedia extends ShEvent {
  // Вычисляемые поля из view sh_events_with_media
  display_cover_image?: string;
  media_count?: number;
  has_cover_image?: boolean;
  has_gallery_images?: boolean;
}

// Интерфейс для обновления медиафайлов события
export interface EventMediaUpdatePayload {
  cover_image_url?: string | null;
  cover_image_original_url?: string | null;
  gallery_images?: string[] | null;
}

// Интерфейс для создания события с медиафайлами
export interface CreateEventWithMediaPayload extends Omit<ShEvent, 'id' | 'created_at' | 'updated_at'> {
  // Медиафайлы опциональны при создании
  cover_image_url?: string;
  cover_image_original_url?: string;
  gallery_images?: string[];
}

// Утилиты для работы с медиафайлами (без строгой валидации)
export const EventMediaUtils = {
  /**
   * Получает URL фонового изображения с fallback
   */
  getCoverImageUrl: (event: ShEvent, preferOriginal: boolean = false): string | null => {
    if (preferOriginal && event.cover_image_original_url) {
      return event.cover_image_original_url;
    }
    return event.cover_image_url || event.cover_image_original_url || null;
  },

  /**
   * Получает массив URL изображений галереи
   */
  getGalleryImageUrls: (event: ShEvent): string[] => {
    return event.gallery_images || [];
  },

  /**
   * Проверяет наличие медиафайлов
   */
  hasMedia: (event: ShEvent): boolean => {
    return !!(event.cover_image_url || event.cover_image_original_url || event.gallery_images?.length);
  },

  /**
   * Подсчитывает количество медиафайлов
   */
  getMediaCount: (event: ShEvent): number => {
    let count = 0;
    if (event.cover_image_url || event.cover_image_original_url) count++;
    if (event.gallery_images?.length) count += event.gallery_images.length;
    return count;
  },

  /**
   * Проверяет, выглядит ли строка как URL изображения (мягкая валидация)
   */
  looksLikeImageUrl: (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    // Проверяем, что это похоже на URL
    const looksLikeUrl = url.includes('://') || url.startsWith('/') || url.startsWith('data:');
    
    return looksLikeUrl;
  },

  /**
   * Очищает URL от лишних пробелов и валидирует базово
   */
  cleanImageUrl: (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const cleaned = url.trim();
    if (cleaned === '') return null;
    
    return cleaned;
  },

  /**
   * Создает объект для обновления медиафайлов
   */
  createMediaUpdatePayload: (
    coverImageUrl?: string,
    coverImageOriginalUrl?: string,
    galleryImages?: string[]
  ): EventMediaUpdatePayload => ({
    cover_image_url: EventMediaUtils.cleanImageUrl(coverImageUrl),
    cover_image_original_url: EventMediaUtils.cleanImageUrl(coverImageOriginalUrl),
    gallery_images: galleryImages?.filter(url => EventMediaUtils.cleanImageUrl(url)) || null
  }),

  /**
   * Подготавливает данные события для сохранения
   */
  prepareEventForSave: (event: Partial<ShEvent>): Partial<ShEvent> => {
    return {
      ...event,
      cover_image_url: EventMediaUtils.cleanImageUrl(event.cover_image_url),
      cover_image_original_url: EventMediaUtils.cleanImageUrl(event.cover_image_original_url),
      gallery_images: event.gallery_images?.filter(url => 
        EventMediaUtils.cleanImageUrl(url)
      ) || []
    };
  }
};

// Константы для медиафайлов
export const EVENT_MEDIA_CONSTRAINTS = {
  MAX_GALLERY_IMAGES: 50,
  MAX_FILE_SIZE: 7 * 1024 * 1024, // 7MB
  MIN_IMAGE_SIZE: { width: 200, height: 200 },
  COVER_IMAGE_RATIO: 3, // 3:1
  COVER_IMAGE_SIZE: { width: 1500, height: 500 },
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  STORAGE_PATHS: {
    COVER: 'events/{eventId}/cover/',
    GALLERY: 'events/{eventId}/gallery/'
  }
} as const;

// Типы для валидации медиафайлов (мягкая валидация)
export interface MediaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MediaValidationOptions {
  validateCoverImage?: boolean;
  validateGalleryImages?: boolean;
  maxGalleryImages?: number;
  requiredCoverImage?: boolean;
  strictValidation?: boolean; // Для включения строгой валидации в будущем
}

// Функция мягкой валидации медиафайлов события
export const validateEventMedia = (
  event: Partial<ShEvent>,
  options: MediaValidationOptions = {}
): MediaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    validateCoverImage = true,
    validateGalleryImages = true,
    maxGalleryImages = EVENT_MEDIA_CONSTRAINTS.MAX_GALLERY_IMAGES,
    requiredCoverImage = false,
    strictValidation = false
  } = options;

  // Валидация фонового изображения
  if (validateCoverImage) {
    if (requiredCoverImage && !event.cover_image_url && !event.cover_image_original_url) {
      errors.push('Фоновое изображение обязательно');
    }

    if (event.cover_image_url && strictValidation) {
      if (!EventMediaUtils.looksLikeImageUrl(event.cover_image_url)) {
        errors.push('Некорректный URL фонового изображения');
      }
    }

    if (event.cover_image_original_url && strictValidation) {
      if (!EventMediaUtils.looksLikeImageUrl(event.cover_image_original_url)) {
        errors.push('Некорректный URL оригинального изображения');
      }
    }
  }

  // Валидация галереи
  if (validateGalleryImages && event.gallery_images) {
    if (event.gallery_images.length > maxGalleryImages) {
      errors.push(`Превышен лимит изображений в галерее (максимум ${maxGalleryImages})`);
    }

    if (strictValidation) {
      const invalidUrls = event.gallery_images.filter(url => 
        !EventMediaUtils.looksLikeImageUrl(url)
      );
      if (invalidUrls.length > 0) {
        warnings.push(`Подозрительные URL в галерее: ${invalidUrls.length} изображений`);
      }
    }

    if (event.gallery_images.length === 0) {
      warnings.push('Галерея пустая');
    }
  }

  // Общие предупреждения
  if (!EventMediaUtils.hasMedia(event as ShEvent)) {
    warnings.push('Мероприятие не содержит изображений');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Enum для типов медиафайлов
export enum EventMediaType {
  COVER_IMAGE = 'cover_image',
  COVER_IMAGE_ORIGINAL = 'cover_image_original',
  GALLERY_IMAGE = 'gallery_image'
}

// Интерфейс для работы с медиафайлами в API
export interface EventMediaApiResponse {
  success: boolean;
  data?: {
    cover_image_url?: string;
    cover_image_original_url?: string;
    gallery_images?: string[];
  };
  error?: string;
  media_count?: number;
}

// Интерфейс для загрузки медиафайлов
export interface EventMediaUploadRequest {
  event_id: string;
  media_type: EventMediaType;
  file_data: string | ArrayBuffer; // Base64 или binary data
  file_name: string;
  file_size: number;
  mime_type: string;
  replace_existing?: boolean;
}

// Ответ на загрузку медиафайла
export interface EventMediaUploadResponse {
  success: boolean;
  url?: string;
  original_url?: string; // для cover image
  error?: string;
  file_path?: string;
  file_size?: number;
}
// src/pages/admin/constants.ts
// ОБНОВЛЕННЫЕ КОНСТАНТЫ - ИСПОЛЬЗУЮТ НОВЫЕ УНИФИЦИРОВАННЫЕ ЗНАЧЕНИЯ

export interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  photos: { url: string; isMain?: boolean }[];
  active: boolean;
}

export interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}

export interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  comment?: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  status: boolean;
  created_at: string;
  payment_link_clicked?: boolean;
}

export interface EventRegistrations {
  max_regs: number | null;
  current: number;
  current_adults: number;
  current_children: number;
  reg_list: Registration[];
}

// =============================================================================
// ОСНОВНЫЕ ТИПЫ (унифицированные)
// =============================================================================

export type EventType = 'lecture' | 'workshop' | 'discussion' | 'conference' | 'seminar' | 'festival' | 'concert' | 'standup' | 'excursion' | 'quiz' | 'swap' | 'other';
export type PaymentType = 'free' | 'paid' | 'donation';
export type EventStatus = 'draft' | 'active' | 'past' | 'cancelled';
export type AgeCategory = '0+' | '6+' | '12+' | '16+' | '18+';
export type Currency = 'RSD' | 'EUR' | 'USD' | 'RUB';
export type Language = 'sr' | 'en' | 'ru';

export type Event = {
  id: string;
  title: string;
  short_description: string;
  description: string;
  event_type: EventType;  // Обновлено на новый тип
  bg_image: string | null;
  original_bg_image: string | null;
  start_at: string;  // Новое поле вместо date/start_time
  end_at: string;    // Новое поле вместо date/end_time
  location: string;
  age_category: AgeCategory;
  price: number | null;
  currency: Currency;
  status: EventStatus;
  payment_type: PaymentType;  // Обновлено на новый тип
  languages: Language[];      // Обновлено на новый тип
  speakers: string[];
  hide_speakers_gallery?: boolean;
  couple_discount?: string;
  child_half_price?: boolean;
  payment_link?: string;
  payment_widget_id?: string;
  widget_chooser?: boolean;
  video_url?: string;
  photo_gallery?: string[];
  festival_program?: FestivalProgramItem[];
  registrations?: EventRegistrations;
  // Legacy fields - для обратной совместимости
  date?: string;
  start_time?: string;
  end_time?: string;
  max_registrations?: number | null;
  current_registration_count?: number;
  registrations_list?: Registration[];
};

// =============================================================================
// МАССИВЫ ЗНАЧЕНИЙ ДЛЯ ВЫПАДАЮЩИХ СПИСКОВ
// =============================================================================

export const eventTypes: EventType[] = [
  'lecture',
  'workshop',
  'discussion',
  'conference', 
  'seminar',
  'festival',
  'concert',
  'standup',
  'excursion',
  'quiz',
  'swap',
  'other'
];

export const paymentTypes: PaymentType[] = [
  'free',
  'paid', 
  'donation'
];

export const languages: Language[] = [
  'sr',  // Serbian
  'en',  // English
  'ru'   // Russian
];

export const ageCategories: AgeCategory[] = [
  '0+',
  '6+',
  '12+', 
  '16+',
  '18+'
];

export const currencies: Currency[] = [
  'RSD',
  'EUR',
  'USD',
  'RUB'
];

export const statuses: EventStatus[] = [
  'draft',
  'active',
  'past',
  'cancelled'
];

// =============================================================================
// ЧЕЛОВЕКОЧИТАЕМЫЕ ЛЕЙБЛЫ
// =============================================================================

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'lecture': 'Лекция',
  'workshop': 'Мастер-класс',
  'discussion': 'Дискуссия',
  'conference': 'Конференция',
  'seminar': 'Семинар',
  'festival': 'Фестиваль',
  'concert': 'Концерт',
  'standup': 'Стенд-ап',
  'excursion': 'Экскурсия',
  'quiz': 'Квиз',
  'swap': 'Своп',
  'other': 'Другое'
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  'free': 'Бесплатно',
  'paid': 'Платное',
  'donation': 'Донейшн'
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  'sr': 'Српски',
  'en': 'English', 
  'ru': 'Русский'
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  'draft': 'Черновик',
  'active': 'Активное',
  'past': 'Завершено',
  'cancelled': 'Отменено'
};

// =============================================================================
// МАПИНГ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// =============================================================================

// Мапинг старых значений в новые (для миграции данных)
export const LEGACY_MAPPING = {
  eventType: {
    'Lecture': 'lecture',
    'Workshop': 'workshop',
    'Movie Discussion': 'discussion',
    'Conversation Club': 'discussion',
    'Festival': 'festival',
    'Stand-up': 'standup',
    'Concert': 'concert',
    'Excursion': 'excursion',
    'Discussion': 'discussion',
    'Swap': 'swap',
    'Quiz': 'quiz'
  } as Record<string, EventType>,
  
  paymentType: {
    'cost': 'paid',
    'free': 'free',
    'donation': 'donation'
  } as Record<string, PaymentType>,
  
  language: {
    'Русский': 'ru',
    'Английский': 'en',
    'Сербский': 'sr'
  } as Record<string, Language>
};

// Обратный мапинг (новые значения -> старые, для отображения в UI где нужно)
export const LEGACY_REVERSE_MAPPING = {
  eventType: {
    'lecture': 'Lecture',
    'workshop': 'Workshop', 
    'discussion': 'Discussion',
    'conference': 'Conference',
    'seminar': 'Seminar',
    'festival': 'Festival',
    'concert': 'Concert',
    'standup': 'Stand-up',
    'excursion': 'Excursion',
    'quiz': 'Quiz',
    'swap': 'Swap',
    'other': 'Other'
  } as Record<EventType, string>,
  
  paymentType: {
    'paid': 'cost',
    'free': 'free', 
    'donation': 'donation'
  } as Record<PaymentType, string>,
  
  language: {
    'ru': 'Русский',
    'en': 'Английский',
    'sr': 'Сербский'
  } as Record<Language, string>
};

// =============================================================================
// УТИЛИТЫ ДЛЯ МИГРАЦИИ
// =============================================================================

export const mapLegacyEventType = (legacyType: string): EventType => {
  return LEGACY_MAPPING.eventType[legacyType] || 'other';
};

export const mapLegacyPaymentType = (legacyType: string): PaymentType => {
  return LEGACY_MAPPING.paymentType[legacyType] || 'free';
};

export const mapLegacyLanguage = (legacyLang: string): Language => {
  return LEGACY_MAPPING.language[legacyLang] || 'sr';
};

// =============================================================================
// ЛИМИТЫ ВАЛИДАЦИИ
// =============================================================================

export const TITLE_MAX_LENGTH = 70;
export const SHORT_DESC_MAX_LENGTH = 150;
export const DESC_MAX_LENGTH = 800;

// =============================================================================
// ФУНКЦИИ ВАЛИДАЦИИ
// =============================================================================

export const isValidEventType = (value: string): value is EventType => {
  return eventTypes.includes(value as EventType);
};

export const isValidPaymentType = (value: string): value is PaymentType => {
  return paymentTypes.includes(value as PaymentType);
};

export const isValidEventStatus = (value: string): value is EventStatus => {
  return statuses.includes(value as EventStatus);
};
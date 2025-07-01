// src/pages/admin/constants.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

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

export type Event = {
  id: string;
  title: string;
  short_description: string;
  description: string;
  event_type: string;
  bg_image: string | null;
  original_bg_image: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  age_category: string;
  price: number | null;
  currency: string;
  status: string;
  payment_type: string;
  languages: string[];
  speakers: string[];
  hide_speakers_gallery?: boolean;
  couple_discount?: string;
  child_half_price?: boolean;
  payment_link?: string;
  payment_widget_id?: string;
  widget_chooser?: boolean;
  video_url?: string;
  photo_gallery?: string;
  festival_program?: FestivalProgramItem[];
  registrations?: EventRegistrations;
  // Legacy fields - will be removed after migration
  max_registrations?: number | null;
  current_registration_count?: number;
  registrations_list?: Registration[];
};

// ❌ СТАРЫЕ КОНСТАНТЫ (НЕПРАВИЛЬНЫЕ):
// export const eventTypes = [
//   'Lecture',           // ← Заглавная буква!
//   'Workshop',
//   'Movie Discussion',
//   'Festival',
//   'Stand-up',
//   'Concert',
//   'Excursion',
//   'Discussion',
//   'Swap',
//   'Quiz'
// ];

// ✅ ПОЛНЫЙ СПИСОК ТИПОВ СОБЫТИЙ (строчными буквами для БД):
export const eventTypes = [
  'lecture',
  'workshop', 
  'conference',
  'seminar',
  'festival',
  'discussion',
  'concert',
  'standup',
  'excursion',
  'quiz',
  'swap',
  'movie_discussion',
  'conversation_club',
  'other'  // всегда последний
];

// Маппинг для отображения (человекочитаемые названия)
export const eventTypeLabels: Record<string, string> = {
  'lecture': 'Лекция',
  'workshop': 'Мастер-класс',
  'conference': 'Конференция', 
  'seminar': 'Семинар',
  'festival': 'Фестиваль',
  'discussion': 'Дискуссия',
  'concert': 'Концерт',
  'standup': 'Стендап',
  'excursion': 'Экскурсия',
  'quiz': 'Викторина',
  'swap': 'Обмен',
  'movie_discussion': 'Обсуждение фильма',
  'conversation_club': 'Разговорный клуб',
  'other': 'Другое'
};

export const paymentTypes = ['cost', 'free', 'donation'];
export const languages = ['Русский', 'Английский', 'Сербский'];
export const ageCategories = ['0+', '12+', '18+'];
export const currencies = ['RSD', 'EUR', 'RUB'];
export const statuses = ['draft', 'active', 'past'];

export const TITLE_MAX_LENGTH = 70;
export const SHORT_DESC_MAX_LENGTH = 150;
export const DESC_MAX_LENGTH = 800;
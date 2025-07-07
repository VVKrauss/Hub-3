// src/pages/admin/constants.ts - ОБНОВЛЕННАЯ ВЕРСИЯ С РУССКИМИ ЛЕЙБЛАМИ
// Дополнения к существующим константам для правильного отображения

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  photos: { url: string; isMain?: boolean }[];
  active: boolean;
}

interface FestivalProgramItem {
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

// ОСНОВНЫЕ ТИПЫ (унифицированные)
type EventType = 'lecture' | 'workshop' | 'discussion' | 'conference' | 'seminar' | 'festival' | 'concert' | 'standup' | 'excursion' | 'quiz' | 'swap' | 'other';
type PaymentType = 'free' | 'paid' | 'donation';
type EventStatus = 'draft' | 'active' | 'past' | 'cancelled';
type AgeCategory = '0+' | '6+' | '12+' | '16+' | '18+';
type Currency = 'RSD' | 'EUR' | 'USD' | 'RUB';
type Language = 'sr' | 'en' | 'ru';

export type Event = {
  id: string;
  title: string;
  short_description: string;
  description: string;
  event_type: EventType;
  bg_image: string | null;
  original_bg_image: string | null;
  start_at: string;
  end_at: string;
  location: string;
  age_category: AgeCategory;
  price: number | null;
  currency: Currency;
  status: EventStatus;
  payment_type: PaymentType;
  languages: Language[];
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

// МАССИВЫ ЗНАЧЕНИЙ ДЛЯ ВЫПАДАЮЩИХ СПИСКОВ
const eventTypes: EventType[] = [
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

const paymentTypes: PaymentType[] = [
  'free',
  'paid', 
  'donation'
];

const languages: Language[] = [
  'sr',  // Serbian
  'en',  // English
  'ru'   // Russian
];

const ageCategories: AgeCategory[] = [
  '0+',
  '6+',
  '12+', 
  '16+',
  '18+'
];

const currencies: Currency[] = [
  'RSD',
  'EUR',
  'USD',
  'RUB'
];

const statuses: EventStatus[] = [
  'draft',
  'active',
  'past',
  'cancelled'
];

// ЧЕЛОВЕКОЧИТАЕМЫЕ ЛЕЙБЛЫ
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

const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  '0+': '0+',
  '6+': '6+',
  '12+': '12+',
  '16+': '16+',
  '18+': '18+'
};

const CURRENCY_LABELS: Record<Currency, string> = {
  'RSD': 'RSD (Динар)',
  'EUR': 'EUR (Евро)',
  'USD': 'USD (Доллар)',
  'RUB': 'RUB (Рубль)'
};

const STATUS_LABELS: Record<EventStatus, string> = {
  'draft': 'Черновик',
  'active': 'Активное',
  'past': 'Прошедшее',
  'cancelled': 'Отменено'
};

// РАСШИРЕННЫЕ ЛЕЙБЛЫ ДЛЯ СОВМЕСТИМОСТИ С LEGACY ДАННЫМИ
const EXTENDED_EVENT_TYPE_LABELS: Record<string, string> = {
  // Основные значения
  ...EVENT_TYPE_LABELS,
  
  // Дополнительные типы
  'meetup': 'Митап',
  'webinar': 'Вебинар',
  'training': 'Тренинг',
  'hackathon': 'Хакатон',
  'networking': 'Нетворкинг',
  'masterclass': 'Мастер-класс',
  'roundtable': 'Круглый стол',
  'presentation': 'Презентация',
  
  // Legacy значения с заглавной буквы
  'Lecture': 'Лекция',
  'Workshop': 'Мастер-класс',
  'Discussion': 'Дискуссия',
  'Conference': 'Конференция',
  'Seminar': 'Семинар',
  'Festival': 'Фестиваль',
  'Concert': 'Концерт',
  'Standup': 'Стенд-ап',
  'Excursion': 'Экскурсия',
  'Quiz': 'Квиз',
  'Swap': 'Своп',
  'Other': 'Другое',
  'Meetup': 'Митап',
  'Webinar': 'Вебинар',
  'Training': 'Тренинг',
  'Hackathon': 'Хакатон',
  'Networking': 'Нетворкинг',
  'Masterclass': 'Мастер-класс',
  'Roundtable': 'Круглый стол',
  'Presentation': 'Презентация'
};

const EXTENDED_LANGUAGE_LABELS: Record<string, string> = {
  // Основные значения
  ...LANGUAGE_LABELS,
  
  // Дополнительные языки
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español',
  'it': 'Italiano',
  'hr': 'Hrvatski',
  'bs': 'Bosanski',
  'me': 'Crnogorski',
  'mk': 'Македонски',
  'sl': 'Slovenščina',
  'hu': 'Magyar',
  'ro': 'Română',
  'bg': 'Български',
  
  // Legacy значения на русском
  'Русский': 'Русский',
  'Английский': 'English',
  'Сербский': 'Српски',
  'Немецкий': 'Deutsch',
  'Французский': 'Français',
  'Испанский': 'Español',
  'Итальянский': 'Italiano',
  'Хорватский': 'Hrvatski',
  'Боснийский': 'Bosanski',
  'Черногорский': 'Crnogorski',
  
  // Legacy значения на английском
  'Serbian': 'Српски',
  'English': 'English',
  'Russian': 'Русский',
  'German': 'Deutsch',
  'French': 'Français',
  'Spanish': 'Español',
  'Italian': 'Italiano',
  'Croatian': 'Hrvatski',
  'Bosnian': 'Bosanski',
  'Montenegrin': 'Crnogorski'
};

const EXTENDED_PAYMENT_TYPE_LABELS: Record<string, string> = {
  // Основные значения
  ...PAYMENT_TYPE_LABELS,
  
  // Legacy значения
  'cost': 'Платное',
  'Бесплатно': 'Бесплатно',
  'Платно': 'Платное',
  'Платное': 'Платное',
  'Донейшн': 'Донейшн',
  'Пожертвование': 'Донейшн',
  
  // Английские значения
  'Free': 'Бесплатно',
  'Paid': 'Платное',
  'Donation': 'Донейшн'
};

// ФУНКЦИИ-УТИЛИТЫ ДЛЯ ИСПОЛЬЗОВАНИЯ В КОМПОНЕНТАХ
const getEventTypeDisplayLabel = (eventType: string): string => {
  return EXTENDED_EVENT_TYPE_LABELS[eventType] || EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS] || eventType;
};

const getLanguageDisplayLabel = (language: string): string => {
  return EXTENDED_LANGUAGE_LABELS[language] || LANGUAGE_LABELS[language as keyof typeof LANGUAGE_LABELS] || language;
};

const getPaymentTypeDisplayLabel = (paymentType: string): string => {
  return EXTENDED_PAYMENT_TYPE_LABELS[paymentType] || PAYMENT_TYPE_LABELS[paymentType as keyof typeof PAYMENT_TYPE_LABELS] || paymentType;
};

// ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ЦЕНЫ С ПРАВИЛЬНЫМ ФОРМАТИРОВАНИЕМ
const formatEventPrice = (event: any): string => {
  // Проверяем payment_type
  if (event.payment_type === 'free') {
    return 'Бесплатно';
  }
  
  if (event.payment_type === 'donation') {
    return 'Донейшн';
  }
  
  if (event.payment_type === 'paid') {
    // Приоритет: новое поле base_price
    if (event.base_price && event.base_price > 0) {
      const price = Number(event.base_price);
      const currency = event.currency || 'RSD';
      
      // Форматируем число с разделителями тысяч
      const formattedPrice = price.toLocaleString('ru-RU');
      return `${formattedPrice} ${currency}`;
    }
    
    // Fallback: legacy поле price
    if (event.price && event.price > 0) {
      const price = Number(event.price);
      const currency = event.currency || 'RSD';
      const formattedPrice = price.toLocaleString('ru-RU');
      return `${formattedPrice} ${currency}`;
    }
    
    return 'Цена уточняется';
  }
  
  // Legacy логика для старых событий без payment_type
  if (event.price === 0 || event.price === null || event.price === undefined) {
    return 'Бесплатно';
  }
  
  if (event.price && event.price > 0) {
    const price = Number(event.price);
    const currency = event.currency || 'RSD';
    const formattedPrice = price.toLocaleString('ru-RU');
    return `${formattedPrice} ${currency}`;
  }
  
  return 'Бесплатно';
};

// ГОТОВЫЕ МАССИВЫ ДЛЯ SELECT-ОВ В АДМИНКЕ
const eventTypeOptions = eventTypes.map(type => ({
  value: type,
  label: EVENT_TYPE_LABELS[type]
}));

const paymentTypeOptions = paymentTypes.map(type => ({
  value: type,
  label: PAYMENT_TYPE_LABELS[type]
}));

const languageOptions = languages.map(lang => ({
  value: lang,
  label: LANGUAGE_LABELS[lang]
}));

const currencyOptions = currencies.map(curr => ({
  value: curr,
  label: CURRENCY_LABELS[curr]
}));

const ageCategoryOptions = ageCategories.map(cat => ({
  value: cat,
  label: AGE_CATEGORY_LABELS[cat]
}));

const statusOptions = statuses.map(status => ({
  value: status,
  label: STATUS_LABELS[status]
}));
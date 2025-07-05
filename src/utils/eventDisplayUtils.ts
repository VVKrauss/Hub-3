// src/utils/eventDisplayUtils.ts - ПОЛНАЯ ВЕРСИЯ
// Централизованные утилиты для правильного отображения данных событий

import { getSupabaseImageUrl } from './imageUtils';

// ЛЕЙБЛЫ ДЛЯ ТИПОВ СОБЫТИЙ НА РУССКОМ
export const EVENT_TYPE_LABELS: Record<string, string> = {
  // Новые значения
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
  'meetup': 'Митап',
  'webinar': 'Вебинар',
  'training': 'Тренинг',
  'hackathon': 'Хакатон',
  'networking': 'Нетворкинг',
  'other': 'Другое',
  
  // Legacy значения (с заглавной буквы)
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
  'Meetup': 'Митап',
  'Webinar': 'Вебинар',
  'Training': 'Тренинг',
  'Other': 'Другое'
};

// ЛЕЙБЛЫ ДЛЯ ЯЗЫКОВ
export const LANGUAGE_LABELS: Record<string, string> = {
  'sr': 'Српски',
  'en': 'English', 
  'ru': 'Русский',
  
  // Legacy значения
  'Русский': 'Русский',
  'Английский': 'English',
  'Сербский': 'Српски',
  'Serbian': 'Српски',
  'English': 'English',
  'Russian': 'Русский'
};

// ЛЕЙБЛЫ ДЛЯ ТИПОВ ОПЛАТЫ
export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  'free': 'Бесплатно',
  'paid': 'Платное',
  'donation': 'Донейшн',
  
  // Legacy значения
  'cost': 'Платное',
  'Бесплатно': 'Бесплатно',
  'Платно': 'Платное'
};

/**
 * Получение корректной цены события
 * ВСЕГДА возвращает строку с ценой
 */
export const getEventPrice = (event: any): string => {
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
      return `${event.base_price} ${event.currency || 'RSD'}`;
    }
    // Fallback: legacy поле price
    if (event.price && event.price > 0) {
      return `${event.price} ${event.currency || 'RSD'}`;
    }
    return 'Цена уточняется';
  }
  
  // Legacy логика для старых событий без payment_type
  if (event.price === 0 || event.price === null || event.price === undefined) {
    return 'Бесплатно';
  }
  
  if (event.price && event.price > 0) {
    return `${event.price} ${event.currency || 'RSD'}`;
  }
  
  return 'Бесплатно';
};

/**
 * Получение типа события на русском языке
 */
export const getEventTypeLabel = (eventType: string): string => {
  return EVENT_TYPE_LABELS[eventType] || eventType;
};

/**
 * Получение языка события
 */
export const getEventLanguage = (event: any): string => {
  // Приоритет: новое поле language_code
  if (event.language_code) {
    return LANGUAGE_LABELS[event.language_code] || event.language_code;
  }
  
  // Fallback: legacy поле languages (массив)
  if (event.languages && Array.isArray(event.languages) && event.languages.length > 0) {
    const firstLang = event.languages[0];
    return LANGUAGE_LABELS[firstLang] || firstLang;
  }
  
  return 'Не указан';
};

/**
 * Получение изображения события
 */
export const getEventImage = (event: any): string => {
  // Приоритет: новое поле cover_image_url
  if (event.cover_image_url) {
    return getSupabaseImageUrl(event.cover_image_url);
  }
  
  // Fallback: legacy поле bg_image
  if (event.bg_image) {
    return getSupabaseImageUrl(event.bg_image);
  }
  
  return 'https://via.placeholder.com/400x200?text=No+Image';
};

/**
 * Получение места проведения события
 */
export const getEventVenue = (event: any): string | null => {
  // Приоритет: новое поле venue_name
  if (event.venue_name) {
    return event.venue_name;
  }
  
  // Fallback: legacy поле location
  if (event.location) {
    return event.location;
  }
  
  return null;
};

/**
 * Проверка, является ли событие прошедшим
 */
export const isEventPast = (event: any): boolean => {
  const endDate = event.end_at || event.start_at;
  if (!endDate) return false;
  
  return new Date(endDate) < new Date();
};

/**
 * Получение количества участников
 */
export const getEventParticipantsCount = (event: any): number | null => {
  // Новая система
  if (event.registrations_count !== undefined) {
    return event.registrations_count;
  }
  
  // Legacy система
  if (event.current_registration_count !== undefined) {
    return event.current_registration_count;
  }
  
  if (event.registrations && event.registrations.current !== undefined) {
    return event.registrations.current;
  }
  
  return null;
};

/**
 * Получение максимального количества участников
 */
export const getEventMaxParticipants = (event: any): number | null => {
  // Новая система
  if (event.max_attendees !== undefined) {
    return event.max_attendees;
  }
  
  // Legacy система
  if (event.max_registrations !== undefined) {
    return event.max_registrations;
  }
  
  if (event.registrations && event.registrations.max_regs !== undefined) {
    return event.registrations.max_regs;
  }
  
  return null;
};

/**
 * Получение доступных мест
 */
export const getEventAvailableSpots = (event: any): number | null => {
  const current = getEventParticipantsCount(event);
  const max = getEventMaxParticipants(event);
  
  if (current !== null && max !== null) {
    return Math.max(0, max - current);
  }
  
  return null;
};

/**
 * Форматирование цены с учетом валюты
 */
export const formatEventPrice = (price: number, currency: string = 'RSD'): string => {
  const formattedPrice = price.toLocaleString('ru-RU');
  return `${formattedPrice} ${currency}`;
};

/**
 * Получение статуса события
 */
export const getEventStatus = (event: any): 'upcoming' | 'ongoing' | 'past' | 'cancelled' => {
  if (event.status === 'cancelled') return 'cancelled';
  
  const now = new Date();
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at || event.start_at);
  
  if (now < startDate) return 'upcoming';
  if (now >= startDate && now <= endDate) return 'ongoing';
  return 'past';
};

/**
 * Получение лейбла статуса события
 */
export const getEventStatusLabel = (event: any): string => {
  const status = getEventStatus(event);
  
  switch (status) {
    case 'upcoming': return 'Предстоящее';
    case 'ongoing': return 'Идет сейчас';
    case 'past': return 'Завершено';
    case 'cancelled': return 'Отменено';
    default: return 'Неизвестно';
  }
};

/**
 * Проверка, можно ли регистрироваться на событие
 */
export const canRegisterForEvent = (event: any): boolean => {
  const status = getEventStatus(event);
  if (status !== 'upcoming') return false;
  
  // Проверяем период регистрации
  if (event.registration_start_at && new Date(event.registration_start_at) > new Date()) {
    return false;
  }
  
  if (event.registration_end_at && new Date(event.registration_end_at) < new Date()) {
    return false;
  }
  
  // Проверяем доступные места
  const availableSpots = getEventAvailableSpots(event);
  if (availableSpots !== null && availableSpots <= 0) {
    return false;
  }
  
  return event.registration_enabled !== false;
};
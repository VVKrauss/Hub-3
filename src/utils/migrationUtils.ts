// src/utils/migrationUtils.ts
// УТИЛИТЫ ДЛЯ ПОСТЕПЕННОЙ МИГРАЦИИ К НОВЫМ ЗНАЧЕНИЯМ

import {
  EventType,
  PaymentType,
  Language,
  EventStatus,
  mapLegacyEventType,
  mapLegacyPaymentType,
  mapLegacyLanguage,
  EVENT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  LANGUAGE_LABELS,
  LEGACY_REVERSE_MAPPING
} from '../pages/admin/constants';

// =============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ ТИПИЗАЦИИ
// =============================================================================

interface LegacyEvent {
  id: string;
  title: string;
  event_type: string;    // Может быть 'Lecture' или 'lecture'
  payment_type: string;  // Может быть 'cost' или 'paid'
  languages: string[];   // Может быть ['Русский'] или ['ru']
  status: string;
  date?: string;         // Legacy поле
  start_time?: string;   // Legacy поле
  end_time?: string;     // Legacy поле
  start_at?: string;     // Новое поле
  end_at?: string;       // Новое поле
  [key: string]: any;
}

interface ModernEvent extends Omit<LegacyEvent, 'event_type' | 'payment_type' | 'languages'> {
  event_type: EventType;
  payment_type: PaymentType;
  languages: Language[];
  start_at: string;
  end_at: string;
}

// =============================================================================
// ФУНКЦИИ МИГРАЦИИ ДАННЫХ
// =============================================================================

/**
 * Мигрирует событие из legacy формата в новый
 */
export const migrateEventToModern = (legacyEvent: LegacyEvent): ModernEvent => {
  return {
    ...legacyEvent,
    event_type: mapLegacyEventType(legacyEvent.event_type),
    payment_type: mapLegacyPaymentType(legacyEvent.payment_type),
    languages: Array.isArray(legacyEvent.languages) 
      ? legacyEvent.languages.map(lang => mapLegacyLanguage(lang))
      : ['sr'],
    // Миграция полей времени
    start_at: legacyEvent.start_at || 
              (legacyEvent.date && legacyEvent.start_time 
                ? combineDateAndTime(legacyEvent.date, legacyEvent.start_time)
                : ''),
    end_at: legacyEvent.end_at || 
            (legacyEvent.date && legacyEvent.end_time 
              ? combineDateAndTime(legacyEvent.date, legacyEvent.end_time)
              : ''),
    // Удаляем legacy поля
    date: undefined,
    start_time: undefined,
    end_time: undefined,
  };
};

/**
 * Конвертирует современное событие в legacy формат (для обратной совместимости)
 */
export const migrateEventToLegacy = (modernEvent: ModernEvent): LegacyEvent => {
  const startDate = modernEvent.start_at ? new Date(modernEvent.start_at) : null;
  const endDate = modernEvent.end_at ? new Date(modernEvent.end_at) : null;
  
  return {
    ...modernEvent,
    event_type: LEGACY_REVERSE_MAPPING.eventType[modernEvent.event_type] || 'Other',
    payment_type: LEGACY_REVERSE_MAPPING.paymentType[modernEvent.payment_type] || 'free',
    languages: modernEvent.languages.map(lang => 
      LEGACY_REVERSE_MAPPING.language[lang] || lang
    ),
    // Добавляем legacy поля для совместимости
    date: startDate ? startDate.toISOString().split('T')[0] : '',
    start_time: startDate ? startDate.toTimeString().slice(0, 5) : '',
    end_time: endDate ? endDate.toTimeString().slice(0, 5) : '',
  };
};

/**
 * Мигрирует массив событий
 */
export const migrateEventsToModern = (legacyEvents: LegacyEvent[]): ModernEvent[] => {
  return legacyEvents.map(migrateEventToModern);
};

// =============================================================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ/ВРЕМЕНЕМ
// =============================================================================

/**
 * Объединяет дату и время в ISO строку
 */
const combineDateAndTime = (date: string, time: string): string => {
  try {
    // Формат: "2024-01-15" + "18:30" -> "2024-01-15T18:30:00.000Z"
    const datetime = new Date(`${date}T${time}:00`);
    return datetime.toISOString();
  } catch (error) {
    console.error('Error combining date and time:', { date, time, error });
    return '';
  }
};

/**
 * Извлекает дату из ISO строки
 */
export const extractDateFromISO = (isoString: string): string => {
  try {
    return new Date(isoString).toISOString().split('T')[0];
  } catch (error) {
    console.error('Error extracting date from ISO:', { isoString, error });
    return '';
  }
};

/**
 * Извлекает время из ISO строки
 */
export const extractTimeFromISO = (isoString: string): string => {
  try {
    return new Date(isoString).toTimeString().slice(0, 5);
  } catch (error) {
    console.error('Error extracting time from ISO:', { isoString, error });
    return '';
  }
};

// =============================================================================
// ФУНКЦИИ ДЛЯ ОТОБРАЖЕНИЯ
// =============================================================================

/**
 * Безопасно получает лейбл типа события
 */
export const getEventTypeLabel = (eventType: string): string => {
  const normalizedType = mapLegacyEventType(eventType);
  return EVENT_TYPE_LABELS[normalizedType] || 'Другое';
};

/**
 * Безопасно получает лейбл типа оплаты
 */
export const getPaymentTypeLabel = (paymentType: string): string => {
  const normalizedType = mapLegacyPaymentType(paymentType);
  return PAYMENT_TYPE_LABELS[normalizedType] || 'Не указано';
};

/**
 * Безопасно получает лейбл языка
 */
export const getLanguageLabel = (language: string): string => {
  const normalizedLang = mapLegacyLanguage(language);
  return LANGUAGE_LABELS[normalizedLang] || language;
};

/**
 * Форматирует массив языков для отображения
 */
export const formatLanguages = (languages: string[]): string => {
  if (!Array.isArray(languages) || languages.length === 0) {
    return 'Не указано';
  }
  
  return languages
    .map(lang => getLanguageLabel(lang))
    .join(', ');
};

/**
 * Форматирует цену для отображения
 */
export const formatPrice = (
  paymentType: string, 
  price?: number | null, 
  currency?: string
): string => {
  const normalizedType = mapLegacyPaymentType(paymentType);
  
  switch (normalizedType) {
    case 'free':
      return 'Бесплатно';
    case 'donation':
      return 'Донейшн';
    case 'paid':
      if (price && currency) {
        return `${price} ${currency}`;
      }
      return 'Цена уточняется';
    default:
      return 'Не указано';
  }
};

// =============================================================================
// ФУНКЦИИ ВАЛИДАЦИИ
// =============================================================================

/**
 * Проверяет, является ли значение валидным типом события
 */
export const isValidEventType = (value: any): value is EventType => {
  return typeof value === 'string' && 
         ['lecture', 'workshop', 'discussion', 'conference', 'seminar', 
          'festival', 'concert', 'standup', 'excursion', 'quiz', 'swap', 'other']
         .includes(value);
};

/**
 * Проверяет, является ли значение валидным типом оплаты
 */
export const isValidPaymentType = (value: any): value is PaymentType => {
  return typeof value === 'string' && 
         ['free', 'paid', 'donation'].includes(value);
};

/**
 * Проверяет, является ли значение валидным языком
 */
export const isValidLanguage = (value: any): value is Language => {
  return typeof value === 'string' && 
         ['sr', 'en', 'ru'].includes(value);
};

/**
 * Проверяет, является ли значение валидным статусом
 */
export const isValidEventStatus = (value: any): value is EventStatus => {
  return typeof value === 'string' && 
         ['draft', 'active', 'past', 'cancelled'].includes(value);
};

// =============================================================================
// HOOK ДЛЯ АВТОМАТИЧЕСКОЙ МИГРАЦИИ
// =============================================================================

/**
 * Hook для автоматической миграции событий при загрузке
 */
export const useMigratedEvents = (rawEvents: any[]) => {
  return rawEvents.map(event => {
    if (!event) return event;
    
    // Проверяем, нужна ли миграция
    const needsMigration = 
      !isValidEventType(event.event_type) ||
      !isValidPaymentType(event.payment_type) ||
      (event.languages && !event.languages.every(isValidLanguage)) ||
      (!event.start_at && (event.date || event.start_time));
    
    return needsMigration ? migrateEventToModern(event) : event;
  });
};

// =============================================================================
// ФУНКЦИИ ДЛЯ BULK ОПЕРАЦИЙ
// =============================================================================

/**
 * Мигрирует все события в базе данных (для использования в migration script)
 */
export const createMigrationScript = () => {
  return `
-- Скрипт для миграции событий в БД
UPDATE events 
SET 
  event_type = CASE 
    WHEN event_type = 'Lecture' THEN 'lecture'
    WHEN event_type = 'Workshop' THEN 'workshop'
    WHEN event_type = 'Movie Discussion' THEN 'discussion'
    WHEN event_type = 'Conversation Club' THEN 'discussion'
    WHEN event_type = 'Festival' THEN 'festival'
    WHEN event_type = 'Stand-up' THEN 'standup'
    WHEN event_type = 'Concert' THEN 'concert'
    WHEN event_type = 'Excursion' THEN 'excursion'
    WHEN event_type = 'Discussion' THEN 'discussion'
    WHEN event_type = 'Swap' THEN 'swap'
    WHEN event_type = 'Quiz' THEN 'quiz'
    ELSE 'other'
  END,
  payment_type = CASE 
    WHEN payment_type = 'cost' THEN 'paid'
    ELSE payment_type
  END
WHERE event_type IN ('Lecture', 'Workshop', 'Movie Discussion', 'Conversation Club', 
                     'Festival', 'Stand-up', 'Concert', 'Excursion', 'Discussion', 
                     'Swap', 'Quiz') 
   OR payment_type = 'cost';
  `;
};

// =============================================================================
// ЭКСПОРТ
// =============================================================================

export default {
  migrateEventToModern,
  migrateEventToLegacy,
  migrateEventsToModern,
  getEventTypeLabel,
  getPaymentTypeLabel,
  getLanguageLabel,
  formatLanguages,
  formatPrice,
  isValidEventType,
  isValidPaymentType,
  isValidLanguage,
  isValidEventStatus,
  useMigratedEvents,
  createMigrationScript
};
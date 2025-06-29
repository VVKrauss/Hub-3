// src/api/index.ts
// Централизованный экспорт всех API функций

// Основной Supabase клиент и утилиты
export { default as supabase } from '../lib/supabase';
export { 
  createApiResponse, 
  createPaginatedResponse, 
  handleSupabaseError,
  uploadFile,
  deleteFile,
  getCurrentUser,
  isAuthenticated,
  subscribeToTable
} from '../lib/supabase';

// API для событий
export * from './events';

// API для настроек сайта  
export * from './settings';

// API для спикеров
export * from './speakers';

// API для пользователей
export * from './users';

// API для регистраций
export * from './registrations';

// API для бронирований
export * from './bookings';

// Типы
export type { 
  ApiResponse, 
  PaginatedResponse 
} from '../lib/supabase';

export type {
  // Основные типы БД
  ShEvent,
  ShSpeaker, 
  ShUser,
  ShRegistration,
  ShSpaceBooking,
  ShSiteSettings,
  
  // Расширенные типы
  EventWithDetails,
  SpeakerWithSocials,
  RegistrationWithTickets,
  
  // Фильтры
  EventFilters,
  SpeakerFilters,
  UserFilters,
  RegistrationFilters,
  BookingFilters,
  
  // Enums
  ShEventType,
  ShEventStatus,
  ShAgeCategory,
  ShPaymentType,
  ShUserRole,
  ShUserStatus,
  ShRegistrationStatus,
  ShPaymentStatus,
  ShSpeakerStatus,
  ShBookingType,
  ShBookingStatus
} from '../types/database';

// Константы для API
export const API_CONSTANTS = {
  // Лимиты пагинации
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Лимиты для специальных случаев
  FEATURED_EVENTS_LIMIT: 6,
  FEATURED_SPEAKERS_LIMIT: 6,
  RECENT_REGISTRATIONS_LIMIT: 10,
  
  // Временные зоны
  DEFAULT_TIMEZONE: 'Europe/Belgrade',
  
  // Валюты
  DEFAULT_CURRENCY: 'RSD',
  SUPPORTED_CURRENCIES: ['RSD', 'EUR', 'USD'],
  
  // Роли пользователей
  USER_ROLES: {
    ADMIN: 'admin',
    MODERATOR: 'moderator', 
    MEMBER: 'member',
    GUEST: 'guest'
  } as const,
  
  // Статусы событий
  EVENT_STATUSES: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  } as const,
  
  // Типы событий
  EVENT_TYPES: {
    LECTURE: 'lecture',
    WORKSHOP: 'workshop',
    FESTIVAL: 'festival',
    CONFERENCE: 'conference',
    SEMINAR: 'seminar',
    OTHER: 'other'
  } as const,
  
  // Возрастные категории
  AGE_CATEGORIES: {
    ALL: '0+',
    KIDS: '6+',
    TEENS: '12+',
    YOUNG_ADULTS: '16+', 
    ADULTS: '18+'
  } as const,
  
  // Типы платежей
  PAYMENT_TYPES: {
    FREE: 'free',
    PAID: 'paid',
    DONATION: 'donation'
  } as const,
  
  // Статусы регистраций
  REGISTRATION_STATUSES: {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    WAITLIST: 'waitlist'
  } as const,
  
  // Статусы платежей
  PAYMENT_STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  } as const,
  
  // Типы бронирований
  BOOKING_TYPES: {
    EVENT: 'event',
    RENTAL: 'rental',
    MEETING: 'meeting',
    OTHER: 'other'
  } as const,
  
  // Статусы бронирований
  BOOKING_STATUSES: {
    CONFIRMED: 'confirmed',
    PENDING: 'pending', 
    CANCELLED: 'cancelled'
  } as const
};

// Утилиты для работы с датами
export const dateUtils = {
  // Форматирование даты для API
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },
  
  // Форматирование времени для API
  formatTime: (date: Date): string => {
    return date.toTimeString().split(' ')[0].slice(0, 5);
  },
  
  // Форматирование datetime для API
  formatDateTime: (date: Date): string => {
    return date.toISOString();
  },
  
  // Получение начала дня
  startOfDay: (date: Date): Date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  },
  
  // Получение конца дня
  endOfDay: (date: Date): Date => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  },
  
  // Получение начала месяца
  startOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },
  
  // Получение конца месяца
  endOfMonth: (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  },
  
  // Добавление дней к дате
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  // Проверка, что дата в будущем
  isFuture: (date: Date): boolean => {
    return date > new Date();
  },
  
  // Проверка, что дата в прошлом
  isPast: (date: Date): boolean => {
    return date < new Date();
  }
};

// Утилиты для валидации
export const validators = {
  // Валидация email
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Валидация телефона
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  },
  
  // Валидация URL
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // Валидация slug (для URL)
  isValidSlug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  },
  
  // Генерация slug из строки
  generateSlug: (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // удаляем специальные символы
      .replace(/[\s_-]+/g, '-') // заменяем пробелы и подчеркивания на дефисы
      .replace(/^-+|-+$/g, ''); // удаляем дефисы в начале и конце
  },
  
  // Валидация цены
  isValidPrice: (price: number): boolean => {
    return price >= 0 && Number.isFinite(price);
  },
  
  // Валидация количества билетов
  isValidTicketCount: (count: number): boolean => {
    return Number.isInteger(count) && count >= 0 && count <= 20;
  }
};

// Утилиты для форматирования
export const formatters = {
  // Форматирование цены
  formatPrice: (amount: number, currency: string = 'RSD'): string => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'RSD' ? 0 : 2
    }).format(amount);
  },
  
  // Форматирование даты
  formatDate: (date: string | Date, locale: string = 'sr-RS'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale);
  },
  
  // Форматирование времени
  formatTime: (date: string | Date, locale: string = 'sr-RS'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },
  
  // Форматирование даты и времени
  formatDateTime: (date: string | Date, locale: string = 'sr-RS'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString(locale);
  },
  
  // Сокращение текста
  truncateText: (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },
  
  // Форматирование номера телефона
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('381')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone;
  }
};

// Утилиты для работы с ошибками
export const errorUtils = {
  // Получение понятного сообщения об ошибке
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error_description) return error.error_description;
    return 'Произошла неизвестная ошибка';
  },
  
  // Проверка типа ошибки
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || error?.message?.includes('network');
  },
  
  isAuthError: (error: any): boolean => {
    return error?.code === 'PGRST301' || error?.message?.includes('JWT');
  },
  
  isValidationError: (error: any): boolean => {
    return error?.code === '23514' || error?.message?.includes('check constraint');
  },
  
  isDuplicateError: (error: any): boolean => {
    return error?.code === '23505' || error?.message?.includes('duplicate key');
  }
};

// Экспорт всех утилит как единый объект
export const apiUtils = {
  ...dateUtils,
  ...validators,
  ...formatters,
  ...errorUtils
};
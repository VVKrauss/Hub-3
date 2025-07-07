// src/utils/eventUtils.ts - Утилитарные функции для работы с событиями

import { Event, STATUS_MAPPING, ShEventStatus, EventStatus } from '../pages/admin/constants';

/**
 * Преобразует событие из новой схемы sh_events в формат, ожидаемый интерфейсом
 */
export const transformShEventToEvent = (shEvent: any): Event => {
  return {
    ...shEvent,
    // Маппинг полей из новой схемы в старый формат
    location: shEvent.venue_name || shEvent.location,
    address: shEvent.venue_address || shEvent.address,
    price: shEvent.base_price !== undefined ? shEvent.base_price : shEvent.price,
    bg_image: shEvent.main_image || shEvent.bg_image,
    
    // Маппинг статуса
    status: STATUS_MAPPING[shEvent.status as ShEventStatus] || shEvent.status,
    
    // Информация о регистрации из новой схемы
    registrations: {
      current: 0, // TODO: добавить подсчет из таблицы регистраций
      max_regs: shEvent.max_attendees || null,
      current_adults: 0,
      current_children: 0,
      reg_list: []
    },
    current_registration_count: 0, // TODO: добавить подсчет из таблицы регистраций
    max_registrations: shEvent.max_attendees,
    
    // Спикеры из новой схемы
    speakers: shEvent.sh_event_speakers?.map((es: any) => es.speaker) || [],
    
    // Галерея изображений
    photo_gallery: shEvent.gallery_images || shEvent.photo_gallery || []
  };
};

/**
 * Преобразует событие из старого формата в новый для сохранения в sh_events
 */
export const transformEventToShEvent = (event: Event): any => {
  return {
    ...event,
    // Маппинг полей из старого формата в новую схему
    venue_name: event.location,
    venue_address: event.address,
    base_price: event.price,
    main_image: event.bg_image,
    max_attendees: event.max_registrations,
    gallery_images: event.photo_gallery,
    
    // Маппинг статуса
    status: Object.entries(STATUS_MAPPING).find(([, oldStatus]) => oldStatus === event.status)?.[0] || event.status,
    
    // Удаляем старые поля
    location: undefined,
    address: undefined,
    price: undefined,
    bg_image: undefined,
    max_registrations: undefined,
    photo_gallery: undefined
  };
};

/**
 * Определяет, какая таблица используется для события (по наличию специфичных полей)
 */
export const detectEventTableSource = (event: any): 'sh_events' | 'events' => {
  // Если есть поля специфичные для новой схемы
  if (event.venue_name !== undefined || event.base_price !== undefined || event.max_attendees !== undefined) {
    return 'sh_events';
  }
  
  // Если есть поля специфичные для старой схемы
  if (event.location !== undefined || event.price !== undefined || event.max_registrations !== undefined) {
    return 'events';
  }
  
  // По умолчанию считаем новой схемой
  return 'sh_events';
};

/**
 * Получает корректное значение поля из события независимо от схемы
 */
export const getEventField = (event: Event, field: string): any => {
  switch (field) {
    case 'location':
      return event.venue_name || event.location;
    case 'address':
      return event.venue_address || event.address;
    case 'price':
      return event.base_price !== undefined ? event.base_price : event.price;
    case 'max_registrations':
      return event.max_attendees || event.max_registrations;
    case 'image':
      return event.main_image || event.bg_image;
    case 'gallery':
      return event.gallery_images || event.photo_gallery;
    default:
      return event[field as keyof Event];
  }
};

/**
 * Проверяет, является ли событие из новой схемы sh_events
 */
export const isShEvent = (event: any): boolean => {
  return detectEventTableSource(event) === 'sh_events';
};

/**
 * Создает пустое событие с дефолтными значениями для новой схемы
 */
export const createEmptyShEvent = (): Partial<Event> => {
  return {
    title: '',
    short_description: '',
    description: '',
    event_type: 'lecture',
    venue_name: '',
    venue_address: '',
    base_price: 0,
    currency: 'RSD',
    payment_type: 'free',
    status: 'draft',
    age_category: '0+',
    max_attendees: null,
    is_featured: false,
    is_public: true,
    requires_approval: false,
    tags: [],
    gallery_images: [],
    languages: ['sr'],
    start_at: '',
    end_at: ''
  };
};

/**
 * Валидирует данные события перед сохранением
 */
export const validateEventData = (event: Partial<Event>): string[] => {
  const errors: string[] = [];
  
  if (!event.title?.trim()) {
    errors.push('Название события обязательно');
  }
  
  if (!event.start_at) {
    errors.push('Дата и время начала обязательны');
  }
  
  if (!event.event_type) {
    errors.push('Тип события обязателен');
  }
  
  if (event.payment_type === 'paid' && (event.base_price === undefined || event.base_price < 0)) {
    errors.push('Для платного события укажите корректную цену');
  }
  
  if (event.max_attendees !== null && event.max_attendees !== undefined && event.max_attendees < 1) {
    errors.push('Максимальное количество участников должно быть больше 0');
  }
  
  return errors;
};
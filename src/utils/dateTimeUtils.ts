import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Define Belgrade timezone constant
export const BELGRADE_TIMEZONE = 'Europe/Belgrade';

/**
 * Formats a timestamp string to HH:MM format
 * @param timeString The timestamp string to format
 * @param timezone Optional timezone (defaults to Belgrade)
 * @returns Formatted time string
 */
export const formatTimeFromTimestamp = (timeString?: string, timezone: string = BELGRADE_TIMEZONE): string => {
  if (!timeString) return '--:--';

  // If time is already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }

  // If time is in HH:MM:SS format
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    return timeString.substring(0, 5);
  }

  // Try to parse as ISO date
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return formatInTimeZone(date, timezone, 'HH:mm');
    }
  } catch (e) {
    console.error('Error parsing timestamp:', timeString, e);
  }

  // Try to extract time from string
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    return `${hours}:${minutes}`;
  }

  return timeString;
};

/**
 * Formats a time range from start and end timestamps
 * @param startTime Start time timestamp
 * @param endTime End time timestamp
 * @param timezone Optional timezone (defaults to Belgrade)
 * @returns Formatted time range string
 */
export const formatTimeRange = (startTime?: string, endTime?: string, timezone: string = BELGRADE_TIMEZONE): string => {
  const start = formatTimeFromTimestamp(startTime, timezone);
  const end = formatTimeFromTimestamp(endTime, timezone);
  
  if (!start && !end) return '';
  if (start && !end) return start;
  if (!start && end) return end;
  
  return `${start} - ${end}`;
};

/**
 * Безопасно форматирует дату в русской локали
 * @param dateString ISO date string
 * @param formatStr Format string for date-fns
 * @param timezone Optional timezone (defaults to Belgrade)
 * @returns Formatted date string
 */
export const formatRussianDate = (
  dateString: string | null | undefined, 
  formatStr = 'd MMMM yyyy', 
  timezone: string = BELGRADE_TIMEZONE
): string => {
  // Проверяем на null/undefined
  if (!dateString) {
    console.warn('formatRussianDate: dateString is null or undefined');
    return 'Дата не указана';
  }

  try {
    // Проверяем, что строка не пустая
    const trimmedDateString = String(dateString).trim();
    if (!trimmedDateString) {
      console.warn('formatRussianDate: dateString is empty');
      return 'Дата не указана';
    }

    // Проверяем валидность даты перед парсингом
    const testDate = new Date(trimmedDateString);
    if (isNaN(testDate.getTime())) {
      console.warn('formatRussianDate: Invalid date string:', dateString);
      return 'Неверная дата';
    }

    // Парсим дату
    const date = parseISO(trimmedDateString);
    
    // Дополнительная проверка после parseISO
    if (isNaN(date.getTime())) {
      console.warn('formatRussianDate: parseISO failed for:', dateString);
      return 'Ошибка парсинга даты';
    }

    const zonedDate = utcToZonedTime(date, timezone);
    return format(zonedDate, formatStr, { locale: ru });
  } catch (error) {
    console.error('formatRussianDate: Error formatting date:', dateString, error);
    return 'Ошибка форматирования';
  }
};

/**
 * Checks if an event date is in the past
 * @param eventDate Event date string
 * @param timezone Optional timezone (defaults to Belgrade)
 * @returns Boolean indicating if the event is in the past
 */
export const isPastEvent = (eventDate: string, timezone: string = BELGRADE_TIMEZONE): boolean => {
  try {
    if (!eventDate) return false;
    
    const eventDateTime = parseISO(eventDate);
    if (isNaN(eventDateTime.getTime())) return false;
    
    const zonedEventDate = utcToZonedTime(eventDateTime, timezone);
    const now = new Date();
    const zonedNow = utcToZonedTime(now, timezone);
    return zonedEventDate < zonedNow;
  } catch (e) {
    console.error('Error checking event date:', e);
    return false;
  }
};

/**
 * Converts a local time to Belgrade timezone
 * @param date Date object or ISO string
 * @returns Date object in Belgrade timezone
 */
export const convertToBedradeTimezone = (date: Date | string): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    return utcToZonedTime(dateObj, BELGRADE_TIMEZONE);
  } catch (error) {
    console.error('Error converting to Belgrade timezone:', error);
    return new Date(); // Return current date as fallback
  }
};

/**
 * Converts a Belgrade timezone time to UTC
 * @param date Date object or ISO string
 * @returns Date object in UTC
 */
export const convertFromBelgradeToUTC = (date: Date | string): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    return zonedTimeToUtc(dateObj, BELGRADE_TIMEZONE);
  } catch (error) {
    console.error('Error converting from Belgrade to UTC:', error);
    return new Date(); // Return current date as fallback
  }
};

/**
 * Creates a date object with Belgrade timezone
 * @param year Year
 * @param month Month (0-11)
 * @param day Day
 * @param hours Hours
 * @param minutes Minutes
 * @returns Date object in Belgrade timezone
 */
export const createBelgradeDate = (
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0
): Date => {
  try {
    const date = new Date(year, month, day, hours, minutes);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date parameters provided');
    }
    return utcToZonedTime(date, BELGRADE_TIMEZONE);
  } catch (error) {
    console.error('Error creating Belgrade date:', error);
    return new Date(); // Return current date as fallback
  }
};

/**
 * Parses a time string (HH:MM) and combines it with a date in Belgrade timezone
 * @param timeString Time string in HH:MM format
 * @param dateString Date string in ISO format
 * @returns Combined date and time in Belgrade timezone
 */
export const parseTimeWithBelgradeTimezone = (timeString: string, dateString: string): Date => {
  try {
    if (!timeString || !dateString) {
      throw new Error('Time string and date string are required');
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid time format');
    }

    const date = parseISO(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    
    // Create a new date with the specified hours and minutes
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    // Convert to Belgrade timezone
    return utcToZonedTime(combinedDate, BELGRADE_TIMEZONE);
  } catch (error) {
    console.error('Error parsing time with Belgrade timezone:', error);
    return new Date(); // Return current date as fallback
  }
};

/**
 * Validates if a time string is in valid HH:MM format
 * @param timeString Time string to validate
 * @returns Boolean indicating if the time string is valid
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  if (!timeString) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Formats a date for database storage in ISO format
 * @param date Date object or ISO string
 * @param time Time string in HH:MM format
 * @returns ISO string in UTC for database storage
 */
export const formatDateTimeForDatabase = (date: Date | string, time: string): string => {
  try {
    if (!date || !time) {
      throw new Error('Date and time are required');
    }

    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid time format');
    }
    
    // Set the time on the date object
    const combinedDate = new Date(dateObj);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    // Convert from Belgrade to UTC for storage
    const utcDate = zonedTimeToUtc(combinedDate, BELGRADE_TIMEZONE);
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error formatting date time for database:', error);
    return new Date().toISOString(); // Return current time as fallback
  }
};

/**
 * Проверяет валидность даты
 * @param dateString Date string to validate
 * @returns Boolean indicating if the date is valid
 */
export const isValidDateString = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    const trimmedDate = String(dateString).trim();
    if (!trimmedDate) return false;
    
    const date = new Date(trimmedDate);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Безопасно форматирует временной диапазон с проверками
 * @param startTime Start time timestamp
 * @param endTime End time timestamp
 * @param timezone Optional timezone (defaults to Belgrade)
 * @returns Formatted time range string
 */
export const formatTimeRangeSafe = (
  startTime?: string | null, 
  endTime?: string | null, 
  timezone: string = BELGRADE_TIMEZONE
): string => {
  try {
    const start = startTime ? formatTimeFromTimestamp(startTime, timezone) : null;
    const end = endTime ? formatTimeFromTimestamp(endTime, timezone) : null;
    
    if (!start && !end) return '';
    if (start && !end) return start;
    if (!start && end) return end;
    
    return `${start} - ${end}`;
  } catch (error) {
    console.error('Error formatting time range:', error);
    return '';
  }
};
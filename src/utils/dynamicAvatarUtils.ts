// src/utils/dynamicAvatarUtils.ts

import { supabase } from '../lib/supabase';

export const BASE_AVATAR_URL = 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/avatars/';

type AvatarFile = {
  name: string;
  url: string;
  id?: string;
};

/**
 * Получить список всех доступных аватарок из Supabase Storage
 */
export const getAvailableAvatars = async (): Promise<AvatarFile[]> => {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .list('avatars', {
        limit: 1000, // максимум файлов для загрузки
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error fetching avatars:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Фильтруем только файлы изображений и формируем полные URL
    const avatars = data
      .filter(file => {
        // Проверяем что это файл (не папка) и это изображение
        const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
        return file.name && isImage;
      })
      .map(file => ({
        name: file.name,
        url: BASE_AVATAR_URL + file.name,
        id: file.id
      }));

    return avatars;
  } catch (error) {
    console.error('Failed to fetch avatars:', error);
    return [];
  }
};

/**
 * Получить случайный аватар из доступных
 */
export const getRandomAvatarUrl = async (): Promise<string> => {
  try {
    const availableAvatars = await getAvailableAvatars();
    
    if (availableAvatars.length === 0) {
      // Fallback - возвращаем дефолтный аватар
      return BASE_AVATAR_URL + 'ava_00001.png';
    }

    const randomIndex = Math.floor(Math.random() * availableAvatars.length);
    return availableAvatars[randomIndex].url;
  } catch (error) {
    console.error('Failed to get random avatar:', error);
    // Fallback
    return BASE_AVATAR_URL + 'ava_00001.png';
  }
};

/**
 * Проверить, является ли URL валидным аватаром из нашей коллекции
 */
export const isValidAvatarUrl = (url: string): boolean => {
  if (!url.startsWith(BASE_AVATAR_URL)) return false;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  // Проверяем что это файл изображения
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
  return isImage && fileName.length > 0;
};

/**
 * Получить имя файла аватара из полного URL
 */
export const getAvatarFileName = (url: string): string | null => {
  if (!url.startsWith(BASE_AVATAR_URL)) return null;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  return fileName || null;
};

/**
 * Поиск аватаров по названию/номеру
 */
export const searchAvatars = async (query: string): Promise<AvatarFile[]> => {
  try {
    const allAvatars = await getAvailableAvatars();
    
    if (!query.trim()) {
      return allAvatars;
    }

    const searchQuery = query.toLowerCase();
    
    return allAvatars.filter(avatar => {
      const fileName = avatar.name.toLowerCase();
      const fileNameWithoutExt = fileName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
      
      // Поиск по имени файла и номеру (если есть)
      return fileName.includes(searchQuery) || 
             fileNameWithoutExt.includes(searchQuery) ||
             // Поиск по номеру в имени (например, "00004" в "ava_00004.png")
             /\d+/.test(searchQuery) && fileName.includes(searchQuery);
    });
  } catch (error) {
    console.error('Failed to search avatars:', error);
    return [];
  }
};

/**
 * Кэширование списка аватаров для улучшения производительности
 */
class AvatarCache {
  private static instance: AvatarCache;
  private cache: AvatarFile[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 минут

  public static getInstance(): AvatarCache {
    if (!AvatarCache.instance) {
      AvatarCache.instance = new AvatarCache();
    }
    return AvatarCache.instance;
  }

  async getAvatars(): Promise<AvatarFile[]> {
    const now = Date.now();
    
    // Если кэш актуален, возвращаем его
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }

    // Обновляем кэш
    try {
      this.cache = await getAvailableAvatars();
      this.cacheTimestamp = now;
      return this.cache;
    } catch (error) {
      console.error('Failed to update avatar cache:', error);
      // Если есть старый кэш, возвращаем его
      return this.cache || [];
    }
  }

  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const avatarCache = AvatarCache.getInstance();

/**
 * Получить кэшированный список аватаров
 */
export const getCachedAvatars = async (): Promise<AvatarFile[]> => {
  return avatarCache.getAvatars();
};

/**
 * Сбросить кэш аватаров (полезно после добавления/удаления файлов)
 */
export const invalidateAvatarCache = (): void => {
  avatarCache.invalidateCache();
};

/**
 * Получить статистику по аватарам
 */
export const getAvatarStats = async () => {
  try {
    const avatars = await getCachedAvatars();
    
    const stats = {
      total: avatars.length,
      byExtension: {} as Record<string, number>,
      totalSize: 0
    };

    avatars.forEach(avatar => {
      const extension = avatar.name.split('.').pop()?.toLowerCase() || 'unknown';
      stats.byExtension[extension] = (stats.byExtension[extension] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Failed to get avatar stats:', error);
    return {
      total: 0,
      byExtension: {},
      totalSize: 0
    };
  }
};

/**
 * Проверить доступность аватара по URL
 */
export const checkAvatarAvailability = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Получить информацию об аватаре
 */
export const getAvatarInfo = async (url: string) => {
  try {
    const fileName = getAvatarFileName(url);
    if (!fileName) return null;

    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return null;

    return {
      fileName,
      url,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      lastModified: response.headers.get('last-modified'),
      isAvailable: true
    };
  } catch (error) {
    console.error('Failed to get avatar info:', error);
    return null;
  }
};
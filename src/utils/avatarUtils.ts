// src/utils/avatarUtils.ts
// Обновленная версия с динамической загрузкой аватаров

import { getCachedAvatars, getRandomAvatarUrl as getRandomAvatarUrlDynamic, BASE_AVATAR_URL } from './dynamicAvatarUtils';

/**
 * @deprecated Используйте getCachedAvatars() из dynamicAvatarUtils.ts
 * Получить URL случайного аватара (legacy метод)
 */
export const getRandomAvatarUrl = async (): Promise<string> => {
  console.warn('getRandomAvatarUrl from avatarUtils.ts is deprecated. Use getRandomAvatarUrl from dynamicAvatarUtils.ts');
  return getRandomAvatarUrlDynamic();
};

/**
 * @deprecated Используйте динамические утилиты из dynamicAvatarUtils.ts
 * Получить полный URL аватара по номеру (legacy метод)
 */
export const getAvatarUrl = (avatarNumber: number): string => {
  console.warn('getAvatarUrl from avatarUtils.ts is deprecated. Use dynamic avatar loading');
  return BASE_AVATAR_URL + `${avatarNumber}.png`;
};

/**
 * @deprecated Используйте isValidAvatarUrl из dynamicAvatarUtils.ts
 * Проверить, является ли URL валидным аватаром из нашей коллекции
 */
export const isValidAvatarUrl = (url: string): boolean => {
  console.warn('isValidAvatarUrl from avatarUtils.ts is deprecated. Use isValidAvatarUrl from dynamicAvatarUtils.ts');
  
  if (!url.startsWith(BASE_AVATAR_URL)) return false;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  // Проверяем что это файл изображения (любой формат)
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
  return isImage && fileName.length > 0;
};

/**
 * @deprecated Используйте getAvatarFileName из dynamicAvatarUtils.ts
 * Получить номер аватара из полного URL (legacy метод)
 */
export const getAvatarNumber = (url: string): number | null => {
  console.warn('getAvatarNumber from avatarUtils.ts is deprecated. Use getAvatarFileName from dynamicAvatarUtils.ts');
  
  if (!url.startsWith(BASE_AVATAR_URL)) return null;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  const match = fileName.match(/^(\d+)\.png$/);
  
  return match ? parseInt(match[1]) : null;
};

/**
 * @deprecated Используйте getCachedAvatars из dynamicAvatarUtils.ts
 * Получить все доступные URL аватаров (legacy метод)
 */
export const getAllAvatarUrls = async (): Promise<string[]> => {
  console.warn('getAllAvatarUrls from avatarUtils.ts is deprecated. Use getCachedAvatars from dynamicAvatarUtils.ts');
  
  try {
    const avatars = await getCachedAvatars();
    return avatars.map(avatar => avatar.url);
  } catch (error) {
    console.error('Failed to get all avatar URLs:', error);
    return [];
  }
};

// Экспортируем константы для обратной совместимости
export { BASE_AVATAR_URL };

// Legacy константа - теперь будет пустой, так как используем динамическую загрузку
export const AVAILABLE_AVATARS: string[] = [];
console.warn('AVAILABLE_AVATARS from avatarUtils.ts is deprecated and empty. Use getCachedAvatars from dynamicAvatarUtils.ts');
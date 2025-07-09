// src/components/events/media/mediaUtils.ts
// Утилиты для работы с медиафайлами событий

import { supabase } from '../../../lib/supabase';
import { compressImage, generateUniqueFilename, getSupabaseImageUrl } from '../../../utils/imageUtils';
import {
  FileValidationResult,
  FileValidationOptions,
  MediaUploadErrorType,
  ERROR_MESSAGES,
  getEventCoverStoragePath,
  getEventGalleryStoragePath,
  getImageDimensions,
  MediaUploadFile,
  DEFAULT_MEDIA_CONFIG
} from './MediaUploadTypes';

/**
 * Валидация файла изображения
 */
export const validateImageFile = async (
  file: File,
  options: FileValidationOptions
): Promise<FileValidationResult> => {
  const errors: string[] = [];

  // Проверка размера файла
  if (file.size > options.maxSize) {
    errors.push(ERROR_MESSAGES[MediaUploadErrorType.FILE_TOO_LARGE]);
  }

  // Проверка формата файла
  if (!options.supportedFormats.includes(file.type)) {
    errors.push(ERROR_MESSAGES[MediaUploadErrorType.INVALID_FORMAT]);
  }

  // Проверка количества файлов
  if (options.maxCount && options.currentCount && options.currentCount >= options.maxCount) {
    errors.push(ERROR_MESSAGES[MediaUploadErrorType.QUOTA_EXCEEDED]);
  }

  // Проверка размеров изображения
  try {
    const dimensions = await getImageDimensions(file);
    if (dimensions.width < options.minSize.width || dimensions.height < options.minSize.height) {
      errors.push(ERROR_MESSAGES[MediaUploadErrorType.IMAGE_TOO_SMALL]);
    }
  } catch (error) {
    errors.push(ERROR_MESSAGES[MediaUploadErrorType.PROCESSING_FAILED]);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Валидация множественных файлов
 */
export const validateMultipleFiles = async (
  files: File[],
  options: FileValidationOptions
): Promise<{ validFiles: File[]; errors: string[] }> => {
  const validFiles: File[] = [];
  const allErrors: string[] = [];

  for (const file of files) {
    const validation = await validateImageFile(file, {
      ...options,
      currentCount: (options.currentCount || 0) + validFiles.length
    });

    if (validation.isValid) {
      validFiles.push(file);
    } else {
      allErrors.push(`${file.name}: ${validation.errors.join(', ')}`);
    }
  }

  return { validFiles, errors: allErrors };
};

/**
 * Загрузка изображения обложки с кадрированием
 */
export const uploadCoverImage = async (
  file: File,
  eventId: string,
  croppedBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<{ originalUrl: string; croppedUrl: string }> => {
  try {
    // Сжимаем оригинальное изображение
    const compressedOriginal = await compressImage(file, DEFAULT_MEDIA_CONFIG.compressionOptions);
    
    // Генерируем уникальные имена файлов
    const originalFileName = generateUniqueFilename(compressedOriginal, 'cover_original_');
    const croppedFileName = generateUniqueFilename(file, 'cover_cropped_');
    
    // Пути для хранения
    const originalPath = getEventCoverStoragePath(eventId, originalFileName);
    const croppedPath = getEventCoverStoragePath(eventId, croppedFileName);

    // Загружаем оригинал
    const { data: originalData, error: originalError } = await supabase.storage
      .from('images')
      .upload(originalPath, compressedOriginal, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          onProgress?.(progress.loaded / progress.total * 50); // 50% для оригинала
        }
      });

    if (originalError) throw originalError;

    // Загружаем кадрированную версию
    const { data: croppedData, error: croppedError } = await supabase.storage
      .from('images')
      .upload(croppedPath, croppedBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
        onUploadProgress: (progress) => {
          onProgress?.(50 + (progress.loaded / progress.total * 50)); // 50-100% для кадрированной
        }
      });

    if (croppedError) throw croppedError;

    // Получаем публичные URL
    const { data: originalUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(originalPath);

    const { data: croppedUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(croppedPath);

    return {
      originalUrl: originalUrlData.publicUrl,
      croppedUrl: croppedUrlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading cover image:', error);
    throw new Error(ERROR_MESSAGES[MediaUploadErrorType.UPLOAD_FAILED]);
  }
};

/**
 * Загрузка изображения в галерею
 */
export const uploadGalleryImage = async (
  file: File,
  eventId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Сжимаем изображение
    const compressedFile = await compressImage(file, DEFAULT_MEDIA_CONFIG.compressionOptions);
    
    // Генерируем уникальное имя файла
    const fileName = generateUniqueFilename(compressedFile, 'gallery_');
    
    // Путь для хранения
    const filePath = getEventGalleryStoragePath(eventId, fileName);

    // Загружаем файл
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          onProgress?.(progress.loaded / progress.total * 100);
        }
      });

    if (error) throw error;

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    throw new Error(ERROR_MESSAGES[MediaUploadErrorType.UPLOAD_FAILED]);
  }
};

/**
 * Пакетная загрузка изображений в галерею
 */
export const uploadMultipleGalleryImages = async (
  files: File[],
  eventId: string,
  onProgress?: (totalProgress: number, fileIndex: number, fileProgress: number) => void
): Promise<{ successUrls: string[]; errors: string[] }> => {
  const successUrls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const url = await uploadGalleryImage(file, eventId, (fileProgress) => {
        const totalProgress = ((i / files.length) * 100) + ((fileProgress / files.length));
        onProgress?.(totalProgress, i, fileProgress);
      });
      
      successUrls.push(url);
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Ошибка загрузки'}`);
    }
  }

  return { successUrls, errors };
};

/**
 * Удаление изображения из storage
 */
export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    // Извлекаем путь файла из URL
    const urlParts = imageUrl.split('/storage/v1/object/public/images/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid image URL format');
    }
    
    const filePath = urlParts[1];
    
    // Удаляем файл
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    // Не прерываем выполнение, так как файл может быть уже удален
  }
};

/**
 * Удаление изображения обложки (и оригинала, и кадрированной версии)
 */
export const deleteCoverImages = async (originalUrl?: string, croppedUrl?: string): Promise<void> => {
  const deletePromises: Promise<void>[] = [];
  
  if (originalUrl) {
    deletePromises.push(deleteImageFromStorage(originalUrl));
  }
  
  if (croppedUrl) {
    deletePromises.push(deleteImageFromStorage(croppedUrl));
  }
  
  await Promise.all(deletePromises);
};

/**
 * Создание превью для файла
 */
export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create preview'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Преобразование файлов в объекты MediaUploadFile
 */
export const processFilesForUpload = async (files: File[]): Promise<MediaUploadFile[]> => {
  const processedFiles: MediaUploadFile[] = [];
  
  for (const file of files) {
    try {
      const preview = await createFilePreview(file);
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      processedFiles.push({
        file,
        id,
        preview,
        uploadProgress: 0,
        uploaded: false
      });
    } catch (error) {
      console.error('Error processing file:', file.name, error);
    }
  }
  
  return processedFiles;
};

/**
 * Обработка drag and drop событий
 */
export const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

export const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

export const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

export const handleDrop = (e: React.DragEvent<HTMLDivElement>): File[] => {
  e.preventDefault();
  e.stopPropagation();
  
  const files = Array.from(e.dataTransfer.files);
  return files.filter(file => file.type.startsWith('image/'));
};

/**
 * Форматирование размера файла
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Получение типа файла для отображения
 */
export const getFileTypeLabel = (file: File): string => {
  const type = file.type.toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPEG';
  if (type.includes('png')) return 'PNG';
  if (type.includes('gif')) return 'GIF';
  if (type.includes('webp')) return 'WebP';
  return 'Image';
};
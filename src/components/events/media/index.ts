// src/components/events/media/index.ts
// Главный файл экспорта для медиа-компонентов событий

// Import all utilities first to ensure they're defined
import {
  validateImageFile as _validateImageFile,
  validateMultipleFiles,
  uploadCoverImage,
  uploadGalleryImage,
  uploadMultipleGalleryImages,
  deleteImageFromStorage,
  deleteCoverImages,
  createFilePreview,
  processFilesForUpload,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  formatFileSize,
  getFileTypeLabel
} from './mediaUtils';

// Основные компоненты
export { default as EventMediaSection } from './EventMediaSection';
export { default as EventCoverImageUpload } from './EventCoverImageUpload';
export { default as EventGalleryUpload } from './EventGalleryUpload';

// Типы и интерфейсы
export type {
  MediaUploadFile,
  CoverImageData,
  GalleryImageData,
  EventMediaData,
  MediaUploadConfig,
  FileValidationResult,
  FileValidationOptions,
  EventCoverImageUploadProps,
  EventGalleryUploadProps,
  EventMediaSectionProps,
  EventMediaUpdateData,
  DragState,
  UploadState,
  ErrorState
} from './MediaUploadTypes';

// Enums
export { MediaUploadErrorType } from './MediaUploadTypes';

// Константы и конфигурация
export {
  DEFAULT_MEDIA_CONFIG,
  ERROR_MESSAGES,
  getEventMediaStoragePath,
  getEventCoverStoragePath,
  getEventGalleryStoragePath,
  createImagePreview,
  getImageDimensions,
  generateImageId
} from './MediaUploadTypes';

// Утилиты для работы с медиафайлами - now properly exported
export {
  validateMultipleFiles,
  uploadCoverImage,
  uploadGalleryImage,
  uploadMultipleGalleryImages,
  deleteImageFromStorage,
  deleteCoverImages,
  createFilePreview,
  processFilesForUpload,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  formatFileSize,
  getFileTypeLabel
};

// Explicit export to ensure proper module loading
export const validateImageFile = _validateImageFile;

// Хуки для работы с медиафайлами (если потребуются в будущем)
// export { useMediaUpload } from './useMediaUpload';
// export { useImageCropper } from './useImageCropper';
// export { useDragAndDrop } from './useDragAndDrop';

// Экспорт для быстрого доступа к основным функциям
export const MediaUtils = {
  validateImageFile: _validateImageFile,
  validateMultipleFiles,
  uploadCoverImage,
  uploadGalleryImage,
  uploadMultipleGalleryImages,
  deleteImageFromStorage,
  deleteCoverImages,
  formatFileSize,
  getFileTypeLabel
};

// Экспорт конфигурации по умолчанию
export const {
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  minImageSize: DEFAULT_MIN_IMAGE_SIZE,
  maxGalleryImages: DEFAULT_MAX_GALLERY_IMAGES,
  supportedFormats: DEFAULT_SUPPORTED_FORMATS,
  coverImageSize: DEFAULT_COVER_IMAGE_SIZE,
  compressionOptions: DEFAULT_COMPRESSION_OPTIONS
} = DEFAULT_MEDIA_CONFIG;
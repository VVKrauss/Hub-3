// src/components/events/media/index.ts
// Главный файл экспорта для медиа-компонентов событий

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

// Утилиты для работы с медиафайлами
export {
  validateImageFile,
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

// Хуки для работы с медиафайлами (если потребуются в будущем)
// export { useMediaUpload } from './useMediaUpload'; 
// export { useImageCropper } from './useImageCropper';
// export { useDragAndDrop } from './useDragAndDrop'; 

// Экспорт для быстрого доступа к основным функциям
export const MediaUtils = {
  validateImageFile,
  validateMultipleFiles,
  uploadCoverImage,
  uploadGalleryImage,
  uploadMultipleGalleryImages,
  deleteImageFromStorage,
  deleteCoverImages,
  formatFileSize,
  getFileTypeLabel
};
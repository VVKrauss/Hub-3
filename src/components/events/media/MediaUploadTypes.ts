// src/components/events/media/MediaUploadTypes.ts
// Типы для медиа-компонентов событий

export interface MediaUploadFile {
  file: File;
  id: string;
  preview: string;
  uploadProgress: number;
  uploaded: boolean;
  error?: string;
  url?: string;
}

export interface CoverImageData {
  originalUrl?: string;
  croppedUrl?: string;
  file?: File;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

export interface GalleryImageData {
  id: string;
  url: string;
  file?: File;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

export interface EventMediaData {
  coverImage: CoverImageData;
  galleryImages: GalleryImageData[];
}

// Конфигурация для загрузки изображений
export interface MediaUploadConfig {
  maxFileSize: number; // в байтах
  minImageSize: { width: number; height: number };
  maxGalleryImages: number;
  supportedFormats: string[];
  coverImageSize: { width: number; height: number };
  compressionOptions: {
    maxWidthOrHeight: number;
    maxSizeMB: number;
    useWebWorker: boolean;
  };
}

// Дефолтная конфигурация
export const DEFAULT_MEDIA_CONFIG: MediaUploadConfig = {
  maxFileSize: 7 * 1024 * 1024, // 7MB
  minImageSize: { width: 200, height: 200 },
  maxGalleryImages: 50,
  supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  coverImageSize: { width: 1500, height: 500 },
  compressionOptions: {
    maxWidthOrHeight: 2000,
    maxSizeMB: 5,
    useWebWorker: true
  }
};

// Валидация файлов
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxSize: number;
  minSize: { width: number; height: number };
  supportedFormats: string[];
  maxCount?: number;
  currentCount?: number;
}

// Пропсы для компонентов
export interface EventCoverImageUploadProps {
  eventId?: string;
  eventSlug?: string;
  initialCoverImage?: CoverImageData;
  onCoverImageChange: (coverImage: CoverImageData) => void;
  onCoverImageRemove: () => void;
  config?: Partial<MediaUploadConfig>;
  disabled?: boolean;
}

export interface EventGalleryUploadProps {
  eventId?: string;
  eventSlug?: string;
  initialGalleryImages?: GalleryImageData[];
  onGalleryImagesChange: (images: GalleryImageData[]) => void;
  onImageRemove: (imageId: string) => void;
  config?: Partial<MediaUploadConfig>;
  disabled?: boolean;
}

export interface EventMediaSectionProps {
  eventId?: string;
  eventSlug?: string;
  initialMediaData?: EventMediaData;
  onMediaDataChange: (mediaData: EventMediaData) => void;
  config?: Partial<MediaUploadConfig>;
  disabled?: boolean;
}

// Утилиты для работы с путями хранения
export const getEventMediaStoragePath = (eventSlug: string, type: 'cover' | 'media', filename: string): string => {
  return `events/event_${eventSlug}/${type}/${filename}`;
};

export const getEventCoverStoragePath = (eventSlug: string, filename: string): string => {
  return getEventMediaStoragePath(eventSlug, 'cover', filename);
};

export const getEventGalleryStoragePath = (eventSlug: string, filename: string): string => {
  return getEventMediaStoragePath(eventSlug, 'media', filename);
};

// Типы для обновления БД
export interface EventMediaUpdateData {
  cover_image_url?: string;
  cover_image_original_url?: string;
  gallery_images?: string[];
}

// Хелперы для работы с изображениями
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Функция для генерации уникального ID
export const generateImageId = (): string => {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// Типы для состояний компонентов
export interface DragState {
  isDragging: boolean;
  dragCounter: number;
}

export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  totalFiles: number;
  completedFiles: number;
  errors: string[];
}

// Состояние для обработки ошибок
export interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string;
}

// Enum для типов ошибок
export enum MediaUploadErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Сообщения об ошибках
export const ERROR_MESSAGES: Record<MediaUploadErrorType, string> = {
  [MediaUploadErrorType.FILE_TOO_LARGE]: 'Файл слишком большой (максимум 7 МБ)',
  [MediaUploadErrorType.INVALID_FORMAT]: 'Неподдерживаемый формат файла',
  [MediaUploadErrorType.IMAGE_TOO_SMALL]: 'Изображение слишком маленькое (минимум 200x200px)',
  [MediaUploadErrorType.UPLOAD_FAILED]: 'Ошибка при загрузке файла',
  [MediaUploadErrorType.PROCESSING_FAILED]: 'Ошибка при обработке изображения',
  [MediaUploadErrorType.QUOTA_EXCEEDED]: 'Превышен лимит количества изображений',
  [MediaUploadErrorType.NETWORK_ERROR]: 'Ошибка сети'
};
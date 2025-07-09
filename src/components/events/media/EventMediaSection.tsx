// src/components/events/media/EventMediaSection.tsx
// Основной компонент для управления медиафайлами мероприятия

import React, { useState, useCallback, useEffect } from 'react';
import { Image, Images, AlertCircle, Info } from 'lucide-react';

import {
  EventMediaSectionProps,
  EventMediaData,
  CoverImageData,
  GalleryImageData,
  DEFAULT_MEDIA_CONFIG,
  EventMediaUpdateData
} from './MediaUploadTypes';

import EventCoverImageUpload from './EventCoverImageUpload';
import EventGalleryUpload from './EventGalleryUpload';

const EventMediaSection: React.FC<EventMediaSectionProps> = ({
  eventId,
  eventSlug,
  initialMediaData,
  onMediaDataChange,
  config = {},
  disabled = false
}) => {
  // Объединяем конфигурацию с дефолтной
  const finalConfig = { ...DEFAULT_MEDIA_CONFIG, ...config };

  // Состояние компонента
  const [mediaData, setMediaData] = useState<EventMediaData>(
    initialMediaData || {
      coverImage: {},
      galleryImages: []
    }
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Обработчики изменений фонового изображения
  const handleCoverImageChange = useCallback((coverImage: CoverImageData) => {
    const newMediaData = {
      ...mediaData,
      coverImage
    };
    setMediaData(newMediaData);
    setHasUnsavedChanges(true);
    onMediaDataChange(newMediaData);
  }, [mediaData, onMediaDataChange]);

  const handleCoverImageRemove = useCallback(() => {
    const newMediaData = {
      ...mediaData,
      coverImage: {}
    };
    setMediaData(newMediaData);
    setHasUnsavedChanges(true);
    onMediaDataChange(newMediaData);
  }, [mediaData, onMediaDataChange]);

  // Обработчики изменений галереи
  const handleGalleryImagesChange = useCallback((galleryImages: GalleryImageData[]) => {
    const newMediaData = {
      ...mediaData,
      galleryImages
    };
    setMediaData(newMediaData);
    setHasUnsavedChanges(true);
    onMediaDataChange(newMediaData);
  }, [mediaData, onMediaDataChange]);

  const handleGalleryImageRemove = useCallback((imageId: string) => {
    // Обработка удаления уже происходит в EventGalleryUpload
    setHasUnsavedChanges(true);
  }, []);

  // Получение данных для обновления БД
  const getUpdateData = useCallback((): EventMediaUpdateData => {
    return {
      cover_image_url: mediaData.coverImage.croppedUrl || undefined,
      cover_image_original_url: mediaData.coverImage.originalUrl || undefined,
      gallery_images: mediaData.galleryImages.map(img => img.url)
    };
  }, [mediaData]);

  // Сброс флага несохраненных изменений при получении новых данных
  useEffect(() => {
    if (initialMediaData) {
      setMediaData(initialMediaData);
      setHasUnsavedChanges(false);
    }
  }, [initialMediaData]);

  // Статистика
  const getMediaStats = useCallback(() => {
    const coverImageSize = mediaData.coverImage.croppedUrl ? 1 : 0;
    const gallerySize = mediaData.galleryImages.length;
    const totalImages = coverImageSize + gallerySize;
    const maxTotal = 1 + finalConfig.maxGalleryImages; // 1 фон + макс галерея
    
    return {
      coverImageSize,
      gallerySize,
      totalImages,
      maxTotal,
      hasImages: totalImages > 0
    };
  }, [mediaData, finalConfig.maxGalleryImages]);

  const stats = getMediaStats();

  return (
    <div className="space-y-8">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Image className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Медиафайлы мероприятия
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Фоновое изображение и галерея фотографий
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Image className="h-4 w-4" />
            <span>{stats.totalImages} из {stats.maxTotal}</span>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>Есть несохраненные изменения</span>
            </div>
          )}
        </div>
      </div>

      {/* Информационная панель */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Рекомендации по медиафайлам:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Фоновое изображение: соотношение 3:1 (рекомендуется {finalConfig.coverImageSize.width}x{finalConfig.coverImageSize.height}px)</li>
              <li>• Галерея: до {finalConfig.maxGalleryImages} изображений, минимум {finalConfig.minImageSize.width}x{finalConfig.minImageSize.height}px</li>
              <li>• Максимальный размер файла: {Math.round(finalConfig.maxFileSize / 1024 / 1024)} МБ</li>
              <li>• Поддерживаемые форматы: JPEG, PNG, GIF, WebP</li>
              <li>• Структура хранения: /events/event_[slug]/cover/ и /events/event_[slug]/media/</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Фоновое изображение */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h4 className="text-base font-medium text-gray-900 dark:text-white">
            Фоновое изображение мероприятия
          </h4>
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Обязательно
            </span>
          </div>
        </div>

        <div className="pl-7">
          <EventCoverImageUpload
            eventId={eventId}
            eventSlug={eventSlug}
            initialCoverImage={mediaData.coverImage}
            onCoverImageChange={handleCoverImageChange}
            onCoverImageRemove={handleCoverImageRemove}
            config={finalConfig}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Разделитель */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Галерея фотографий */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h4 className="text-base font-medium text-gray-900 dark:text-white">
            Галерея фотографий с мероприятия
          </h4>
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Опционально
            </span>
          </div>
        </div>

        <div className="pl-7">
          <EventGalleryUpload
            eventId={eventId}
            eventSlug={eventSlug}
            initialGalleryImages={mediaData.galleryImages}
            onGalleryImagesChange={handleGalleryImagesChange}
            onImageRemove={handleGalleryImageRemove}
            config={finalConfig}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Итоговая информация */}
      {stats.hasImages && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Итого медиафайлов: {stats.totalImages}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Фоновое изображение: {stats.coverImageSize > 0 ? '✓' : '✗'} • 
                Галерея: {stats.gallerySize} фото
              </p>
            </div>
            
            {hasUnsavedChanges && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Сохраните мероприятие для применения изменений
              </div>
            )}
          </div>
        </div>
      )}

      {/* Скрытые данные для отладки (только в dev режиме) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500 dark:text-gray-400">
          <summary className="cursor-pointer">Debug: Media Data</summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
            {JSON.stringify({ mediaData, stats, updateData: getUpdateData() }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default EventMediaSection;
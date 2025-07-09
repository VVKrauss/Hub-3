// src/components/events/media/EventGalleryUpload.tsx
// Компонент для загрузки множественных изображений в галерею мероприятия

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Images, Loader2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import {
  EventGalleryUploadProps,
  GalleryImageData,
  DEFAULT_MEDIA_CONFIG,
  FileValidationOptions,
  MediaUploadFile,
  generateImageId
} from './MediaUploadTypes';

import {
  validateMultipleFiles,
  uploadMultipleGalleryImages,
  deleteImageFromStorage,
  processFilesForUpload,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  formatFileSize,
  getFileTypeLabel
} from './mediaUtils';

const EventGalleryUpload: React.FC<EventGalleryUploadProps> = ({
  eventId,
  initialGalleryImages = [],
  onGalleryImagesChange,
  onImageRemove,
  config = {},
  disabled = false
}) => {
  // Объединяем конфигурацию с дефолтной
  const finalConfig = { ...DEFAULT_MEDIA_CONFIG, ...config };

  // Состояние компонента
  const [galleryImages, setGalleryImages] = useState<GalleryImageData[]>(initialGalleryImages);
  const [uploadingFiles, setUploadingFiles] = useState<MediaUploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Рефы
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка выбора файлов
  const handleFileSelect = useCallback(async (files: File[]) => {
    if (disabled || !eventId) return;

    // Проверяем лимит
    const currentCount = galleryImages.length + uploadingFiles.length;
    const availableSlots = finalConfig.maxGalleryImages - currentCount;
    
    if (availableSlots <= 0) {
      toast.error(`Достигнут максимум изображений (${finalConfig.maxGalleryImages})`);
      return;
    }

    // Берем только доступное количество файлов
    const filesToProcess = files.slice(0, availableSlots);
    
    // Валидируем файлы
    const validationOptions: FileValidationOptions = {
      maxSize: finalConfig.maxFileSize,
      minSize: finalConfig.minImageSize,
      supportedFormats: finalConfig.supportedFormats,
      maxCount: finalConfig.maxGalleryImages,
      currentCount: currentCount
    };

    const { validFiles, errors } = await validateMultipleFiles(filesToProcess, validationOptions);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (validFiles.length === 0) return;
    } else {
      setValidationErrors([]);
    }

    // Создаем объекты для загрузки
    const filesForUpload = await processFilesForUpload(validFiles);
    setUploadingFiles(prev => [...prev, ...filesForUpload]);

    // Запускаем загрузку
    handleUploadFiles(filesForUpload);
  }, [disabled, eventId, galleryImages.length, uploadingFiles.length, finalConfig]);

  // Загрузка файлов
  const handleUploadFiles = useCallback(async (files: MediaUploadFile[]) => {
    if (!eventId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileObjects = files.map(f => f.file);
      const { successUrls, errors } = await uploadMultipleGalleryImages(
        fileObjects,
        eventId,
        (totalProgress, fileIndex, fileProgress) => {
          setUploadProgress(totalProgress);
          
          // Обновляем прогресс для конкретного файла
          setUploadingFiles(prev => 
            prev.map((file, index) => 
              index === fileIndex 
                ? { ...file, uploadProgress: fileProgress }
                : file
            )
          );
        }
      );

      // Создаем объекты галереи для успешно загруженных изображений
      const newGalleryImages: GalleryImageData[] = successUrls.map(url => ({
        id: generateImageId(),
        url
      }));

      // Обновляем состояние
      const updatedGalleryImages = [...galleryImages, ...newGalleryImages];
      setGalleryImages(updatedGalleryImages);
      onGalleryImagesChange(updatedGalleryImages);

      // Очищаем загружающиеся файлы
      setUploadingFiles([]);

      // Показываем результат
      if (successUrls.length > 0) {
        toast.success(`Загружено ${successUrls.length} изображений`);
      }
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error(`Ошибки при загрузке ${errors.length} файлов`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Ошибка при загрузке файлов');
      setUploadingFiles([]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [eventId, galleryImages, onGalleryImagesChange]);

  // Обработка изменения input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // Drag and drop обработчики
  const handleDragEnterEvent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    handleDragEnter(e);
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeaveEvent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    handleDragLeave(e);
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragging(false);
    }
  }, [disabled, dragCounter]);

  const handleDropEvent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    const files = handleDrop(e);
    setIsDragging(false);
    setDragCounter(0);
    
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  // Удаление изображения
  const handleRemoveImage = useCallback(async (imageId: string) => {
    if (disabled) return;

    const imageToRemove = galleryImages.find(img => img.id === imageId);
    if (!imageToRemove) return;

    try {
      // Удаляем из storage
      await deleteImageFromStorage(imageToRemove.url);
      
      // Обновляем состояние
      const updatedImages = galleryImages.filter(img => img.id !== imageId);
      setGalleryImages(updatedImages);
      onGalleryImagesChange(updatedImages);
      onImageRemove(imageId);
      
      toast.success('Изображение удалено');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Ошибка при удалении изображения');
    }
  }, [disabled, galleryImages, onGalleryImagesChange, onImageRemove]);

  // Открытие файлового диалога
  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  // Получение доступных слотов
  const getAvailableSlots = useCallback(() => {
    return finalConfig.maxGalleryImages - galleryImages.length - uploadingFiles.length;
  }, [finalConfig.maxGalleryImages, galleryImages.length, uploadingFiles.length]);

  return (
    <div className="space-y-4">
      {/* Скрытый input для выбора файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept={finalConfig.supportedFormats.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        multiple
      />

      {/* Информация о лимитах */}
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>
          Загружено: {galleryImages.length} из {finalConfig.maxGalleryImages}
        </span>
        <span>
          Доступно: {getAvailableSlots()} слотов
        </span>
      </div>

      {/* Зона загрузки */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          isDragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-dark-600 hover:border-gray-400 dark:hover:border-dark-500'
        } ${disabled || getAvailableSlots() <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnterEvent}
        onDragLeave={handleDragLeaveEvent}
        onDrop={handleDropEvent}
        onClick={openFileDialog}
      >
        <div className="flex flex-col items-center">
          <div className="mb-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
            <Images className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">
              {isDragging ? 'Отпустите для загрузки' : 'Добавить фотографии в галерею'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Перетащите файлы сюда или нажмите для выбора
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Максимум {formatFileSize(finalConfig.maxFileSize)} на файл
            </p>
          </div>

          {!disabled && getAvailableSlots() > 0 && (
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              Выбрать файлы
            </button>
          )}
        </div>

        {/* Индикатор драга */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-50/90 dark:bg-primary-900/30 rounded-lg">
            <div className="text-primary-600 dark:text-primary-400 font-medium">
              Отпустите для загрузки
            </div>
          </div>
        )}
      </div>

      {/* Прогресс загрузки */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Загрузка изображений...
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Загружающиеся файлы */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Загружаются файлы:
          </h4>
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-dark-700 rounded-lg">
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.file.size)} • {getFileTypeLabel(file.file)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 dark:bg-dark-600 rounded-full h-1">
                    <div
                      className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${file.uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                    {Math.round(file.uploadProgress)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Галерея загруженных изображений */}
      {galleryImages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Галерея фотографий ({galleryImages.length}):
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {galleryImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-700">
                  <img
                    src={image.url}
                    alt="Фото из галереи"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Оверлей с кнопками */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedImageForPreview(image.url)}
                      className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-colors"
                      title="Просмотреть"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      disabled={disabled}
                      className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ошибки валидации */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Ошибки при загрузке:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="break-words">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для просмотра изображения */}
      {selectedImageForPreview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImageForPreview(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImageForPreview}
              alt="Просмотр изображения"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventGalleryUpload;
// src/components/events/media/EventCoverImageUpload.tsx
// Компонент для загрузки фонового изображения мероприятия с кадрированием 3:1

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader2, AlertCircle, Edit } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { toast } from 'react-hot-toast';

import {
  EventCoverImageUploadProps,
  CoverImageData,
  DEFAULT_MEDIA_CONFIG,
  FileValidationOptions,
  generateImageId
} from './MediaUploadTypes';

import {
  validateImageFile,
  uploadCoverImage,
  deleteCoverImages,
  createFilePreview,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  formatFileSize
} from './mediaUtils';

const EventCoverImageUpload: React.FC<EventCoverImageUploadProps> = ({
  eventId,
  initialCoverImage,
  onCoverImageChange,
  onCoverImageRemove,
  config = {},
  disabled = false
}) => {
  // Объединяем конфигурацию с дефолтной
  const finalConfig = { ...DEFAULT_MEDIA_CONFIG, ...config };

  // Состояние компонента
  const [coverImage, setCoverImage] = useState<CoverImageData>(initialCoverImage || {});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Рефы
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Валидация файла
  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    const options: FileValidationOptions = {
      maxSize: finalConfig.maxFileSize,
      minSize: finalConfig.minImageSize,
      supportedFormats: finalConfig.supportedFormats
    };

    const validation = await validateImageFile(file, options);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return false;
    }

    setValidationErrors([]);
    return true;
  }, [finalConfig]);

  // Обработка выбора файла
  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;

    const isValid = await validateFile(file);
    if (!isValid) return;

    try {
      setSelectedFile(file);
      setShowCropper(true);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Ошибка при обработке файла');
    }
  }, [disabled, validateFile]);

  // Обработка изменения input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
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
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Кадрирование изображения
  const handleCrop = useCallback(async () => {
    if (!cropper || !selectedFile || !eventId) return;

    try {
      setCoverImage(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

      // Получаем кадрированное изображение
      const croppedCanvas = cropper.getCroppedCanvas({
        width: finalConfig.coverImageSize.width,
        height: finalConfig.coverImageSize.height,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      // Конвертируем в blob
      const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        croppedCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.9);
      });

      // Загружаем изображения
      const { originalUrl, croppedUrl } = await uploadCoverImage(
        selectedFile,
        eventId,
        croppedBlob,
        (progress) => {
          setCoverImage(prev => ({ ...prev, uploadProgress: progress }));
        }
      );

      // Удаляем старые изображения если они есть
      if (coverImage.originalUrl || coverImage.croppedUrl) {
        await deleteCoverImages(coverImage.originalUrl, coverImage.croppedUrl);
      }

      // Обновляем состояние
      const newCoverImage: CoverImageData = {
        originalUrl,
        croppedUrl,
        isUploading: false,
        uploadProgress: 100
      };

      setCoverImage(newCoverImage);
      onCoverImageChange(newCoverImage);
      
      // Закрываем кроппер
      setShowCropper(false);
      setSelectedFile(null);
      
      toast.success('Фоновое изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading cover image:', error);
      setCoverImage(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error instanceof Error ? error.message : 'Ошибка загрузки'
      }));
      toast.error('Ошибка при загрузке изображения');
    }
  }, [cropper, selectedFile, eventId, finalConfig, coverImage, onCoverImageChange]);

  // Отмена кадрирования
  const cancelCrop = useCallback(() => {
    setShowCropper(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Удаление изображения
  const handleRemoveImage = useCallback(async () => {
    if (disabled) return;

    try {
      // Удаляем файлы из storage
      await deleteCoverImages(coverImage.originalUrl, coverImage.croppedUrl);
      
      // Очищаем состояние
      setCoverImage({});
      onCoverImageRemove();
      
      toast.success('Фоновое изображение удалено');
    } catch (error) {
      console.error('Error removing cover image:', error);
      toast.error('Ошибка при удалении изображения');
    }
  }, [disabled, coverImage, onCoverImageRemove]);

  // Открытие файлового диалога
  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  return (
    <div className="space-y-4">
      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept={finalConfig.supportedFormats.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Кроппер */}
      {showCropper && selectedFile && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Кадрирование фонового изображения
              </h3>
              <button
                onClick={cancelCrop}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="h-96 w-full relative rounded-lg overflow-hidden">
                <Cropper
                  src={URL.createObjectURL(selectedFile)}
                  style={{ height: '100%', width: '100%' }}
                  aspectRatio={3} // 3:1 ratio
                  guides={true}
                  viewMode={1}
                  dragMode="move"
                  scalable={true}
                  cropBoxMovable={true}
                  cropBoxResizable={true}
                  onInitialized={(instance) => setCropper(instance)}
                  className="max-w-full"
                />
              </div>

              {/* Прогресс загрузки */}
              {coverImage.isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Загрузка изображения...
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Math.round(coverImage.uploadProgress || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${coverImage.uploadProgress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelCrop}
                  disabled={coverImage.isUploading}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCrop}
                  disabled={coverImage.isUploading || !eventId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {coverImage.isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Основной блок загрузки */}
      {coverImage.croppedUrl ? (
        /* Превью загруженного изображения */
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={coverImage.croppedUrl}
              alt="Фоновое изображение мероприятия"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            
            {/* Кнопки действий */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={openFileDialog}
                disabled={disabled}
                className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-colors disabled:opacity-50"
                title="Заменить изображение"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={handleRemoveImage}
                disabled={disabled}
                className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
                title="Удалить изображение"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Информация об изображении */}
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Фоновое изображение (соотношение 3:1)</p>
            <p className="text-xs">Размер: {finalConfig.coverImageSize.width}x{finalConfig.coverImageSize.height}px</p>
          </div>
        </div>
      ) : (
        /* Зона загрузки */
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragging
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-dark-600 hover:border-gray-400 dark:hover:border-dark-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnterEvent}
          onDragLeave={handleDragLeaveEvent}
          onDrop={handleDropEvent}
          onClick={openFileDialog}
        >
          <div className="flex flex-col items-center">
            <div className="mb-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
              <ImageIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isDragging ? 'Отпустите для загрузки' : 'Загрузите фоновое изображение'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Соотношение сторон 3:1 • Максимум {formatFileSize(finalConfig.maxFileSize)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Поддерживаемые форматы: JPEG, PNG, GIF, WebP
              </p>
            </div>

            {!disabled && (
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  openFileDialog();
                }}
              >
                Выбрать файл
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
      )}

      {/* Ошибки валидации */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Ошибка валидации файла:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Ошибка загрузки */}
      {coverImage.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">
              {coverImage.error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCoverImageUpload;
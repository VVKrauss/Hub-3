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
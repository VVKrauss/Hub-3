// src/components/events/media/index.tsx
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video, FileText, Eye, Trash2, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { compressImage, generateUniqueFilename } from '../../../utils/imageUtils';

interface EventMediaSectionProps {
  eventId: string;
  eventSlug: string;
  initialMediaData?: {
    cover_image_url?: string;
    gallery_images?: string[];
    video_url?: string;
  };
  onMediaDataChange?: (data: {
    cover_image_url?: string;
    gallery_images?: string[];
    video_url?: string;
  }) => void;
  disabled?: boolean;
}

export const EventMediaSection: React.FC<EventMediaSectionProps> = ({ 
  eventId, 
  eventSlug, 
  initialMediaData = {}, 
  onMediaDataChange, 
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverImage, setCoverImage] = useState(initialMediaData.cover_image_url || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(initialMediaData.gallery_images || []);
  const [videoUrl, setVideoUrl] = useState(initialMediaData.video_url || '');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Alternative upload method - direct to public bucket
  const uploadImageAlternative = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      setUploadProgress(20);

      console.log('Using alternative upload method for:', file.name);

      // Try to compress image with simpler settings
      let fileToUpload = file;
      try {
        fileToUpload = await compressImage(file, {
          maxWidthOrHeight: 1200,
          maxSizeMB: 1,
          useWebWorker: false
        });
        setUploadProgress(40);
      } catch (compressionError) {
        console.warn('Compression failed, using original file:', compressionError);
        fileToUpload = file;
      }

      // Generate simple filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `event_${timestamp}_${randomString}.${fileExt}`;

      setUploadProgress(60);

      // Try upload to root of images bucket
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, fileToUpload);

      if (error) {
        throw new Error(`Ошибка Supabase: ${error.message}`);
      }

      setUploadProgress(90);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setUploadProgress(100);
      return urlData.publicUrl;

    } catch (error: any) {
      console.error('Alternative upload error:', error);
      throw error;
    }
  };

  // Upload image to Supabase storage
  const uploadImageToSupabase = async (file: File, folder: string = 'events'): Promise<string> => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      console.log('Starting upload for file:', file.name, 'Size:', file.size);

      // Compress image
      setUploadProgress(20);
      const compressedFile = await compressImage(file, {
        maxWidthOrHeight: 1920,
        maxSizeMB: 2,
        useWebWorker: true
      });

      console.log('Image compressed. Original size:', file.size, 'Compressed size:', compressedFile.size);

      // Generate unique filename
      setUploadProgress(30);
      const fileName = generateUniqueFilename(compressedFile, `${eventSlug}_`);
      const filePath = `${folder}/${fileName}`;

      console.log('Uploading to path:', filePath);

      // Upload to Supabase with progress tracking
      setUploadProgress(40);
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Ошибка загрузки в Supabase: ${error.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL
      setUploadProgress(80);
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);

      setUploadProgress(100);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return urlData.publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Ошибка загрузки: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle cover image upload
  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }

    try {
      console.log('Starting cover image upload...');
      let imageUrl: string;
      
      try {
        // Try main upload method first
        imageUrl = await uploadImageToSupabase(file, 'events/covers');
      } catch (mainError) {
        console.warn('Main upload failed, trying alternative:', mainError);
        toast.dismiss();
        toast.loading('Пробуем альтернативный метод загрузки...');
        
        // Fallback to alternative method
        imageUrl = await uploadImageAlternative(file);
      }
      
      setCoverImage(imageUrl);
      
      const updatedData = {
        cover_image_url: imageUrl,
        gallery_images: galleryImages,
        video_url: videoUrl
      };
      
      onMediaDataChange?.(updatedData);
      toast.dismiss();
      toast.success('Обложка загружена успешно');
      
    } catch (error: any) {
      console.error('All upload methods failed:', error);
      toast.dismiss();
      toast.error(`Не удалось загрузить изображение: ${error.message}`);
    }

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Handle gallery images upload
  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Пожалуйста, выберите только файлы изображений');
      return;
    }

    // Check total size
    const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024 * 1024) { // 50MB total
      toast.error('Общий размер файлов слишком большой. Максимум: 50MB');
      return;
    }

    try {
      console.log(`Starting gallery upload for ${imageFiles.length} files...`);
      const uploadedUrls: string[] = [];
      
      // Upload files one by one to avoid overwhelming the server
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        toast.loading(`Загружаем ${i + 1} из ${imageFiles.length}...`);
        
        try {
          // Try main method first
          const url = await uploadImageToSupabase(file, 'events/gallery');
          uploadedUrls.push(url);
        } catch (mainError) {
          console.warn(`Main upload failed for file ${i + 1}, trying alternative:`, mainError);
          // Fallback to alternative
          const url = await uploadImageAlternative(file);
          uploadedUrls.push(url);
        }
      }
      
      const newGalleryImages = [...galleryImages, ...uploadedUrls];
      setGalleryImages(newGalleryImages);
      
      const updatedData = {
        cover_image_url: coverImage,
        gallery_images: newGalleryImages,
        video_url: videoUrl
      };
      
      onMediaDataChange?.(updatedData);
      toast.dismiss();
      toast.success(`Загружено ${uploadedUrls.length} изображений в галерею`);
      
    } catch (error: any) {
      console.error('Gallery upload failed:', error);
      toast.dismiss();
      toast.error(`Ошибка загрузки галереи: ${error.message}`);
    }

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Remove gallery image
  const removeGalleryImage = (indexToRemove: number) => {
    const newGalleryImages = galleryImages.filter((_, index) => index !== indexToRemove);
    setGalleryImages(newGalleryImages);
    
    const updatedData = {
      cover_image_url: coverImage,
      gallery_images: newGalleryImages,
      video_url: videoUrl
    };
    
    onMediaDataChange?.(updatedData);
    toast.success('Изображение удалено из галереи');
  };

  // Handle video URL change
  const handleVideoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setVideoUrl(url);
    
    const updatedData = {
      cover_image_url: coverImage,
      gallery_images: galleryImages,
      video_url: url
    };
    
    onMediaDataChange?.(updatedData);
  };

  // Remove cover image
  const removeCoverImage = () => {
    setCoverImage('');
    const updatedData = {
      cover_image_url: '',
      gallery_images: galleryImages,
      video_url: videoUrl
    };
    onMediaDataChange?.(updatedData);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Медиафайлы мероприятия
        </h3>

        {/* Cover Image Section */}
        <div className="mb-8">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Обложка мероприятия
          </h4>
          
          {coverImage ? (
            <div className="relative inline-block">
              <img
                src={coverImage}
                alt="Обложка мероприятия"
                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-dark-600"
              />
              {!disabled && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => setPreviewImage(coverImage)}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-colors"
                    title="Предпросмотр"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={removeCoverImage}
                    className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white p-2 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div 
              className={`border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center ${
                disabled ? 'bg-gray-50 dark:bg-dark-700' : 'hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer'
              }`}
              onClick={() => !disabled && coverFileInputRef.current?.click()}
            >
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {disabled ? 'Обложка не загружена' : 'Нажмите для загрузки обложки'}
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, WEBP до 2MB
              </p>
            </div>
          )}

          {!disabled && (
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          )}
        </div>

        {/* Gallery Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Галерея изображений ({galleryImages.length})
            </h4>
            {!disabled && (
              <button
                onClick={() => galleryFileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Добавить фото
              </button>
            )}
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Галерея ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-dark-600"
                  />
                  {!disabled && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewImage(imageUrl)}
                          className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-lg transition-colors"
                          title="Предпросмотр"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeGalleryImage(index)}
                          className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 text-white p-2 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {disabled ? 'Галерея пуста' : 'Галерея пуста. Добавьте изображения для создания галереи мероприятия.'}
              </p>
            </div>
          )}

          {!disabled && (
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              className="hidden"
              disabled={isUploading}
            />
          )}
        </div>

        {/* Video Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео мероприятия
          </h4>
          
          <input
            type="url"
            value={videoUrl}
            onChange={handleVideoUrlChange}
            disabled={disabled}
            placeholder="https://youtube.com/watch?v=... или https://vimeo.com/..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-dark-600"
          />
          
          {videoUrl && (
            <div className="mt-3">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Видео URL добавлен
              </p>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                  Загрузка изображения... {uploadProgress}%
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 dark:bg-dark-700 border rounded-lg p-3 text-xs">
            <p className="text-gray-600 dark:text-gray-400">
              Debug: eventId={eventId}, eventSlug={eventSlug}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'не установлен'}
            </p>
          </div>
        )}

        {disabled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Редактирование медиафайлов отключено
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-lg transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewImage}
              alt="Предпросмотр"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Default export для удобства импорта
export default EventMediaSection;
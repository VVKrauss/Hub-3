import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { supabase } from '../../lib/supabase';
import { compressImage, generateUniqueFilename } from '../../utils/imageUtils';

interface ImageUploadAndCropProps {
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  storageBucket?: string;
  storagePathPrefix: string;
  onUploadSuccess: (url: string, path: string) => void;
  initialImageUrl?: string;
  onRemoveImage?: () => void;
  recommendedText?: string;
  className?: string;
  buttonText?: string;
}

const ImageUploadAndCrop = ({
  aspectRatio = 1,
  targetWidth = 800,
  targetHeight = 800,
  storageBucket = 'images',
  storagePathPrefix,
  onUploadSuccess,
  initialImageUrl,
  onRemoveImage,
  recommendedText = 'Рекомендуемый размер: 800x800px',
  className = '',
  buttonText = 'Загрузить изображение'
}: ImageUploadAndCropProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress the image before cropping
      const compressedFile = await compressImage(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 2,
        useWebWorker: true
      });

      setImageFile(compressedFile);
      setShowCropper(true);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Ошибка при обработке изображения');
    }
  };

  const handleCrop = async () => {
    if (!cropper || !imageFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Get cropped canvas
      const croppedCanvas = cropper.getCroppedCanvas({
        width: targetWidth,
        height: targetHeight,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        croppedCanvas.toBlob((b) => {
          if (b) resolve(b);
          else throw new Error('Failed to create blob');
        }, 'image/jpeg', 0.9);
      });

      // Create file from blob
      const fileName = generateUniqueFilename(imageFile, storagePathPrefix);

      // Upload to Supabase with progress tracking
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          },
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(fileName);

      onUploadSuccess(urlData.publicUrl, fileName);
      
      // Reset state
      setShowCropper(false);
      setImageFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploading(false);
    }
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`image-upload-container ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {showCropper && imageFile ? (
        <div className="space-y-4">
          <Cropper
            src={URL.createObjectURL(imageFile)}
            style={{ height: 400, width: '100%' }}
            aspectRatio={aspectRatio}
            guides={true}
            viewMode={1}
            dragMode="move"
            scalable={true}
            cropBoxMovable={true}
            cropBoxResizable={true}
            onInitialized={(instance) => setCropper(instance)}
            className="max-w-full"
          />
          
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Загрузка</span>
                <span className="text-sm font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2.5">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelCrop}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline-block" />
              Отмена
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="animate-pulse">Загрузка...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2 inline-block" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      ) : initialImageUrl ? (
        <div className="relative">
          <img
            src={initialImageUrl}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg"
              title="Изменить изображение"
            >
              <Upload className="h-5 w-5" />
            </button>
            {onRemoveImage && (
              <button
                type="button"
                onClick={onRemoveImage}
                className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg"
                title="Удалить изображение"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4 p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
              <ImageIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              {buttonText}
            </button>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {recommendedText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadAndCrop;
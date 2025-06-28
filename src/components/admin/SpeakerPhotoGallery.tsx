import { useState, useEffect } from 'react';
import { Star, StarOff, Expand, X, Crop } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import ImageUploadAndCrop from '../shared/ImageUploadAndCrop';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type Photo = {
  url: string;
  isMain?: boolean;
};

type SpeakerPhotoGalleryProps = {
  speakerId: string;
  photos: Photo[];
  onPhotosUpdate: (photos: Photo[]) => void;
  onImageSelect?: (url: string | null) => void;
};

const SpeakerPhotoGallery = ({ 
  speakerId, 
  photos = [], 
  onPhotosUpdate,
  onImageSelect 
}: SpeakerPhotoGalleryProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoForCrop, setSelectedPhotoForCrop] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const handleSetMainPhoto = async (photoUrl: string) => {
    setLoading(true);
    try {
      const updatedPhotos = (Array.isArray(photos) ? photos : []).map(photo => ({
        ...photo,
        isMain: photo.url === photoUrl
      }));

      const { error } = await supabase
        .from('speakers')
        .update({ photos: updatedPhotos })
        .eq('id', speakerId);

      if (error) throw error;

      onPhotosUpdate(updatedPhotos);
      toast.success('Основная фотография обновлена');
      
      // Update preview URL if needed
      if (onImageSelect) {
        onImageSelect(getSupabaseImageUrl(photoUrl));
      }
    } catch (error) {
      console.error('Error updating main photo:', error);
      toast.error('Ошибка при обновлении фотографии');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию?')) return;

    setLoading(true);
    try {
      // Delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove([photoUrl]);

      if (deleteError) throw deleteError;

      // Update the photos array
      const currentPhotos = Array.isArray(photos) ? photos : [];
      const updatedPhotos = currentPhotos.filter(p => p.url !== photoUrl);
      
      // If we're deleting the main photo, set the first remaining photo as main
      if (updatedPhotos.length > 0 && currentPhotos.find(p => p.url === photoUrl)?.isMain) {
        updatedPhotos[0].isMain = true;
      }

      const { error: updateError } = await supabase
        .from('speakers')
        .update({ photos: updatedPhotos })
        .eq('id', speakerId);

      if (updateError) throw updateError;

      onPhotosUpdate(updatedPhotos);
      
      // Update preview URL if needed
      if (onImageSelect && currentPhotos.find(p => p.url === photoUrl)?.isMain) {
        onImageSelect(updatedPhotos.length > 0 ? getSupabaseImageUrl(updatedPhotos[0].url) : null);
      }
      
      toast.success('Фотография удалена');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фотографии');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (imageUrl: string, path: string) => {
    const currentPhotos = Array.isArray(photos) ? photos : [];
    const newPhoto = { url: path };
    
    // If this is the first photo, make it the main one
    if (currentPhotos.length === 0) {
      newPhoto.isMain = true;
    }
    
    const updatedPhotos = [...currentPhotos, newPhoto];
    
    // Update the speaker record
    supabase
      .from('speakers')
      .update({ photos: updatedPhotos })
      .eq('id', speakerId)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating speaker photos:', error);
          toast.error('Ошибка при обновлении фотографий');
          return;
        }
        
        onPhotosUpdate(updatedPhotos);
        
        // Update preview URL if this is the main photo
        if (newPhoto.isMain && onImageSelect) {
          onImageSelect(imageUrl);
        }
        
        toast.success('Фотография успешно добавлена');
      });
  };

  const safePhotos = Array.isArray(photos) ? photos : [];

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {safePhotos.map((photo, index) => (
          <div 
            key={index} 
            className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
              photo.isMain ? 'border-primary-600' : 'border-transparent'
            }`}
          >
            <img
              src={getSupabaseImageUrl(photo.url)}
              alt={`Фото ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/300?text=Error+loading+image';
              }}
            />
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleSetMainPhoto(photo.url)}
                disabled={loading || photo.isMain}
                className={`p-2 rounded-full ${
                  photo.isMain 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white/90 hover:bg-white text-gray-900'
                }`}
                title={photo.isMain ? 'Основная фотография' : 'Сделать основной'}
              >
                {photo.isMain ? <Star className="h-5 w-5" /> : <StarOff className="h-5 w-5" />}
              </button>
              
              <button
                onClick={() => {
                  setSelectedPhotoForCrop(photo.url);
                  setShowCropper(true);
                }}
                className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-900"
                title="Кадрировать"
              >
                <Crop className="h-5 w-5" />
              </button>

              <button
                onClick={() => setSelectedPhoto(photo.url)}
                className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-900"
                title="Просмотреть"
              >
                <Expand className="h-5 w-5" />
              </button>

              {!photo.isMain && (
                <button
                  onClick={() => handleDeletePhoto(photo.url)}
                  className="p-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white"
                  title="Удалить"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {photo.isMain && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                Основная
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <div className="mt-4">
        <ImageUploadAndCrop
          aspectRatio={1}
          targetWidth={800}
          targetHeight={800}
          storagePathPrefix={`speakers/${speakerId}/`}
          onUploadSuccess={handleUploadSuccess}
          buttonText="Загрузить фото"
          recommendedText="Рекомендуемый размер: 800x800px"
        />
      </div>

      {/* Cropper for existing photos */}
      {showCropper && selectedPhotoForCrop && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Обрезать фотографию</h3>
              <button
                onClick={() => {
                  setShowCropper(false);
                  setSelectedPhotoForCrop(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ImageUploadAndCrop
              aspectRatio={1}
              targetWidth={800}
              targetHeight={800}
              storagePathPrefix={`speakers/${speakerId}/`}
              initialImageUrl={getSupabaseImageUrl(selectedPhotoForCrop)}
              onUploadSuccess={(newUrl, newPath) => {
                // Replace the old photo with the new one
                const updatedPhotos = safePhotos.map(p => 
                  p.url === selectedPhotoForCrop 
                    ? { ...p, url: newPath } 
                    : p
                );
                
                onPhotosUpdate(updatedPhotos);
                
                // Update the speaker record
                supabase
                  .from('speakers')
                  .update({ photos: updatedPhotos })
                  .eq('id', speakerId)
                  .then(({ error }) => {
                    if (error) {
                      console.error('Error updating speaker photos:', error);
                      toast.error('Ошибка при обновлении фотографий');
                      return;
                    }
                    
                    // Update preview URL if this is the main photo
                    if (safePhotos.find(p => p.url === selectedPhotoForCrop)?.isMain && onImageSelect) {
                      onImageSelect(newUrl);
                    }
                    
                    toast.success('Фотография успешно обновлена');
                    setShowCropper(false);
                    setSelectedPhotoForCrop(null);
                  });
              }}
            />
          </div>
        </div>
      )}

      {/* Full-size photo modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          
          <img
            src={getSupabaseImageUrl(selectedPhoto)}
            alt="Полный размер"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default SpeakerPhotoGallery;
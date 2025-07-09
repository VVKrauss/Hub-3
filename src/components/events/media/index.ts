// src/components/events/media/index.ts
// Временный файл для тестирования - только основные экспорты

// Основные компоненты (добавьте по мере создания файлов)
// export { default as EventMediaSection } from './EventMediaSection';
// export { default as EventCoverImageUpload } from './EventCoverImageUpload';
// export { default as EventGalleryUpload } from './EventGalleryUpload';

// Типы и интерфейсы (добавьте когда создадите MediaUploadTypes.ts)
// export type { EventMediaData } from './MediaUploadTypes';

// Временная заглушка для тестирования
export interface EventMediaData {
  coverImage: {
    croppedUrl?: string;
    originalUrl?: string;
  };
  galleryImages: Array<{
    id: string;
    url: string;
  }>;
}

// Временный компонент-заглушка
export const EventMediaSection = ({ eventId, eventSlug, initialMediaData, onMediaDataChange, disabled }: any) => {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Медиафайлы мероприятия</h3>
      <p className="text-gray-600">
        Компонент медиафайлов в разработке...
      </p>
      <div className="mt-4 space-y-2 text-sm text-gray-500">
        <p>Event ID: {eventId}</p>
        <p>Event Slug: {eventSlug}</p>
        <p>Disabled: {disabled ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};
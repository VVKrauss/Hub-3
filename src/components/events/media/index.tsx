// src/components/events/media/index.tsx
import React from 'react';

interface EventMediaSectionProps {
  eventId: string;
  eventSlug: string;
  initialMediaData?: any;
  onMediaDataChange?: (data: any) => void;
  disabled?: boolean;
}

export const EventMediaSection: React.FC<EventMediaSectionProps> = ({ 
  eventId, 
  eventSlug, 
  initialMediaData, 
  onMediaDataChange, 
  disabled 
}) => {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Медиафайлы мероприятия</h3>
      <p className="text-gray-600">
        Здесь будет секция для управления медиафайлами мероприятия.
        Включает в себя изображения, видео и другие медиа-ресурсы.
      </p>
      
      {/* Placeholder content - replace with actual media management functionality */}
      <div className="mt-4 space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Изображения</h4>
          <p className="text-sm text-gray-600">
            Управление галереей изображений мероприятия
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Видео</h4>
          <p className="text-sm text-gray-600">
            Добавление и управление видеоматериалами
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Документы</h4>
          <p className="text-sm text-gray-600">
            Загрузка и управление документами
          </p>
        </div>
      </div>
      
      {disabled && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Редактирование медиафайлов отключено
          </p>
        </div>
      )}
    </div>
  );
};

// Default export для удобства импорта
export default EventMediaSection;
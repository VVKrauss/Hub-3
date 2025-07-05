// src/components/admin/EventSpeakersSection.tsx
// ОБНОВЛЕНО: теперь использует новые sh_ таблицы

import { useState, useEffect, useRef } from 'react';
import { Search, X, User, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSpeakers } from '../../api/speakers';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import type { SpeakerWithSocials } from '../../types/database';

interface EventSpeakersSectionProps {
  selectedSpeakerIds: string[];
  hideSpeakersGallery: boolean;
  onSpeakerToggle: (speakerId: string) => void;
  onHideGalleryChange: (hide: boolean) => void;
}

const EventSpeakersSection = ({
  selectedSpeakerIds,
  hideSpeakersGallery,
  onSpeakerToggle,
  onHideGalleryChange
}: EventSpeakersSectionProps) => {
  const [speakers, setSpeakers] = useState<SpeakerWithSocials[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<SpeakerWithSocials[]>([]);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [speakersError, setSpeakersError] = useState<string | null>(null);
  const [speakerSearchQuery, setSpeakerSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSpeakers();
  }, []);

  useEffect(() => {
    // Update selected speakers when selectedSpeakerIds or speakers list changes
    if (selectedSpeakerIds && selectedSpeakerIds.length > 0 && speakers.length > 0) {
      const selected = speakers.filter(speaker => 
        selectedSpeakerIds.includes(speaker.id)
      );
      setSelectedSpeakers(selected);
    } else {
      setSelectedSpeakers([]);
    }
  }, [selectedSpeakerIds, speakers]);

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSpeakers = async () => {
    try {
      setSpeakersLoading(true);
      setSpeakersError(null);

      console.log('Fetching speakers for event form...');
      
      // Загружаем всех активных спикеров
      const result = await getSpeakers(
        { 
          statuses: ['active'],
          search: speakerSearchQuery || undefined
        }, 
        1, 
        100 // Загружаем достаточно спикеров
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        console.log('Speakers loaded successfully:', result.data.length);
        setSpeakers(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching speakers:', error);
      setSpeakersError(error.message || 'Ошибка при загрузке спикеров');
      toast.error('Ошибка при загрузке спикеров');
    } finally {
      setSpeakersLoading(false);
    }
  };

  // Перезагружаем спикеров при изменении поискового запроса
  useEffect(() => {
    if (speakerSearchQuery.length >= 2 || speakerSearchQuery.length === 0) {
      const timeoutId = setTimeout(() => {
        fetchSpeakers();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [speakerSearchQuery]);

  const toggleSpeaker = (speaker: SpeakerWithSocials) => {
    onSpeakerToggle(speaker.id);
    setShowDropdown(false);
    setSpeakerSearchQuery('');
  };

  const removeSpeaker = (speakerId: string) => {
    onSpeakerToggle(speakerId);
  };

  // Фильтруем доступных спикеров (исключаем уже выбранных)
  const availableSpeakers = speakers.filter(speaker => 
    !selectedSpeakerIds.includes(speaker.id) &&
    (speakerSearchQuery === '' || 
     speaker.name.toLowerCase().includes(speakerSearchQuery.toLowerCase()) ||
     (speaker.field_of_expertise && speaker.field_of_expertise.toLowerCase().includes(speakerSearchQuery.toLowerCase()))
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Спикеры мероприятия
        </h3>
        
        {/* Переключатель скрытия галереи */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={hideSpeakersGallery}
            onChange={(e) => onHideGalleryChange(e.target.checked)}
            className="mr-2 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Скрыть галерею спикеров
          </span>
        </label>
      </div>

      {/* Выбранные спикеры */}
      {selectedSpeakers.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Выбранные спикеры ({selectedSpeakers.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedSpeakers.map(speaker => (
              <div
                key={speaker.id}
                className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 mr-3 flex-shrink-0">
                  {speaker.avatar_url ? (
                    <img
                      src={getSupabaseImageUrl(speaker.avatar_url)}
                      alt={speaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {speaker.name}
                  </p>
                  {speaker.field_of_expertise && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {speaker.field_of_expertise}
                    </p>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => removeSpeaker(speaker.id)}
                  className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Удалить спикера"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Поиск и добавление спикеров */}
      <div className="space-y-4">
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск спикеров для добавления..."
              value={speakerSearchQuery}
              onChange={(e) => {
                setSpeakerSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Выпадающий список спикеров */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {speakersLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка спикеров...</p>
                </div>
              ) : speakersError ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-red-500">{speakersError}</p>
                  <button
                    onClick={fetchSpeakers}
                    className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    Повторить попытку
                  </button>
                </div>
              ) : availableSpeakers.length > 0 ? (
                availableSpeakers.slice(0, 10).map(speaker => (
                  <button
                    key={speaker.id}
                    type="button"
                    onClick={() => toggleSpeaker(speaker)}
                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 mr-3 flex-shrink-0">
                        {speaker.avatar_url ? (
                          <img
                            src={getSupabaseImageUrl(speaker.avatar_url)}
                            alt={speaker.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {speaker.name}
                        </p>
                        {speaker.field_of_expertise && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {speaker.field_of_expertise}
                          </p>
                        )}
                      </div>
                      
                      <Plus className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                  </button>
                ))
              ) : speakerSearchQuery ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Спикеры не найдены по запросу "{speakerSearchQuery}"
                  </p>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Начните вводить имя спикера для поиска
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Галерея всех спикеров */}
      {!hideSpeakersGallery && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Все доступные спикеры ({speakers.filter(s => !selectedSpeakerIds.includes(s.id)).length})
          </h4>
          
          {speakersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Загрузка спикеров...</p>
            </div>
          ) : speakersError ? (
            <div className="text-center py-8 text-red-500">
              <p>{speakersError}</p>
              <button
                onClick={fetchSpeakers}
                className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                Повторить попытку
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {speakers
                .filter(speaker => !selectedSpeakerIds.includes(speaker.id))
                .map(speaker => (
                  <button
                    key={speaker.id}
                    type="button"
                    onClick={() => toggleSpeaker(speaker)}
                    className="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer transition-all duration-200 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 mb-3">
                        {speaker.avatar_url ? (
                          <img
                            src={getSupabaseImageUrl(speaker.avatar_url)}
                            alt={speaker.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                        {speaker.name}
                      </h5>
                      
                      {speaker.field_of_expertise && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {speaker.field_of_expertise}
                        </p>
                      )}
                      
                      <div className="mt-2 inline-flex items-center text-xs text-primary-600 dark:text-primary-400">
                        <Plus className="w-3 h-3 mr-1" />
                        Добавить
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          )}
          
          {speakers.length === 0 && !speakersLoading && !speakersError && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Нет доступных спикеров
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventSpeakersSection;
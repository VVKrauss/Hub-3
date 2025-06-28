// src/components/ui/AvatarSelector.tsx
// Упрощенная версия без лишнего функционала

import { useState, useEffect } from 'react';
import { Check, X, Shuffle, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCachedAvatars, invalidateAvatarCache } from '../../utils/dynamicAvatarUtils';

type AvatarSelectorProps = {
  currentAvatar?: string;
  onAvatarSelect: (avatarUrl: string) => void;
  onClose: () => void;
};

type AvatarFile = {
  name: string;
  url: string;
  id?: string;
};

const AvatarSelector = ({ currentAvatar, onAvatarSelect, onClose }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Состояние для аватаров
  const [availableAvatars, setAvailableAvatars] = useState<AvatarFile[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);
  
  const itemsPerPage = 24; // Удобное количество для сетки 6x4

  // Загрузка аватаров при монтировании
  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      setLoadingAvatars(true);
      setAvatarsError(null);
      
      const avatars = await getCachedAvatars();
      setAvailableAvatars(avatars);
      
      if (avatars.length === 0) {
        setAvatarsError('Аватары не найдены');
      }
    } catch (error) {
      console.error('Failed to load avatars:', error);
      setAvatarsError('Ошибка загрузки аватаров');
    } finally {
      setLoadingAvatars(false);
    }
  };

  const refreshAvatars = async () => {
    invalidateAvatarCache();
    await loadAvatars();
    toast.success('Список аватаров обновлен');
  };

  // Простая пагинация без фильтрации
  const totalPages = Math.ceil(availableAvatars.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAvatars = availableAvatars.slice(startIndex, endIndex);

  const getRandomAvatar = () => {
    if (availableAvatars.length === 0) {
      toast.error('Аватары не загружены');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableAvatars.length);
    const randomAvatar = availableAvatars[randomIndex].url;
    setSelectedAvatar(randomAvatar);
  };

  const handleSave = async () => {
    if (!selectedAvatar) {
      toast.error('Выберите аватар');
      return;
    }

    setLoading(true);
    try {
      await onAvatarSelect(selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Error saving avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const AvatarGridItem = ({ avatar }: { avatar: AvatarFile }) => {
    const isSelected = selectedAvatar === avatar.url;

    return (
      <div className="relative">
        <div
          className={`
            relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 aspect-square
            ${isSelected 
              ? 'ring-4 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-800 scale-105' 
              : 'hover:scale-105 hover:shadow-lg'
            }
          `}
          onClick={() => setSelectedAvatar(avatar.url)}
        >
          <img
            src={avatar.url}
            alt="Аватар"
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '0.5';
            }}
          />
          
          {/* Overlay for selected */}
          {isSelected && (
            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
              <div className="bg-primary-500 text-white rounded-full p-2">
                <Check className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loadingAvatars) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка аватаров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Выбор аватара
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {avatarsError ? (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {avatarsError}
                  </span>
                ) : (
                  `${availableAvatars.length} аватаров`
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAvatars}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Обновить список аватаров"
              >
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          {/* Selected Avatar Preview - Полноразмерный */}
          {selectedAvatar && (
            <div className="text-center mb-6">
              <div className="inline-block relative">
                <div className="w-50 h-50 rounded-xl overflow-hidden border-4 border-primary-500 shadow-lg mb-3" style={{width: '200px', height: '200px'}}>
                  <img
                    src={selectedAvatar}
                    alt="Выбранный аватар"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Выбранный аватар
                </p>
              </div>
            </div>
          )}

          {/* Random Avatar Button */}
          <div className="flex justify-center">
            <button
              onClick={getRandomAvatar}
              disabled={availableAvatars.length === 0}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shuffle className="h-4 w-4" />
              Случайный аватар
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {currentAvatars.length > 0 ? (
              <>
                {/* Avatars Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 mb-6">
                  {currentAvatars.map((avatar) => (
                    <AvatarGridItem key={avatar.url} avatar={avatar} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {currentPage} из {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Аватары не найдены</h3>
                <p className="text-sm">
                  Аватары не загружены или произошла ошибка
                </p>
                {avatarsError && (
                  <button
                    onClick={refreshAvatars}
                    className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !selectedAvatar}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
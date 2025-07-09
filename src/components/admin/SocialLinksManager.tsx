// src/components/admin/SocialLinksManager.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

type SocialPlatform = 'website' | 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'github';

interface SocialLink {
  id?: string;
  speaker_id: string;
  platform: SocialPlatform;
  url: string;
  display_name?: string;
  description?: string;
  is_public: boolean;
  is_primary: boolean;
  display_order: number;
  created_at?: string;
}

interface SocialLinksManagerProps {
  speakerId: string;
  initialLinks?: SocialLink[];
  onUpdate?: (links: SocialLink[]) => void;
}

const SocialLinksManager: React.FC<SocialLinksManagerProps> = ({
  speakerId,
  initialLinks = [],
  onUpdate
}) => {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLinks(initialLinks);
    setHasChanges(false);
  }, [initialLinks]);

  const getSocialIcon = (platform: SocialPlatform) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (platform) {
      case 'website': return <Globe {...iconProps} />;
      case 'linkedin': return <Linkedin {...iconProps} />;
      case 'twitter': return <Twitter {...iconProps} />;
      case 'instagram': return <Instagram {...iconProps} />;
      case 'facebook': return <Facebook {...iconProps} />;
      case 'youtube': return <Youtube {...iconProps} />;
      case 'github': return <Github {...iconProps} />;
      default: return <Globe {...iconProps} />;
    }
  };

  const getPlatformLabel = (platform: SocialPlatform) => {
    const labels = {
      website: 'Веб-сайт',
      linkedin: 'LinkedIn',
      twitter: 'Twitter/X',
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      github: 'GitHub'
    };
    return labels[platform];
  };

  const addLink = () => {
    const newLink: SocialLink = {
      speaker_id: speakerId,
      platform: 'website',
      url: '',
      display_name: '',
      description: '',
      is_public: true,
      is_primary: links.length === 0,
      display_order: links.length
    };
    
    setLinks([...links, newLink]);
    setHasChanges(true);
  };

  const updateLink = (index: number, updates: Partial<SocialLink>) => {
    const updatedLinks = links.map((link, i) => 
      i === index ? { ...link, ...updates } : link
    );
    setLinks(updatedLinks);
    setHasChanges(true);
  };

  const removeLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    // Переназначаем display_order
    const reorderedLinks = updatedLinks.map((link, i) => ({ 
      ...link, 
      display_order: i 
    }));
    setLinks(reorderedLinks);
    setHasChanges(true);
  };

  const setPrimaryLink = (index: number) => {
    const updatedLinks = links.map((link, i) => ({
      ...link,
      is_primary: i === index
    }));
    setLinks(updatedLinks);
    setHasChanges(true);
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === links.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedLinks = [...links];
    
    // Меняем местами
    [updatedLinks[index], updatedLinks[newIndex]] = [updatedLinks[newIndex], updatedLinks[index]];
    
    // Обновляем display_order
    const reorderedLinks = updatedLinks.map((link, i) => ({
      ...link,
      display_order: i
    }));
    
    setLinks(reorderedLinks);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      console.log('Начинаем сохранение социальных ссылок...', { speakerId, links });

      // Фильтруем ссылки с валидными URL
      const validLinks = links.filter(link => link.url.trim());
      console.log('Валидные ссылки:', validLinks);

      // Сначала удаляем все существующие ссылки для этого спикера
      console.log('Удаляем существующие ссылки...');
      const { error: deleteError } = await supabase
        .from('sh_speaker_social_links')
        .delete()
        .eq('speaker_id', speakerId);

      if (deleteError) {
        console.error('Ошибка при удалении:', deleteError);
        throw deleteError;
      }
      console.log('Существующие ссылки удалены');

      // Создаем новые ссылки, если есть
      if (validLinks.length > 0) {
        const linksData = validLinks.map((link, index) => {
          const linkData = {
            speaker_id: speakerId,
            platform: link.platform,
            url: link.url.trim(),
            display_name: link.display_name?.trim() || null,
            description: link.description?.trim() || null,
            is_public: link.is_public,
            is_primary: link.is_primary,
            display_order: index,
            created_at: new Date().toISOString()
          };
          console.log('Подготовленная ссылка:', linkData);
          return linkData;
        });

        console.log('Создаем новые ссылки...', linksData);
        const { data: insertedData, error: insertError } = await supabase
          .from('sh_speaker_social_links')
          .insert(linksData)
          .select();

        if (insertError) {
          console.error('Ошибка при создании:', insertError);
          throw insertError;
        }
        
        console.log('Ссылки созданы:', insertedData);
      }

      toast.success('Социальные ссылки обновлены');
      setHasChanges(false);
      
      // Уведомляем родительский компонент
      if (onUpdate) {
        onUpdate(validLinks);
      }
      
      console.log('Сохранение завершено успешно');
    } catch (error) {
      console.error('Error saving social links:', error);
      toast.error('Ошибка при сохранении ссылок: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => {
    setLinks(initialLinks);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Социальные сети</h3>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <button
                onClick={resetChanges}
                className="text-gray-600 hover:text-gray-800 px-3 py-1 text-sm flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Отменить
              </button>
              <button
                onClick={saveChanges}
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          )}
          <button
            onClick={addLink}
            className="btn-outline text-sm flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Социальные сети не добавлены</p>
          <p className="text-sm mt-1">Нажмите "Добавить" чтобы начать</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div 
              key={index} 
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Платформа</label>
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(index, { platform: e.target.value as SocialPlatform })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="website">Веб-сайт</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">URL *</label>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, { url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Отображаемое имя</label>
                  <input
                    type="text"
                    value={link.display_name || ''}
                    onChange={(e) => updateLink(index, { display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="@username или название"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Описание</label>
                  <input
                    type="text"
                    value={link.description || ''}
                    onChange={(e) => updateLink(index, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Краткое описание"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    {getSocialIcon(link.platform)}
                    <span className="font-medium">{getPlatformLabel(link.platform)}</span>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={link.is_public}
                      onChange={(e) => updateLink(index, { is_public: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Публичная
                  </label>

                  <button
                    onClick={() => setPrimaryLink(index)}
                    className={`text-xs px-2 py-1 rounded ${
                      link.is_primary
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {link.is_primary ? 'Основная' : 'Сделать основной'}
                  </button>

                  {link.url && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Открыть
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveLink(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="Переместить вверх"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLink(index, 'down')}
                      disabled={index === links.length - 1}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="Переместить вниз"
                    >
                      ↓
                    </button>
                  </div>

                  <span className="text-xs text-gray-500 mx-2">#{index + 1}</span>

                  <button
                    onClick={() => removeLink(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Удалить ссылку"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            У вас есть несохраненные изменения. Не забудьте нажать "Сохранить".
          </p>
        </div>
      )}
    </div>
  );
};

export default SocialLinksManager;
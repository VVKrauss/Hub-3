// src/components/admin/CreateSpeakerModal.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ для новой БД
import { useState } from 'react';
import { X, Plus, Trash2, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';

type SpeakerStatus = 'pending' | 'active' | 'inactive';
type SocialPlatform = 'website' | 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'github';

interface SocialLink {
  platform: SocialPlatform;
  url: string;
  display_name?: string;
  description?: string;
  is_public: boolean;
  is_primary: boolean;
  display_order: number;
}

type CreateSpeakerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const CreateSpeakerModal = ({ isOpen, onClose, onSuccess }: CreateSpeakerModalProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'social'>('basic');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    bio: '',
    field_of_expertise: '',
    birth_date: '',
    avatar_url: '',
    private_notes: '',
    status: 'pending' as SpeakerStatus,
    is_featured: false
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Функция для создания slug из имени
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[а-я]/g, (char) => {
        const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
        const en = 'abvgdeejzijklmnoprstufhccss_y_eua';
        const index = ru.indexOf(char);
        return index !== -1 ? en[index] : char;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  const addSocialLink = () => {
    const newLink: SocialLink = {
      platform: 'website',
      url: '',
      display_name: '',
      description: '',
      is_public: true,
      is_primary: socialLinks.length === 0,
      display_order: socialLinks.length
    };
    setSocialLinks([...socialLinks, newLink]);
  };

  const updateSocialLink = (index: number, updates: Partial<SocialLink>) => {
    const updated = socialLinks.map((link, i) => 
      i === index ? { ...link, ...updates } : link
    );
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    // Переназначаем display_order
    const reordered = updated.map((link, i) => ({ ...link, display_order: i }));
    setSocialLinks(reordered);
  };

  const setSocialLinkAsPrimary = (index: number) => {
    const updated = socialLinks.map((link, i) => ({
      ...link,
      is_primary: i === index
    }));
    setSocialLinks(updated);
  };

  const getSocialIcon = (platform: SocialPlatform) => {
    const icons = {
      website: Globe,
      linkedin: Linkedin,
      twitter: Twitter,
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube,
      github: Github
    };
    const Icon = icons[platform];
    return <Icon className="h-4 w-4" />;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      bio: '',
      field_of_expertise: '',
      birth_date: '',
      avatar_url: '',
      private_notes: '',
      status: 'pending',
      is_featured: false
    });
    setSocialLinks([]);
    setActiveTab('basic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      if (!formData.name.trim()) {
        toast.error('Имя спикера обязательно');
        setLoading(false);
        return;
      }

      // Проверяем уникальность slug
      if (formData.slug) {
        const { data: existingSpeaker } = await supabase
          .from('sh_speakers')
          .select('id')
          .eq('slug', formData.slug)
          .single();

        if (existingSpeaker) {
          toast.error('Спикер с таким slug уже существует');
          setLoading(false);
          return;
        }
      }

      // Создаем спикера
      const { data: speaker, error: speakerError } = await supabase
        .from('sh_speakers')
        .insert([{
          ...formData,
          slug: formData.slug || generateSlug(formData.name),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (speakerError) throw speakerError;

      // Создаем социальные ссылки, если есть
      if (socialLinks.length > 0) {
        const socialLinksData = socialLinks
          .filter(link => link.url.trim()) // Только ссылки с URL
          .map(link => ({
            speaker_id: speaker.id,
            platform: link.platform,
            url: link.url.trim(),
            display_name: link.display_name?.trim() || null,
            description: link.description?.trim() || null,
            is_public: link.is_public,
            is_primary: link.is_primary,
            display_order: link.display_order,
            created_at: new Date().toISOString()
          }));

        if (socialLinksData.length > 0) {
          const { error: socialError } = await supabase
            .from('sh_speaker_social_links')
            .insert(socialLinksData);

          if (socialError) throw socialError;
        }
      }

      toast.success('Спикер успешно создан');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating speaker:', error);
      toast.error('Ошибка при создании спикера');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Добавить спикера"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Основная информация
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('social')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'social'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Социальные сети ({socialLinks.length})
            </button>
          </nav>
        </div>

        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="name" className="block font-medium mb-2">
                  Имя *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Введите имя спикера"
                />
              </div>

              <div className="form-group">
                <label htmlFor="slug" className="block font-medium mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="form-input"
                  placeholder="Автоматически из имени"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Используется в URL: /speakers/{formData.slug || 'slug'}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="field_of_expertise" className="block font-medium mb-2">
                  Специализация
                </label>
                <input
                  type="text"
                  id="field_of_expertise"
                  value={formData.field_of_expertise}
                  onChange={(e) => setFormData({ ...formData, field_of_expertise: e.target.value })}
                  className="form-input"
                  placeholder="Например: AI исследователь"
                />
              </div>

              <div className="form-group">
                <label htmlFor="birth_date" className="block font-medium mb-2">
                  Дата рождения
                </label>
                <input
                  type="date"
                  id="birth_date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="status" className="block font-medium mb-2">
                  Статус
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SpeakerStatus })}
                  className="form-input"
                >
                  <option value="pending">На рассмотрении</option>
                  <option value="active">Активный</option>
                  <option value="inactive">Неактивный</option>
                </select>
              </div>

              <div className="form-group">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="font-medium">Рекомендуемый спикер</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio" className="block font-medium mb-2">
                Биография
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="form-input"
                rows={4}
                placeholder="Расскажите о спикере..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatar_url" className="block font-medium mb-2">
                URL аватара
              </label>
              <input
                type="url"
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="form-input"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="form-group">
              <label htmlFor="private_notes" className="block font-medium mb-2">
                Приватные заметки
              </label>
              <textarea
                id="private_notes"
                value={formData.private_notes}
                onChange={(e) => setFormData({ ...formData, private_notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Внутренние заметки (не отображаются публично)"
              />
            </div>
          </div>
        )}

        {/* Social Links Tab */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Социальные сети</h3>
              <button
                type="button"
                onClick={addSocialLink}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Добавить ссылку
              </button>
            </div>

            {socialLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Социальные сети не добавлены</p>
                <p className="text-sm mt-1">Нажмите "Добавить ссылку" чтобы начать</p>
              </div>
            ) : (
              <div className="space-y-4">
                {socialLinks.map((link, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="block font-medium mb-2">Платформа</label>
                        <select
                          value={link.platform}
                          onChange={(e) => updateSocialLink(index, { platform: e.target.value as SocialPlatform })}
                          className="form-input"
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

                      <div className="form-group">
                        <label className="block font-medium mb-2">URL *</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                          className="form-input"
                          placeholder="https://..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="block font-medium mb-2">Отображаемое имя</label>
                        <input
                          type="text"
                          value={link.display_name || ''}
                          onChange={(e) => updateSocialLink(index, { display_name: e.target.value })}
                          className="form-input"
                          placeholder="Например: @username"
                        />
                      </div>

                      <div className="form-group">
                        <label className="block font-medium mb-2">Описание</label>
                        <input
                          type="text"
                          value={link.description || ''}
                          onChange={(e) => updateSocialLink(index, { description: e.target.value })}
                          className="form-input"
                          placeholder="Краткое описание"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={link.is_public}
                            onChange={(e) => updateSocialLink(index, { is_public: e.target.checked })}
                            className="form-checkbox"
                          />
                          <span className="text-sm">Публичная</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setSocialLinkAsPrimary(index)}
                          className={`text-sm px-2 py-1 rounded ${
                            link.is_primary
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {link.is_primary ? 'Основная ссылка' : 'Сделать основной'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSocialLink(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Удалить ссылку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {getSocialIcon(link.platform)}
                      <span>Порядок отображения: {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )} 

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Создание...' : 'Создать спикера'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateSpeakerModal;
// src/pages/admin/AdminSpeakers.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ для новой БД
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit, Eye, User, Trash2, X, Star, Globe, Linkedin, Twitter, Instagram, Facebook, Youtube, Github } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateSpeakerModal from '../../components/admin/CreateSpeakerModal';
import SocialLinksManager from '../../components/admin/SocialLinksManager';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

// Типы для новой БД
type SpeakerStatus = 'pending' | 'active' | 'inactive';

interface SpeakerSocialLink {
  id: string;
  speaker_id: string;
  platform: string;
  url: string;
  display_name?: string;
  description?: string;
  is_public: boolean;
  is_primary: boolean;
  display_order?: number;
  created_at: string;
}

interface Speaker {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  field_of_expertise?: string;
  birth_date?: string;
  avatar_url?: string;
  private_notes?: string;
  status: SpeakerStatus;
  is_featured: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sh_speaker_social_links?: SpeakerSocialLink[];
}

const AdminSpeakers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Speaker>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sh_speakers')
        .select(`
          *,
          sh_speaker_social_links (
            id,
            platform,
            url,
            display_name,
            description,
            is_public,
            is_primary,
            display_order,
            created_at
          )
        `)
        .order('name');

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      toast.error('Ошибка при загрузке спикеров');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSpeaker) return;

    try {
      const { error } = await supabase
        .from('sh_speakers')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSpeaker.id);

      if (error) throw error;

      toast.success('Спикер обновлен');
      fetchSpeakers();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating speaker:', error);
      toast.error('Ошибка при обновлении спикера');
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого спикера? Это действие нельзя отменить.')) {
      return;
    }

    try {
      // Удаляем спикера (социальные ссылки удалятся автоматически по CASCADE)
      const { error } = await supabase
        .from('sh_speakers')
        .delete()
        .eq('id', speakerId);

      if (error) throw error;

      toast.success('Спикер удален');
      fetchSpeakers();
      
      // Закрываем модалку если удаляемый спикер был открыт
      if (selectedSpeaker?.id === speakerId) {
        setIsModalOpen(false);
        setSelectedSpeaker(null);
      }
    } catch (error) {
      console.error('Error deleting speaker:', error);
      toast.error('Ошибка при удалении спикера');
    }
  };

  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (speaker.field_of_expertise && speaker.field_of_expertise.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (speaker.bio && speaker.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: SpeakerStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    const labels = {
      active: 'Активный',
      pending: 'На рассмотрении',
      inactive: 'Неактивный'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'twitter': case 'x': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'github': return <Github className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Управление спикерами
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Всего спикеров: {speakers.length}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Добавить спикера
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Поиск по имени, специализации или биографии..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Speakers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSpeakers.map((speaker) => (
          <div
            key={speaker.id}
            className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-dark-700 relative">
              {speaker.avatar_url ? (
                <img
                  src={getSupabaseImageUrl(speaker.avatar_url)}
                  alt={speaker.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/300?text=No+image';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
              
              {speaker.is_featured && (
                <div className="absolute top-2 left-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                </div>
              )}
              
              <div className="absolute top-2 right-2">
                {getStatusBadge(speaker.status)}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{speaker.name}</h3>
              {speaker.field_of_expertise && (
                <p className="text-primary-600 dark:text-primary-400 text-sm mb-2">
                  {speaker.field_of_expertise}
                </p>
              )}
              
              {speaker.sh_speaker_social_links && speaker.sh_speaker_social_links.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {speaker.sh_speaker_social_links
                    .filter(link => link.is_public)
                    .slice(0, 4)
                    .map((social) => (
                      <div
                        key={social.id}
                        className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full"
                        title={social.display_name || social.platform}
                      >
                        {getSocialIcon(social.platform)}
                      </div>
                    ))}
                  {speaker.sh_speaker_social_links.filter(link => link.is_public).length > 4 && (
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center justify-center w-6 h-6">
                      +{speaker.sh_speaker_social_links.filter(link => link.is_public).length - 4}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedSpeaker(speaker);
                    setIsModalOpen(true);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full"
                  title="Просмотр"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedSpeaker(speaker);
                    setEditForm(speaker);
                    setIsModalOpen(true);
                    setIsEditMode(true);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full"
                  title="Редактировать"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteSpeaker(speaker.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full text-red-600"
                  title="Удалить"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSpeakers.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchQuery ? 'Спикеры не найдены' : 'Нет спикеров'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Начните с добавления первого спикера'}
          </p>
        </div>
      )}

      {/* Create Speaker Modal */}
      <CreateSpeakerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSpeakers}
      />

      {/* View/Edit Modal */}
      {isModalOpen && selectedSpeaker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">
                  {isEditMode ? 'Редактировать спикера' : 'Информация о спикере'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedSpeaker(null);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isEditMode ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="block font-medium mb-2">Имя *</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="block font-medium mb-2">Slug</label>
                      <input
                        type="text"
                        value={editForm.slug || ''}
                        onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                        className="form-input"
                        placeholder="Автоматически из имени"
                      />
                    </div>

                    <div className="form-group">
                      <label className="block font-medium mb-2">Специализация</label>
                      <input
                        type="text"
                        value={editForm.field_of_expertise || ''}
                        onChange={e => setEditForm({ ...editForm, field_of_expertise: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="block font-medium mb-2">Дата рождения</label>
                      <input
                        type="date"
                        value={editForm.birth_date || ''}
                        onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="block font-medium mb-2">Статус</label>
                      <select
                        value={editForm.status || 'pending'}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value as SpeakerStatus })}
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
                          checked={editForm.is_featured || false}
                          onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                          className="form-checkbox"
                        />
                        <span className="font-medium">Рекомендуемый спикер</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">Биография</label>
                    <textarea
                      value={editForm.bio || ''}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      className="form-input"
                      rows={6}
                      placeholder="Расскажите о спикере..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">URL аватара</label>
                    <input
                      type="url"
                      value={editForm.avatar_url || ''}
                      onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })}
                      className="form-input"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">Приватные заметки</label>
                    <textarea
                      value={editForm.private_notes || ''}
                      onChange={e => setEditForm({ ...editForm, private_notes: e.target.value })}
                      className="form-input"
                      rows={3}
                      placeholder="Внутренние заметки (не отображаются публично)"
                    />
                  </div>

                  {/* Социальные ссылки */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <SocialLinksManager
                      speakerId={selectedSpeaker.id}
                      initialLinks={selectedSpeaker.sh_speaker_social_links || []}
                      onUpdate={(updatedLinks) => {
                        setSelectedSpeaker({
                          ...selectedSpeaker,
                          sh_speaker_social_links: updatedLinks
                        });
                        // Обновляем список спикеров
                        fetchSpeakers();
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn-primary"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                      {selectedSpeaker.avatar_url ? (
                        <img
                          src={getSupabaseImageUrl(selectedSpeaker.avatar_url)}
                          alt={selectedSpeaker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700 rounded-lg">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-semibold">{selectedSpeaker.name}</h4>
                        {selectedSpeaker.is_featured && (
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        )}
                        {getStatusBadge(selectedSpeaker.status)}
                      </div>
                      {selectedSpeaker.field_of_expertise && (
                        <p className="text-primary-600 dark:text-primary-400 mb-2">
                          {selectedSpeaker.field_of_expertise}
                        </p>
                      )}
                      {selectedSpeaker.bio && (
                        <p className="text-dark-600 dark:text-dark-300 mb-4">
                          {selectedSpeaker.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedSpeaker.sh_speaker_social_links && selectedSpeaker.sh_speaker_social_links.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-3">Социальные сети</h5>
                      <div className="grid gap-2">
                        {selectedSpeaker.sh_speaker_social_links
                          .filter(link => link.is_public)
                          .map((social) => (
                            <div key={social.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              {getSocialIcon(social.platform)}
                              <div className="flex-1">
                                <div className="font-medium">
                                  {social.display_name || social.platform}
                                  {social.is_primary && (
                                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                      Основная
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={social.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {social.url}
                                </a>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-2">Дата рождения</h5>
                      <p>{selectedSpeaker.birth_date || 'Не указана'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Создан</h5>
                      <p>{new Date(selectedSpeaker.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>

                  {selectedSpeaker.private_notes && (
                    <div>
                      <h5 className="font-medium mb-2">Приватные заметки</h5>
                      <p className="text-gray-600 dark:text-gray-400">{selectedSpeaker.private_notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setIsEditMode(true);
                        setEditForm(selectedSpeaker);
                      }}
                      className="btn-primary"
                    >
                      Редактировать
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpeakers;
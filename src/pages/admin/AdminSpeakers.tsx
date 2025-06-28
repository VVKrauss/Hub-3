import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Edit, Eye, User, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateSpeakerModal from '../../components/admin/CreateSpeakerModal';
import SpeakerPhotoGallery from '../../components/admin/SpeakerPhotoGallery';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Speaker = {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  date_of_birth: string | null;
  photos: { url: string }[];
  contact_info: any;
  blogs: any[];
  blog_visibility: any;
  google_drive_link: string | null;
  active: boolean;
};

const AdminSpeakers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Speaker>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      toast.error('Failed to load speakers');
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('speakers')
        .update(editForm)
        .eq('id', selectedSpeaker?.id);

      if (error) throw error;

      toast.success('Speaker updated successfully');
      fetchSpeakers();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating speaker:', error);
      toast.error('Failed to update speaker');
    }
  };

  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.field_of_expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteSpeaker = async (speakerId: string) => {
      if (!confirm('Вы уверены, что хотите удалить этого спикера? Это действие нельзя отменить.')) {
        return;
      }
    
      try {
        // Delete speaker's photos from storage
        const speaker = speakers.find(s => s.id === speakerId);
        const photosToDelete = Array.isArray(speaker?.photos) ? speaker.photos : [];

        if (photosToDelete.length) {
          const { error: storageError } = await supabase.storage
            .from('images')
            .remove(photosToDelete.map(p => p.url));
          
          if (storageError) throw storageError;
        }
    
        // Delete speaker from database
        const { error: dbError } = await supabase
          .from('speakers')
          .delete()
          .eq('id', speakerId);
    
        if (dbError) throw dbError;
    
        toast.success('Спикер успешно удален');
        fetchSpeakers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting speaker:', error);
        toast.error('Ошибка при удалении спикера');
      }
    };
    
    // Add delete button to speaker card actions
    

  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Управление спикерами</h2>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Добавить спикера
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск спикеров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSpeakers.map(speaker => (
          <div key={speaker.id} className="card hover:shadow-lg">
            <div className="relative aspect-square">
              {speaker.photos?.[0]?.url ? (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos[0].url}`}
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
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{speaker.name}</h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm mb-4">
                {speaker.field_of_expertise}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedSpeaker(speaker);
                    setIsModalOpen(true);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full"
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

      {/* Create Speaker Modal */}
      <CreateSpeakerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSpeakers}
      />

      {/* Edit/View Modal */}
      {isModalOpen && selectedSpeaker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <div className="form-group">
                    <label className="block font-medium mb-2">Фотографии</label>
                    <SpeakerPhotoGallery
                      speakerId={selectedSpeaker.id}
                      photos={selectedSpeaker.photos || []}
                      onPhotosUpdate={(updatedPhotos) => {
                        setSelectedSpeaker({
                          ...selectedSpeaker,
                          photos: updatedPhotos
                        });
                        setEditForm({
                          ...editForm,
                          photos: updatedPhotos
                        });
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">Имя</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="form-input"
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
                    <label className="block font-medium mb-2">Описание</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">Дата рождения</label>
                    <input
                      type="date"
                      value={editForm.date_of_birth || ''}
                      onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="block font-medium mb-2">Google Drive</label>
                    <input
                      type="url"
                      value={editForm.google_drive_link || ''}
                      onChange={e => setEditForm({ ...editForm, google_drive_link: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                        className="form-checkbox"
                      />
                      <span className="font-medium">Активный спикер</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        setEditForm(selectedSpeaker);
                      }}
                      className="btn-outline"
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
                  <div className="flex items-start gap-6">
                    <div className="w-32 h-32 flex-shrink-0">
                      {selectedSpeaker.photos?.[0]?.url ? (
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${selectedSpeaker.photos[0].url}`}
                          alt={selectedSpeaker.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700 rounded-lg">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{selectedSpeaker.name}</h4>
                      <p className="text-primary-600 dark:text-primary-400 mb-4">
                        {selectedSpeaker.field_of_expertise}
                      </p>
                      <p className="text-dark-600 dark:text-dark-300">
                        {selectedSpeaker.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-2">Дата рождения</h5>
                      <p>{selectedSpeaker.date_of_birth || 'Не указана'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Статус</h5>
                      <p>{selectedSpeaker.active ? 'Активный' : 'Неактивный'}</p>
                    </div>
                  </div>

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

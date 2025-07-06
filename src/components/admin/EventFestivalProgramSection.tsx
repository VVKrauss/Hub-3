import { useState, useRef } from 'react';
import { Calendar, Clock, Users, Plus, Edit, Trash2, X, Check, ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Используем единый экземпляр
import { toast } from 'react-hot-toast';

type Speaker = {
  id: string;
  name: string;
  field_of_expertise: string;
  photos: { url: string; isMain?: boolean }[];
  active: boolean;
};

type FestivalProgramItem = {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
};

interface EventFestivalProgramSectionProps {
  eventType: string;
  festivalProgram: FestivalProgramItem[] | undefined;
  allSpeakers: Speaker[];
  onFestivalProgramChange: (program: FestivalProgramItem[]) => void;
}

const EventFestivalProgramSection = ({
  eventType,
  festivalProgram = [],
  allSpeakers,
  onFestivalProgramChange
}: EventFestivalProgramSectionProps) => {
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [currentProgramItem, setCurrentProgramItem] = useState<FestivalProgramItem>({
    title: '',
    description: '',
    image_url: '',
    start_time: '',
    end_time: '',
    lecturer_id: ''
  });
  const [programPreviewUrl, setProgramPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Skip rendering if not a festival
  if (eventType !== 'Festival') {
    return null;
  }

  const handleAddProgramItem = () => {
    if (!currentProgramItem.title || !currentProgramItem.start_time || !currentProgramItem.end_time) {
      toast.error('Заполните обязательные поля программы');
      return;
    }

    const updatedProgram = [...(festivalProgram || [])];
    
    if (editingProgramIndex !== null) {
      updatedProgram[editingProgramIndex] = currentProgramItem;
    } else {
      updatedProgram.push(currentProgramItem);
    }
    
    onFestivalProgramChange(updatedProgram);

    setCurrentProgramItem({
      title: '',
      description: '',
      image_url: '',
      start_time: '',
      end_time: '',
      lecturer_id: ''
    });
    setEditingProgramIndex(null);
    setShowProgramForm(false);
    setProgramPreviewUrl(null);
  };

  const handleEditProgramItem = (index: number) => {
    if (!festivalProgram) return;
    
    setCurrentProgramItem(festivalProgram[index]);
    setEditingProgramIndex(index);
    setShowProgramForm(true);
    
    if (festivalProgram[index].image_url) {
      setProgramPreviewUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${festivalProgram[index].image_url}`);
    } else {
      setProgramPreviewUrl(null);
    }
  };

  const handleDeleteProgramItem = (index: number) => {
    const updatedProgram = [...(festivalProgram || [])];
    updatedProgram.splice(index, 1);
    onFestivalProgramChange(updatedProgram);
  };

  const handleImageUpload = async (file: File) => {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `festival-program-${timestamp}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Update program item with image URL
      setCurrentProgramItem({
        ...currentProgramItem,
        image_url: data.path
      });

      // Set preview URL
      setProgramPreviewUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${data.path}`);

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка загрузки изображения');
    }
  };

  const activeSpeakers = allSpeakers?.filter(s => s.active) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Программа фестиваля
        </h3>
        <button
          type="button"
          onClick={() => {
            setCurrentProgramItem({
              title: '',
              description: '',
              image_url: '',
              start_time: '',
              end_time: '',
              lecturer_id: ''
            });
            setEditingProgramIndex(null);
            setShowProgramForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить пункт
        </button>
      </div>

      {showProgramForm && (
        <div className="bg-gray-50 dark:bg-dark-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingProgramIndex !== null ? 'Редактирование пункта программы' : 'Новый пункт программы'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Название <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={currentProgramItem.title}
                onChange={(e) => setCurrentProgramItem({...currentProgramItem, title: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                placeholder="Название пункта программы"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Время начала <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={currentProgramItem.start_time}
                  onChange={(e) => setCurrentProgramItem({...currentProgramItem, start_time: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Время окончания <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={currentProgramItem.end_time}
                  onChange={(e) => setCurrentProgramItem({...currentProgramItem, end_time: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Спикер
              </label>
              <select
                value={currentProgramItem.lecturer_id}
                onChange={(e) => setCurrentProgramItem({...currentProgramItem, lecturer_id: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
              >
                <option value="">Выберите спикера</option>
                {activeSpeakers.map((speaker) => (
                  <option key={speaker.id} value={speaker.id}>
                    {speaker.name} - {speaker.field_of_expertise}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={currentProgramItem.description}
                onChange={(e) => setCurrentProgramItem({...currentProgramItem, description: e.target.value})}
                rows={3}
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                placeholder="Описание пункта программы"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Изображение
              </label>
              <div className="space-y-4">
                {programPreviewUrl && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden">
                    <img
                      src={programPreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProgramPreviewUrl(null);
                        setCurrentProgramItem({...currentProgramItem, image_url: ''});
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-dark-600 dark:bg-dark-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG или WEBP (макс. 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddProgramItem}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {editingProgramIndex !== null ? 'Сохранить изменения' : 'Добавить пункт'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowProgramForm(false);
                  setCurrentProgramItem({
                    title: '',
                    description: '',
                    image_url: '',
                    start_time: '',
                    end_time: '',
                    lecturer_id: ''
                  });
                  setEditingProgramIndex(null);
                  setProgramPreviewUrl(null);
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {festivalProgram && festivalProgram.length > 0 ? (
        <div className="space-y-4">
          {festivalProgram.map((item, index) => {
            const speaker = activeSpeakers.find(s => s.id === item.lecturer_id);
            
            return (
              <div key={index} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {item.image_url && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 float-right ml-4">
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${item.image_url}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{item.start_time} - {item.end_time}</span>
                      </div>
                      {speaker && (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{speaker.name}</span>
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditProgramItem(index)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProgramItem(index)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 dark:bg-dark-700 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 dark:bg-dark-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Нет пунктов программы</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Добавьте пункты, чтобы создать программу фестиваля
          </p>
          <button
            type="button"
            onClick={() => {
              setCurrentProgramItem({
                title: '',
                description: '',
                image_url: '',
                start_time: '',
                end_time: '',
                lecturer_id: ''
              });
              setEditingProgramIndex(null);
              setShowProgramForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Добавить первый пункт
          </button>
        </div>
      )}
    </div>
  );
};

export default EventFestivalProgramSection;
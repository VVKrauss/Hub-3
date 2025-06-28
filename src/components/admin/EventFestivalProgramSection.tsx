import { useState, useRef } from 'react';
import { Calendar, Clock, Users, Plus, Edit, Trash2, X, Check, ImageIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `program-images/${timestamp}.${fileExt}`;

      // Upload image
      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      // Update program item
      setCurrentProgramItem(prev => ({
        ...prev,
        image_url: filePath
      }));

      // Set preview URL
      setProgramPreviewUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${filePath}`);

      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading program image:', error);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl mr-4">
            <Calendar className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Программа фестиваля</h2>
            <p className="text-gray-500 dark:text-gray-400">Добавьте пункты программы</p>
          </div>
        </div>
        
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
            setProgramPreviewUrl(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Добавить пункт
        </button>
      </div>
      
      {showProgramForm ? (
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
                Спикер
              </label>
              <select
                value={currentProgramItem.lecturer_id}
                onChange={(e) => setCurrentProgramItem({...currentProgramItem, lecturer_id: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
              >
                <option value="">Выберите спикера</option>
                {allSpeakers.map(speaker => (
                  <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Изображение
              </label>
              
              {programPreviewUrl ? (
                <div className="relative">
                  <img
                    src={programPreviewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white/90 hover:bg-white text-dark-800 rounded-full shadow-lg"
                      title="Изменить изображение"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentProgramItem({...currentProgramItem, image_url: ''});
                        setProgramPreviewUrl(null);
                      }}
                      className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg"
                      title="Удалить изображение"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    <div className="mb-3 p-2 bg-gray-100 dark:bg-dark-700 rounded-full">
                      <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors text-sm"
                    >
                      Загрузить изображение
                    </button>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Рекомендуемый размер: 800x600px
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
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
                  setProgramPreviewUrl(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddProgramItem}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {editingProgramIndex !== null ? 'Сохранить изменения' : 'Добавить пункт'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      
      {festivalProgram && festivalProgram.length > 0 ? (
        <div className="space-y-4">
          {festivalProgram.map((item, index) => {
            const speaker = allSpeakers.find(s => s.id === item.lecturer_id);
            
            return (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${item.image_url}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
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
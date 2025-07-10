import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Loader2, 
  Info, 
  Users, 
  Heart,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Plus, 
  X, 
  Upload,
  Trash2,
  Edit3
} from 'lucide-react';

// === ТИПЫ ===
interface TeamMember {
  name: string;
  role: string;
  photo: string;
}

interface Contributor {
  name: string;
  photo: string;
}

interface SupportPlatform {
  url: string;
  platform: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

interface AboutData {
  id?: number;
  project_info: string;
  team_members: TeamMember[];
  contributors: Contributor[];
  support_platforms: SupportPlatform[];
  contact_info: ContactInfo;
  created_at?: string;
  updated_at?: string;
}

// === КОМПОНЕНТЫ ===

// Компонент управления командой
const TeamManager: React.FC<{
  teamMembers: TeamMember[];
  onChange: (members: TeamMember[]) => void;
}> = ({ teamMembers, onChange }) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addMember = () => {
    const newMember: TeamMember = {
      name: '',
      role: '',
      photo: ''
    };
    onChange([...teamMembers, newMember]);
  };

  const updateMember = (index: number, updates: Partial<TeamMember>) => {
    const updatedMembers = teamMembers.map((member, i) => 
      i === index ? { ...member, ...updates } : member
    );
    onChange(updatedMembers);
  };

  const removeMember = (index: number) => {
    onChange(teamMembers.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (index: number, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      setUploading(index);
      
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `team-${timestamp}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`about/team/${fileName}`, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(`about/team/${fileName}`);

      updateMember(index, { photo: publicUrlData.publicUrl });
      toast.success('Фото загружено');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhoto(index, file);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={addMember}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить участника команды
      </button>

      <div className="space-y-4">
        {teamMembers.map((member, index) => (
          <div key={index} className="border dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg">Участник команды #{index + 1}</h3>
              <button
                onClick={() => removeMember(index)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Имя *</label>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Введите имя"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Роль *</label>
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) => updateMember(index, { role: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Введите роль"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Фото</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={el => fileInputRefs.current[index] = el}
                    onChange={(e) => handleFileChange(index, e)}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={uploading === index}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg hover:border-primary-500 transition-colors disabled:opacity-50"
                  >
                    {uploading === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading === index ? 'Загрузка...' : 'Загрузить фото'}
                  </button>
                  
                  {member.photo && (
                    <div className="relative">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => updateMember(index, { photo: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {teamMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет участников команды. Добавьте первого участника.
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент управления помощниками (похож на TeamManager, но проще)
const ContributorsManager: React.FC<{
  contributors: Contributor[];
  onChange: (contributors: Contributor[]) => void;
}> = ({ contributors, onChange }) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addContributor = () => {
    onChange([...contributors, { name: '', photo: '' }]);
  };

  const updateContributor = (index: number, updates: Partial<Contributor>) => {
    const updated = contributors.map((contributor, i) => 
      i === index ? { ...contributor, ...updates } : contributor
    );
    onChange(updated);
  };

  const removeContributor = (index: number) => {
    onChange(contributors.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (index: number, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      setUploading(index);
      
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `contributor-${timestamp}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`about/contributor/${fileName}`, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(`about/contributor/${fileName}`);

      updateContributor(index, { photo: publicUrlData.publicUrl });
      toast.success('Фото загружено');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhoto(index, file);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={addContributor}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить помощника
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contributors.map((contributor, index) => (
          <div key={index} className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">Помощник #{index + 1}</h4>
              <button
                onClick={() => removeContributor(index)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Удалить"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Имя *</label>
                <input
                  type="text"
                  value={contributor.name}
                  onChange={(e) => updateContributor(index, { name: e.target.value })}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-sm"
                  placeholder="Введите имя"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Фото</label>
                <input
                  type="file"
                  ref={el => fileInputRefs.current[index] = el}
                  onChange={(e) => handleFileChange(index, e)}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRefs.current[index]?.click()}
                  disabled={uploading === index}
                  className="w-full flex items-center justify-center gap-2 p-2 border border-dashed rounded hover:border-primary-500 transition-colors disabled:opacity-50 text-sm"
                >
                  {uploading === index ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {uploading === index ? 'Загрузка...' : 'Загрузить'}
                </button>
                
                {contributor.photo && (
                  <div className="relative mt-2">
                    <img
                      src={contributor.photo}
                      alt={contributor.name}
                      className="w-16 h-16 object-cover rounded-lg mx-auto"
                    />
                    <button
                      onClick={() => updateContributor(index, { photo: '' })}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {contributors.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Нет помощников. Добавьте первого помощника.
        </div>
      )}
    </div>
  );
};

// Компонент управления платформами поддержки
const SupportPlatformsManager: React.FC<{
  platforms: SupportPlatform[];
  onChange: (platforms: SupportPlatform[]) => void;
}> = ({ platforms, onChange }) => {
  const addPlatform = () => {
    onChange([...platforms, { url: '', platform: '' }]);
  };

  const updatePlatform = (index: number, updates: Partial<SupportPlatform>) => {
    const updated = platforms.map((platform, i) => 
      i === index ? { ...platform, ...updates } : platform
    );
    onChange(updated);
  };

  const removePlatform = (index: number) => {
    onChange(platforms.filter((_, i) => i !== index));
  };

  const availablePlatforms = ['Patreon', 'Boosty', 'PayPal', 'Яндекс.Деньги', 'Сбер', 'Другое'];

  return (
    <div className="space-y-6">
      <button
        onClick={addPlatform}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить платформу
      </button>

      <div className="space-y-4">
        {platforms.map((platform, index) => (
          <div key={index} className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">Платформа #{index + 1}</h4>
              <button
                onClick={() => removePlatform(index)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Платформа *</label>
                <select
                  value={platform.platform}
                  onChange={(e) => updatePlatform(index, { platform: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  required
                >
                  <option value="">Выберите платформу</option>
                  {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">URL *</label>
                <input
                  type="url"
                  value={platform.url}
                  onChange={(e) => updatePlatform(index, { url: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="https://..."
                  required
                />
              </div>
            </div>
          </div>
        ))}
        
        {platforms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет платформ поддержки. Добавьте первую платформу.
          </div>
        )}
      </div>
    </div>
  );
};

// === ОСНОВНОЙ КОМПОНЕНТ ===
const AdminAbout = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aboutData, setAboutData] = useState<AboutData>({
    project_info: '',
    team_members: [],
    contributors: [],
    support_platforms: [],
    contact_info: {
      email: '',
      phone: '',
      address: ''
    }
  });

  useEffect(() => {
    loadAboutData();
  }, []);

  const loadAboutData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('about_table')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Нет данных, используем дефолтные
          console.log('No about data found, using defaults');
        } else {
          throw error;
        }
      } else {
        setAboutData(data);
      }
    } catch (err) {
      console.error('Error loading about data:', err);
      toast.error('Не удалось загрузить данные страницы "О нас"');
    } finally {
      setLoading(false);
    }
  };

  const saveAboutData = async () => {
    try {
      setSaving(true);
      
      // Проверяем, есть ли уже запись
      const { data: existingData } = await supabase
        .from('about_table')
        .select('id')
        .limit(1)
        .single();
      
      if (existingData) {
        // Обновляем существующую запись
        const { error } = await supabase
          .from('about_table')
          .update(aboutData)
          .eq('id', existingData.id);
          
        if (error) throw error;
      } else {
        // Создаем новую запись
        const { error } = await supabase
          .from('about_table')
          .insert([aboutData]);
          
        if (error) throw error;
      }
      
      toast.success('Страница "О нас" успешно сохранена');
    } catch (err) {
      console.error('Error saving about data:', err);
      toast.error('Ошибка при сохранении данных');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4">
            Управление страницей "О нас"
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Настройте информацию о проекте, команде и способах поддержки
          </p>
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-center mb-8">
          <button
            onClick={saveAboutData}
            disabled={saving}
            className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Сохранить изменения
              </>
            )}
          </button>
        </div>

        <div className="space-y-8">
          {/* Основная информация о проекте */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl mr-4">
                <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Информация о проекте</h2>
                <p className="text-gray-500 dark:text-gray-400">Основное описание Science Hub</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Описание проекта *
              </label>
              <textarea
                value={aboutData.project_info}
                onChange={(e) => setAboutData(prev => ({ ...prev, project_info: e.target.value }))}
                rows={8}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                placeholder="Введите подробное описание проекта Science Hub..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Поддерживается HTML-разметка. Можно использовать теги &lt;p&gt;, &lt;strong&gt;, &lt;em&gt; и другие.
              </p>
            </div>
          </div>

          {/* Команда */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl mr-4">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Наша команда</h2>
                <p className="text-gray-500 dark:text-gray-400">Основатели и участники проекта</p>
              </div>
            </div>
            
            <TeamManager
              teamMembers={aboutData.team_members}
              onChange={(team_members) => setAboutData(prev => ({ ...prev, team_members }))}
            />
          </div>

          {/* Помощники */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl mr-4">
                <Heart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Нам помогают</h2>
                <p className="text-gray-500 dark:text-gray-400">Люди, которые поддерживают проект</p>
              </div>
            </div>
            
            <ContributorsManager
              contributors={aboutData.contributors}
              onChange={(contributors) => setAboutData(prev => ({ ...prev, contributors }))}
            />
          </div>

          {/* Платформы поддержки */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl mr-4">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Поддержать проект</h2>
                <p className="text-gray-500 dark:text-gray-400">Платформы для финансовой поддержки</p>
              </div>
            </div>
            
            <SupportPlatformsManager
              platforms={aboutData.support_platforms}
              onChange={(support_platforms) => setAboutData(prev => ({ ...prev, support_platforms }))}
            />
          </div>

          {/* Контактная информация */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl mr-4">
                <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Контактная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Как с нами связаться</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  value={aboutData.contact_info.email}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, email: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="sciencehubrs@gmail.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Телефон *
                </label>
                <input
                  type="tel"
                  value={aboutData.contact_info.phone}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, phone: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+381 629434798"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Адрес *
                </label>
                <input
                  type="text"
                  value={aboutData.contact_info.address}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, address: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Sarajevska 48, Belgrade"
                  required
                />
              </div>
            </div>
          </div>

          {/* Статистика и предварительный просмотр */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-2xl p-8 border border-primary-200 dark:border-primary-700">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              📊 Статистика страницы
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {aboutData.team_members.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Участников команды</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {aboutData.contributors.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Помощников</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {aboutData.support_platforms.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Платформ поддержки</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {aboutData.project_info.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Символов в описании</div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4">
              <a
                href="/about"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                Предварительный просмотр
              </a>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
                <Users className="w-4 h-4" />
                Страница активна
              </div>
            </div>
          </div>

          {/* Плавающая кнопка сохранения для мобильных устройств */}
          <div className="fixed bottom-6 right-6 md:hidden">
            <button
              onClick={saveAboutData}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Save className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAbout;
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Upload, 
  User, 
  Users, 
  Heart, 
  Mail, 
  Phone, 
  MapPin,
  Plus,
  Trash2,
  Edit,
  Link as LinkIcon
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type TeamMember = {
  name: string;
  role: string;
  photo: string;
};

type Contributor = {
  name: string;
  photo: string;
};

type SupportPlatform = {
  url: string;
  platform: string;
};

type ContactInfo = {
  email: string;
  phone: string;
  address: string;
};

type AboutData = {
  id?: number;
  project_info: string;
  team_members: TeamMember[];
  contributors: Contributor[];
  support_platforms: SupportPlatform[];
  contact_info: ContactInfo;
};

const AdminAbout = () => {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<number | null>(null);
  const [editingContributor, setEditingContributor] = useState<number | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<number | null>(null);
  const [newTeamMember, setNewTeamMember] = useState<TeamMember>({ name: '', role: '', photo: '' });
  const [newContributor, setNewContributor] = useState<Contributor>({ name: '', photo: '' });
  const [newPlatform, setNewPlatform] = useState<SupportPlatform>({ url: '', platform: '' });

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('about_table')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAboutData({
          id: data.id,
          project_info: data.project_info || '',
          team_members: data.team_members || [],
          contributors: data.contributors || [],
          support_platforms: data.support_platforms || [],
          contact_info: data.contact_info || { email: '', phone: '', address: '' }
        });
      }
    } catch (error) {
      console.error('Error fetching about data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dataToSave = {
        project_info: aboutData.project_info,
        team_members: aboutData.team_members,
        contributors: aboutData.contributors,
        support_platforms: aboutData.support_platforms,
        contact_info: aboutData.contact_info
      };

      if (aboutData.id) {
        // Обновляем существующую запись
        const { error } = await supabase
          .from('about_table')
          .update(dataToSave)
          .eq('id', aboutData.id);

        if (error) throw error;
      } else {
        // Создаем новую запись
        const { data, error } = await supabase
          .from('about_table')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        setAboutData(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Данные сохранены успешно');
    } catch (error) {
      console.error('Error saving about data:', error);
      toast.error('Ошибка при сохранении данных');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'team' | 'contributor', index?: number) => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${timestamp}.${fileExt}`;
      const filePath = `about/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${filePath}`;

      if (type === 'team' && index !== undefined) {
        const updatedMembers = [...aboutData.team_members];
        updatedMembers[index].photo = imageUrl;
        setAboutData(prev => ({ ...prev, team_members: updatedMembers }));
      } else if (type === 'contributor' && index !== undefined) {
        const updatedContributors = [...aboutData.contributors];
        updatedContributors[index].photo = imageUrl;
        setAboutData(prev => ({ ...prev, contributors: updatedContributors }));
      }

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  const addTeamMember = () => {
    if (!newTeamMember.name || !newTeamMember.role) {
      toast.error('Заполните имя и роль');
      return;
    }

    setAboutData(prev => ({
      ...prev,
      team_members: [...prev.team_members, { ...newTeamMember }]
    }));
    setNewTeamMember({ name: '', role: '', photo: '' });
  };

  const addContributor = () => {
    if (!newContributor.name) {
      toast.error('Заполните имя');
      return;
    }

    setAboutData(prev => ({
      ...prev,
      contributors: [...prev.contributors, { ...newContributor }]
    }));
    setNewContributor({ name: '', photo: '' });
  };

  const addPlatform = () => {
    if (!newPlatform.url || !newPlatform.platform) {
      toast.error('Заполните URL и название платформы');
      return;
    }

    setAboutData(prev => ({
      ...prev,
      support_platforms: [...prev.support_platforms, { ...newPlatform }]
    }));
    setNewPlatform({ url: '', platform: '' });
  };

  const removeTeamMember = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const removeContributor = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      contributors: prev.contributors.filter((_, i) => i !== index)
    }));
  };

  const removePlatform = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      support_platforms: prev.support_platforms.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 dark:bg-dark-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Управление страницей "О нас"</h1>
            <p className="text-dark-600 dark:text-dark-400 mt-1">
              Настройте информацию о проекте, команде и контактах
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Информация о проекте */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Информация о проекте</h2>
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Описание проекта (HTML)
            </label>
            <textarea
              value={aboutData.project_info}
              onChange={(e) => setAboutData(prev => ({ ...prev, project_info: e.target.value }))}
              rows={8}
              className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Введите описание проекта (можно использовать HTML)"
            />
          </div>
        </div>

        {/* Команда */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Команда проекта</h2>
          
          {/* Список участников команды */}
          <div className="space-y-4 mb-6">
            {aboutData.team_members.map((member, index) => (
              <div key={index} className="border border-dark-300 dark:border-dark-600 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-dark-100 dark:bg-dark-700 flex items-center justify-center">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-dark-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-dark-900 dark:text-white">{member.name}</h3>
                    <p className="text-dark-600 dark:text-dark-400">{member.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) await handleImageUpload(file, 'team', index);
                        };
                        input.click();
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeTeamMember(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Добавление нового участника */}
          <div className="border-t border-dark-200 dark:border-dark-700 pt-6">
            <h3 className="font-medium text-dark-900 dark:text-white mb-4">Добавить участника команды</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Имя"
                value={newTeamMember.name}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                className="p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="Роль"
                value={newTeamMember.role}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
                className="p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
              />
              <button
                onClick={addTeamMember}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>
        </div>

        {/* Контрибьюторы */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Контрибьюторы</h2>
          
          {/* Список контрибьюторов */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {aboutData.contributors.map((contributor, index) => (
              <div key={index} className="border border-dark-300 dark:border-dark-600 rounded-lg p-4 text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-dark-100 dark:bg-dark-700 flex items-center justify-center mx-auto mb-2">
                  {contributor.photo ? (
                    <img src={contributor.photo} alt={contributor.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-dark-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-dark-900 dark:text-white mb-2">{contributor.name}</p>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) await handleImageUpload(file, 'contributor', index);
                      };
                      input.click();
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeContributor(index)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Добавление нового контрибьютора */}
          <div className="border-t border-dark-200 dark:border-dark-700 pt-6">
            <h3 className="font-medium text-dark-900 dark:text-white mb-4">Добавить контрибьютора</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Имя"
                value={newContributor.name}
                onChange={(e) => setNewContributor(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
              />
              <button
                onClick={addContributor}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>
        </div>

        {/* Платформы поддержки */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Платформы поддержки</h2>
          
          {/* Список платформ */}
          <div className="space-y-4 mb-6">
            {aboutData.support_platforms.map((platform, index) => (
              <div key={index} className="border border-dark-300 dark:border-dark-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{platform.platform}</p>
                      <p className="text-sm text-dark-600 dark:text-dark-400">{platform.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removePlatform(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Добавление новой платформы */}
          <div className="border-t border-dark-200 dark:border-dark-700 pt-6">
            <h3 className="font-medium text-dark-900 dark:text-white mb-4">Добавить платформу</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Название платформы"
                value={newPlatform.platform}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, platform: e.target.value }))}
                className="p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
              />
              <input
                type="url"
                placeholder="URL ссылки"
                value={newPlatform.url}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, url: e.target.value }))}
                className="p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
              />
              <button
                onClick={addPlatform}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6">
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-6">Контактная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={aboutData.contact_info.email}
                onChange={(e) => setAboutData(prev => ({
                  ...prev,
                  contact_info: { ...prev.contact_info, email: e.target.value }
                }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Телефон
              </label>
              <input
                type="tel"
                value={aboutData.contact_info.phone}
                onChange={(e) => setAboutData(prev => ({
                  ...prev,
                  contact_info: { ...prev.contact_info, phone: e.target.value }
                }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
                placeholder="+381 123 456 789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Адрес
              </label>
              <input
                type="text"
                value={aboutData.contact_info.address}
                onChange={(e) => setAboutData(prev => ({
                  ...prev,
                  contact_info: { ...prev.contact_info, address: e.target.value }
                }))}
                className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white"
                placeholder="Адрес офиса"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAbout;
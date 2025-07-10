import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Save, Loader2, Info, Users, ImageIcon, Plus, X } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  image: string;
}

interface Contributor {
  id: number;
  name: string;
  role: string;
  image: string;
}

interface AboutPageSettings {
  title: string;
  projectInfo: string;
  teamMembers: TeamMember[];
  contributors: Contributor[];
  supportPlatforms: any[];
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

const AdminAbout = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<AboutPageSettings>({
    title: '',
    projectInfo: '',
    teamMembers: [],
    contributors: [],
    supportPlatforms: [],
    contactInfo: {}
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data: settingsData, error } = await supabase
        .from('site_settings')
        .select('about_page_settings')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Нет данных, используем дефолтные
          const defaultData: AboutPageSettings = {
            title: 'О Science Hub',
            projectInfo: 'Science Hub - это место для научного сообщества в Сербии',
            teamMembers: [],
            contributors: [],
            supportPlatforms: [],
            contactInfo: {
              email: 'info@sciencehub.site',
              phone: '+381 123 456 789',
              address: 'Science Hub, Панчево, Сербия'
            }
          };
          setEditData(defaultData);
          return;
        }
        throw error;
      }
      
      // Извлекаем данные страницы "О нас"
      const aboutData = settingsData?.about_page_settings || {};
      setEditData({
        title: aboutData.title || 'О Science Hub',
        projectInfo: aboutData.projectInfo || 'Science Hub - это место для научного сообщества в Сербии',
        teamMembers: aboutData.teamMembers || [],
        contributors: aboutData.contributors || [],
        supportPlatforms: aboutData.supportPlatforms || [],
        contactInfo: aboutData.contactInfo || {}
      });
      
    } catch (err) {
      console.error('Error fetching about settings:', err);
      toast.error('Не удалось загрузить настройки страницы "О нас"');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Получаем ID записи site_settings
      const { data: currentSettings, error: fetchError } = await supabase
        .from('site_settings')
        .select('id')
        .single();
      
      if (fetchError) {
        console.error('Error fetching site settings ID:', fetchError);
        throw fetchError;
      }
      
      // Обновляем только поле about_page_settings
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          about_page_settings: editData 
        })
        .eq('id', currentSettings.id);

      if (error) throw error;
      
      toast.success('Настройки страницы "О нас" успешно сохранены');
      
    } catch (err) {
      console.error('Error saving about settings:', err);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: Date.now(),
      name: '',
      role: '',
      bio: '',
      image: ''
    };
    setEditData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember]
    }));
  };

  const updateTeamMember = (id: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member => 
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  const removeTeamMember = (id: number) => {
    setEditData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(member => member.id !== id)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление страницей "О нас"
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Настройте информацию о вашем проекте, команде и контактах
          </p>
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg font-heading"
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
          {/* Основная информация */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl mr-4">
                <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Основная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Заголовок и описание страницы</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => handleChange(e, 'title')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="Введите заголовок страницы"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Описание проекта
                </label>
                <textarea
                  value={editData.projectInfo}
                  onChange={(e) => handleChange(e, 'projectInfo')}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                  placeholder="Расскажите о вашем проекте..."
                />
              </div>
            </div>
          </div>

          {/* Команда */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl mr-4">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Команда</h2>
                  <p className="text-gray-500 dark:text-gray-400">Участники вашей команды</p>
                </div>
              </div>
              <button
                onClick={addTeamMember}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить участника
              </button>
            </div>

            <div className="space-y-4">
              {editData.teamMembers.map((member) => (
                <div key={member.id} className="border dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium">Участник команды</h3>
                    <button
                      onClick={() => removeTeamMember(member.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Имя</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateTeamMember(member.id, 'name', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="Введите имя"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Роль</label>
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="Введите роль"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Биография</label>
                      <textarea
                        value={member.bio}
                        onChange={(e) => updateTeamMember(member.id, 'bio', e.target.value)}
                        rows={3}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="Краткая биография..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">URL фото</label>
                      <input
                        type="url"
                        value={member.image}
                        onChange={(e) => updateTeamMember(member.id, 'image', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {editData.teamMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Нет участников команды. Нажмите "Добавить участника" чтобы начать.
                </div>
              )}
            </div>
          </div>

          {/* Контактная информация */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl mr-4">
                <Info className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Контактная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Контакты для связи</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editData.contactInfo.email || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="info@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={editData.contactInfo.phone || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="+381 XX XXX XXXX"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={editData.contactInfo.address || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, address: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="Введите адрес"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAbout;
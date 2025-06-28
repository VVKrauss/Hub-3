import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  GripVertical, Eye, EyeOff, Save, Settings, Palette, 
  Layout, Smartphone, Monitor, RotateCcw, Plus, Trash2, Edit3, Loader2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Типы для настроек топбара
interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'normal' | 'large';
  showBorder: boolean;
  showShadow: boolean;
  backgroundColor: 'white' | 'transparent' | 'blur';
  animation: 'none' | 'slide' | 'fade' | 'bounce';
  mobileCollapse: boolean;
  showIcons: boolean;
  showBadges: boolean;
  stickyHeader: boolean;
  maxWidth: 'container' | 'full' | 'screen-xl';
}

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
  badge?: number;
  icon?: string;
};

type FooterSettings = {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  socialLinks: {
    telegram: string;
    instagram: string;
    youtube: string;
  };
};

const AdminNavigation = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    email: '',
    phone: '',
    address: '',
    workingHours: '',
    socialLinks: {
      telegram: '',
      instagram: '',
      youtube: ''
    }
  });
  
  // Настройки топбара
  const [topBarSettings, setTopBarSettings] = useState<TopBarSettings>({
    alignment: 'center',
    style: 'classic',
    spacing: 'normal',
    height: 'compact',
    showBorder: true,
    showShadow: true,
    backgroundColor: 'white',
    animation: 'slide',
    mobileCollapse: true,
    showIcons: false,
    showBadges: true,
    stickyHeader: true,
    maxWidth: 'container'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteSettingsId, setSiteSettingsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'navigation' | 'topbar' | 'footer'>('navigation');
  const [editingNavItem, setEditingNavItem] = useState<string | null>(null);
  const [newNavItem, setNewNavItem] = useState({ label: '', path: '', badge: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Fetch error:', error);
        throw error;
      }

      if (data) {
        console.log('Loaded settings:', data);
        setSiteSettingsId(data.id);
        
        // Обрабатываем навигационные элементы с порядком
        const navItemsWithOrder = (data.navigation_items || []).map((item: any, index: number) => ({
          ...item,
          order: item.order !== undefined ? item.order : index
        })).sort((a: any, b: any) => a.order - b.order);
        
        setNavItems(navItemsWithOrder);
        setFooterSettings({
          ...footerSettings,
          ...(data.footer_settings || {})
        });
        setTopBarSettings({ 
          ...topBarSettings, 
          ...(data.topbar_settings || {}) 
        });
      } else {
        // Создаем новую запись если её нет
        console.log('Creating new settings record');
        const newSettingsData = {
          navigation_items: [],
          footer_settings: footerSettings,
          topbar_settings: topBarSettings
        };

        const { data: newSettings, error: newError } = await supabase
          .from('site_settings')
          .insert([newSettingsData])
          .select('*')
          .single();

        if (newError) {
          console.error('Insert error:', newError);
          throw newError;
        }
        
        console.log('Created new settings:', newSettings);
        setSiteSettingsId(newSettings.id);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ошибка при загрузке настроек: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(navItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Обновляем порядок
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setNavItems(updatedItems);
  };

  const toggleVisibility = (id: string) => {
    setNavItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleNavItemEdit = (id: string, field: string, value: any) => {
    setNavItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddNavItem = () => {
    if (!newNavItem.label || !newNavItem.path) {
      toast.error('Заполните название и путь');
      return;
    }

    const id = newNavItem.label.toLowerCase().replace(/\s+/g, '-');
    const navItem: NavItem = {
      id,
      label: newNavItem.label,
      path: newNavItem.path,
      visible: true,
      order: navItems.length,
      badge: newNavItem.badge ? parseInt(newNavItem.badge) : undefined
    };

    setNavItems(prev => [...prev, navItem]);
    setNewNavItem({ label: '', path: '', badge: '' });
    setShowAddForm(false);
    toast.success('Элемент навигации добавлен');
  };

  const handleDeleteNavItem = (id: string) => {
    if (confirm('Удалить элемент навигации?')) {
      setNavItems(prev => prev.filter(item => item.id !== id));
      toast.success('Элемент навигации удален');
    }
  };

  const resetTopBarToDefaults = () => {
    const defaultSettings: TopBarSettings = {
      alignment: 'center',
      style: 'classic',
      spacing: 'normal',
      height: 'compact',
      showBorder: true,
      showShadow: true,
      backgroundColor: 'white',
      animation: 'slide',
      mobileCollapse: true,
      showIcons: false,
      showBadges: true,
      stickyHeader: true,
      maxWidth: 'container'
    };
    setTopBarSettings(defaultSettings);
    toast.info('Настройки топбара сброшены к значениям по умолчанию');
  };

  const handleSave = async () => {
    try {
      if (!siteSettingsId) {
        toast.error('ID настроек не найден');
        return;
      }

      setSaving(true);
      console.log('Saving settings...', {
        navigation_items: navItems,
        footer_settings: footerSettings,
        topbar_settings: topBarSettings
      });

      const { data, error } = await supabase
        .from('site_settings')
        .update({
          navigation_items: navItems,
          footer_settings: footerSettings,
          topbar_settings: topBarSettings
        })
        .eq('id', siteSettingsId)
        .select();

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('Settings saved successfully:', data);
      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении: ' + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="text-lg text-gray-900 dark:text-white">Загрузка настроек...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Управление навигацией</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Настройка меню, топбара и футера сайта</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Сохранить изменения
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-600">
        <nav className="flex space-x-8">
          {[
            { id: 'navigation', label: 'Навигация', icon: Layout },
            { id: 'topbar', label: 'Топбар', icon: Settings },
            { id: 'footer', label: 'Футер', icon: Monitor }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Navigation Tab */}
      {activeTab === 'navigation' && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Основное меню</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Перетаскивайте элементы для изменения порядка</p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Добавить элемент
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Новый элемент навигации</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Название *
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Контакты"
                      value={newNavItem.label}
                      onChange={(e) => setNewNavItem(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Путь *
                    </label>
                    <input
                      type="text"
                      placeholder="Например: /contacts"
                      value={newNavItem.path}
                      onChange={(e) => setNewNavItem(prev => ({ ...prev, path: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Бейдж (опционально)
                    </label>
                    <input
                      type="number"
                      placeholder="5"
                      value={newNavItem.badge}
                      onChange={(e) => setNewNavItem(prev => ({ ...prev, badge: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleAddNavItem} className="btn-primary">
                    Добавить
                  </button>
                  <button 
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-outline"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
            
            {navItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Элементы навигации не найдены</p>
                <p className="text-sm">Добавьте первый элемент меню</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="nav-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {navItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border transition-all ${
                                snapshot.isDragging 
                                  ? 'border-primary-300 shadow-lg bg-white dark:bg-dark-600' 
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                </span>
                                
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {editingNavItem === item.id ? (
                                    <>
                                      <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => handleNavItemEdit(item.id, 'label', e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                        placeholder="Название"
                                      />
                                      <input
                                        type="text"
                                        value={item.path}
                                        onChange={(e) => handleNavItemEdit(item.id, 'path', e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                        placeholder="Путь"
                                      />
                                      <input
                                        type="number"
                                        value={item.badge || ''}
                                        onChange={(e) => handleNavItemEdit(item.id, 'badge', e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                        placeholder="Бейдж"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                                        {!item.visible && (
                                          <span className="ml-2 text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                            Скрыт
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.path}</span>
                                      <div className="flex items-center gap-2">
                                        {item.badge && (
                                          <span className="text-xs bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 px-2 py-1 rounded-full">
                                            Бейдж: {item.badge}
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-400">#{index + 1}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {editingNavItem === item.id ? (
                                  <button
                                    onClick={() => setEditingNavItem(null)}
                                    className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                    title="Сохранить изменения"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingNavItem(item.id)}
                                    className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                    title="Редактировать"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => toggleVisibility(item.id)}
                                  className={`p-2 rounded-md transition-colors ${
                                    item.visible
                                      ? 'text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20'
                                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                  }`}
                                  title={item.visible ? 'Скрыть элемент' : 'Показать элемент'}
                                >
                                  {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>

                                <button
                                  onClick={() => handleDeleteNavItem(item.id)}
                                  className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                  title="Удалить элемент"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      )}

      {/* TopBar Settings Tab */}
      {activeTab === 'topbar' && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки топбара</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Настройте внешний вид и поведение верхней панели</p>
              </div>
              <button
                onClick={resetTopBarToDefaults}
                className="btn btn-outline flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Сбросить
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Layout Settings */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Layout className="h-5 w-5 text-primary-600" />
                  Расположение и стиль
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Выравнивание навигации</label>
                    <select
                      value={topBarSettings.alignment}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        alignment: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="left">Слева</option>
                      <option value="center">По центру</option>
                      <option value="right">Справа</option>
                      <option value="space-between">Растянуть</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Стиль навигации</label>
                    <select
                      value={topBarSettings.style}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        style: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="classic">Классический (линия снизу)</option>
                      <option value="modern">Современный</option>
                      <option value="minimal">Минимальный</option>
                      <option value="rounded">Скругленный</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Отступы</label>
                    <select
                      value={topBarSettings.spacing}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        spacing: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="compact">Компактные</option>
                      <option value="normal">Обычные</option>
                      <option value="relaxed">Увеличенные</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Высота топбара</label>
                    <select
                      value={topBarSettings.height}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        height: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="compact">Компактная</option>
                      <option value="normal">Обычная</option>
                      <option value="large">Увеличенная</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Максимальная ширина</label>
                    <select
                      value={topBarSettings.maxWidth}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        maxWidth: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="container">Контейнер (1280px)</option>
                      <option value="screen-xl">Большой экран (1536px)</option>
                      <option value="full">Полная ширина</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Appearance Settings */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Palette className="h-5 w-5 text-primary-600" />
                  Внешний вид
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Фон топбара</label>
                    <select
                      value={topBarSettings.backgroundColor}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        backgroundColor: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="white">Белый</option>
                      <option value="transparent">Прозрачный</option>
                      <option value="blur">Размытый</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Анимация</label>
                    <select
                      value={topBarSettings.animation}
                      onChange={(e) => setTopBarSettings(prev => ({
                        ...prev,
                        animation: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    >
                      <option value="none">Без анимации</option>
                      <option value="slide">Слайд</option>
                      <option value="fade">Затухание</option>
                      <option value="bounce">Подпрыгивание</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'showBorder', label: 'Показывать границу', desc: 'Тонкая линия под топбаром' },
                      { key: 'showShadow', label: 'Показывать тень', desc: 'Мягкая тень под панелью' },
                      { key: 'stickyHeader', label: 'Закрепленный заголовок', desc: 'Топбар остается наверху при прокрутке' },
                      { key: 'showIcons', label: 'Показывать иконки', desc: 'Иконки рядом с пунктами меню' },
                      { key: 'showBadges', label: 'Показывать бейджи', desc: 'Числовые индикаторы на элементах' },
                      { key: 'mobileCollapse', label: 'Сворачивать на мобильных', desc: 'Гамбургер-меню на малых экранах' }
                    ].map(setting => (
                      <label key={setting.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={topBarSettings[setting.key as keyof TopBarSettings] as boolean}
                          onChange={(e) => setTopBarSettings(prev => ({
                            ...prev,
                            [setting.key]: e.target.checked
                          }))}
                          className="mt-1"
                        />
                        <div>
                          <span className="text-gray-900 dark:text-white">{setting.label}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{setting.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Предварительный просмотр</h4>
              <div className={`
                border rounded-lg bg-white dark:bg-dark-800 transition-all
                ${topBarSettings.showBorder ? 'border-gray-200 dark:border-gray-600' : 'border-transparent'}
                ${topBarSettings.showShadow ? 'shadow-lg' : ''}
                ${topBarSettings.backgroundColor === 'blur' ? 'backdrop-blur-sm bg-white/80 dark:bg-dark-800/80' : ''}
                ${topBarSettings.backgroundColor === 'transparent' ? 'bg-transparent' : ''}
              `}>
                <div className="flex items-center justify-between p-4">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">ScienceHub</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Войти</span>
                    <span>🌙</span>
                  </div>
                </div>
                <div className={`
                  flex items-center p-4
                  ${topBarSettings.alignment === 'left' ? 'justify-start' : ''}
                  ${topBarSettings.alignment === 'center' ? 'justify-center' : ''}
                  ${topBarSettings.alignment === 'right' ? 'justify-end' : ''}
                  ${topBarSettings.alignment === 'space-between' ? 'justify-between' : ''}
                  ${topBarSettings.spacing === 'compact' ? 'gap-2' : ''}
                  ${topBarSettings.spacing === 'normal' ? 'gap-4' : ''}
                  ${topBarSettings.spacing === 'relaxed' ? 'gap-6' : ''}
                `}>
                  {navItems.filter(item => item.visible).slice(0, 4).map((item, index) => (
                    <div
                      key={item.id}
                      className={`
                        px-3 py-2 text-sm font-medium cursor-pointer transition-all duration-300 relative
                        ${topBarSettings.style === 'classic' ? 'hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600' : ''}
                        ${topBarSettings.style === 'modern' ? 'hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg' : ''}
                        ${topBarSettings.style === 'minimal' ? 'hover:opacity-80' : ''}
                        ${topBarSettings.style === 'rounded' ? 'hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-full' : ''}
                        ${topBarSettings.animation === 'slide' ? 'hover:transform hover:-translate-y-0.5' : ''}
                        ${topBarSettings.animation === 'fade' ? 'hover:opacity-70' : ''}
                        ${topBarSettings.animation === 'bounce' ? 'hover:animate-pulse' : ''}
                        ${index === 0 && topBarSettings.style === 'classic' ? 'text-primary-600 border-b-2 border-primary-600' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {item.label}
                        {topBarSettings.showBadges && item.badge && (
                          <span className="bg-primary-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Это примерный вид топбара с текущими настройками. Первый элемент показан как активный.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Tab */}
      {activeTab === 'footer' && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки футера</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Контактная информация и социальные сети</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Контактная информация */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Monitor className="h-5 w-5 text-primary-600" />
                  Контактная информация
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      value={footerSettings.email}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      placeholder="sciencehubrs@gmail.com"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Телефон</label>
                    <input
                      type="tel"
                      value={footerSettings.phone}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                      placeholder="+381 629434798"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Адрес</label>
                    <input
                      type="text"
                      value={footerSettings.address}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        address: e.target.value
                      }))}
                      placeholder="Sarajevska 48, Belgrade"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Часы работы</label>
                    <input
                      type="text"
                      value={footerSettings.workingHours}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        workingHours: e.target.value
                      }))}
                      placeholder="Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Социальные сети */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Smartphone className="h-5 w-5 text-primary-600" />
                  Социальные сети
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Telegram</label>
                    <input
                      type="url"
                      placeholder="https://t.me/sciencehub"
                      value={footerSettings.socialLinks.telegram}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          telegram: e.target.value
                        }
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">Instagram</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/sciencehub"
                      value={footerSettings.socialLinks.instagram}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          instagram: e.target.value
                        }
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">YouTube</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/sciencehub"
                      value={footerSettings.socialLinks.youtube}
                      onChange={(e) => setFooterSettings(prev => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          youtube: e.target.value
                        }
                      }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Preview Links */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <h5 className="font-medium mb-3 text-gray-900 dark:text-white">Предварительный просмотр ссылок</h5>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(footerSettings.socialLinks).map(([platform, url]) => {
                      if (!url) return null;
                      const platformNames = {
                        telegram: 'Telegram',
                        instagram: 'Instagram', 
                        youtube: 'YouTube'
                      };
                      return (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full text-sm hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          {platformNames[platform as keyof typeof platformNames]}
                          <span className="text-xs">↗</span>
                        </a>
                      );
                    })}
                  </div>
                  {Object.values(footerSettings.socialLinks).every(url => !url) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Добавьте ссылки на социальные сети</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Preview */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Предварительный просмотр футера</h4>
              <div className="bg-dark-900 text-white p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Контакты */}
                  <div>
                    <h5 className="font-semibold mb-3">Контакты</h5>
                    <div className="space-y-2 text-sm">
                      {footerSettings.email && (
                        <div className="flex items-center gap-2">
                          <span>📧</span>
                          <span>{footerSettings.email}</span>
                        </div>
                      )}
                      {footerSettings.phone && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <span>{footerSettings.phone}</span>
                        </div>
                      )}
                      {footerSettings.address && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{footerSettings.address}</span>
                        </div>
                      )}
                      {footerSettings.workingHours && (
                        <div className="flex items-center gap-2">
                          <span>🕒</span>
                          <span>{footerSettings.workingHours}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Навигация */}
                  <div>
                    <h5 className="font-semibold mb-3">Навигация</h5>
                    <div className="space-y-1 text-sm">
                      {navItems.filter(item => item.visible).slice(0, 5).map(item => (
                        <div key={item.id} className="hover:text-primary-400 cursor-pointer">
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Социальные сети */}
                  <div>
                    <h5 className="font-semibold mb-3">Мы в соцсетях</h5>
                    <div className="flex gap-3">
                      {Object.entries(footerSettings.socialLinks).map(([platform, url]) => {
                        if (!url) return null;
                        const logos = {
                          telegram: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/tg-logo-100x100.png',
                          instagram: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/ist-logo-100x100.png',
                          youtube: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/yt_100x100.png'
                        };
                        return (
                          <img 
                            key={platform}
                            src={logos[platform as keyof typeof logos]}
                            alt={platform}
                            className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNavigation;
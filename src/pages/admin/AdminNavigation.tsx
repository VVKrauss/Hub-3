// src/pages/admin/AdminNavigation.tsx - Обновленная версия для работы с sh_site_settings
// ЧАСТЬ 1 из 2
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  GripVertical, Eye, EyeOff, Save, Settings, Palette, 
  Layout, Smartphone, Monitor, RotateCcw, Plus, Trash2, Edit3, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Используем новые API функции
import { 
  getSiteSettings, 
  updateSiteSettings,
  getOrCreateSiteSettings 
} from '../../api/settings';

// Типы для настроек
interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
  badge?: number;
  icon?: string;
}

interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'standard' | 'large';
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

interface FooterSettings {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  customText: string;
  socialLinks: {
    telegram: string;
    instagram: string;
    youtube: string;
  };
  showCopyright: boolean;
}

const AdminNavigation = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    email: '',
    phone: '',
    address: '',
    workingHours: '',
    customText: '',
    socialLinks: {
      telegram: '',
      instagram: '',
      youtube: ''
    },
    showCopyright: true
  });
  
  const [topBarSettings, setTopBarSettings] = useState<TopBarSettings>({
    alignment: 'center',
    style: 'classic',
    spacing: 'normal',
    height: 'standard',
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
      
      // Используем новый API для получения настроек
      const response = await getOrCreateSiteSettings();
      
      if (response.error) {
        throw new Error(response.error);
      }

      const data = response.data;
      console.log('Loaded settings from sh_site_settings:', data);
      
      // Загружаем навигационные элементы
      const navItemsWithOrder = (data.navigation_items || []).map((item: any, index: number) => ({
        ...item,
        order: item.order !== undefined ? item.order : index
      })).sort((a: any, b: any) => a.order - b.order);
      
      setNavItems(navItemsWithOrder);
      
      // Загружаем настройки футера
      setFooterSettings({
        ...footerSettings,
        ...(data.footer_settings || {})
      });
      
      // Загружаем настройки топбара из navigation_style
      setTopBarSettings({ 
        ...topBarSettings, 
        ...(data.navigation_style || {}) 
      });
      
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
      height: 'standard',
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
      setSaving(true);
      console.log('Saving settings to sh_site_settings...', {
        navigation_items: navItems,
        footer_settings: footerSettings,
        navigation_style: topBarSettings
      });

      // Используем новый API для сохранения
      const response = await updateSiteSettings({
        navigation_items: navItems,
        footer_settings: footerSettings,
        navigation_style: topBarSettings, // Сохраняем как navigation_style
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Settings saved successfully to sh_site_settings:', response.data);
      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении: ' + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  // ЧАСТЬ 2 из 2 - Продолжение AdminNavigation.tsx

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
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            🔄 Использует новую систему (sh_site_settings)
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Сохранить
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-600">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'navigation', label: 'Навигация', icon: Layout },
            { id: 'topbar', label: 'Топбар', icon: Monitor },
            { id: 'footer', label: 'Футер', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Элементы навигации ({navItems.length})
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Добавить элемент
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Название (например: Курсы)"
                  value={newNavItem.label}
                  onChange={(e) => setNewNavItem(prev => ({ ...prev, label: e.target.value }))}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Путь (например: /courses)"
                  value={newNavItem.path}
                  onChange={(e) => setNewNavItem(prev => ({ ...prev, path: e.target.value }))}
                  className="input"
                />
                <input
                  type="number"
                  placeholder="Бейдж (опционально)"
                  value={newNavItem.badge}
                  onChange={(e) => setNewNavItem(prev => ({ ...prev, badge: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddNavItem}
                  className="btn-primary"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {/* Navigation items */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="navigation">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {navItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div {...provided.dragHandleProps} className="cursor-move text-gray-400">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                              {editingNavItem === item.id ? (
                                <>
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => handleNavItemEdit(item.id, 'label', e.target.value)}
                                    className="input"
                                  />
                                  <input
                                    type="text"
                                    value={item.path}
                                    onChange={(e) => handleNavItemEdit(item.id, 'path', e.target.value)}
                                    className="input"
                                  />
                                  <input
                                    type="number"
                                    value={item.badge || ''}
                                    onChange={(e) => handleNavItemEdit(item.id, 'badge', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="input"
                                    placeholder="Бейдж"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingNavItem(null)}
                                      className="btn-primary text-sm"
                                    >
                                      Сохранить
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {item.label}
                                    </span>
                                    {item.badge && (
                                      <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <code className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.path}
                                  </code>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Порядок: {item.order}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleVisibility(item.id)}
                                      className={`p-2 rounded ${
                                        item.visible
                                          ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </button>
                                    <button
                                      onClick={() => setEditingNavItem(item.id)}
                                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNavItem(item.id)}
                                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
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
        </div>
      )}

      {/* TopBar Tab */}
      {activeTab === 'topbar' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки топбара</h3>
            <button
              onClick={resetTopBarToDefaults}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Сбросить
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Выравнивание</label>
                <select
                  value={topBarSettings.alignment}
                  onChange={(e) => setTopBarSettings(prev => ({ ...prev, alignment: e.target.value as any }))}
                  className="input"
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                  <option value="space-between">Растянуть</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Стиль</label>
                <select
                  value={topBarSettings.style}
                  onChange={(e) => setTopBarSettings(prev => ({ ...prev, style: e.target.value as any }))}
                  className="input"
                >
                  <option value="classic">Классический</option>
                  <option value="modern">Современный</option>
                  <option value="minimal">Минимальный</option>
                  <option value="rounded">Закругленный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Высота</label>
                <select
                  value={topBarSettings.height}
                  onChange={(e) => setTopBarSettings(prev => ({ ...prev, height: e.target.value as any }))}
                  className="input"
                >
                  <option value="compact">Компактная</option>
                  <option value="standard">Стандартная</option>
                  <option value="large">Большая</option>
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

            {/* Preview */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Предварительный просмотр</h4>
              <div className={`
                border rounded-lg bg-white dark:bg-gray-800 transition-all p-4
                ${topBarSettings.showBorder ? 'border-gray-200 dark:border-gray-600' : 'border-transparent'}
                ${topBarSettings.showShadow ? 'shadow-lg' : ''}
                ${topBarSettings.height === 'compact' ? 'py-2' : topBarSettings.height === 'large' ? 'py-6' : 'py-4'}
              `}>
                <div className={`flex items-center ${
                  topBarSettings.alignment === 'center' ? 'justify-center' :
                  topBarSettings.alignment === 'right' ? 'justify-end' :
                  topBarSettings.alignment === 'space-between' ? 'justify-between' : 'justify-start'
                } gap-4`}>
                  <span className="font-bold">Logo</span>
                  <div className="flex gap-4">
                    {navItems.filter(item => item.visible).slice(0, 4).map((item, index) => (
                      <span 
                        key={item.id} 
                        className={`text-sm ${index === 0 ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
                      >
                        {item.label}
                        {topBarSettings.showBadges && item.badge && (
                          <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">Профиль</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Это примерный вид топбара с текущими настройками.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Tab */}
      {activeTab === 'footer' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки футера</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={footerSettings.email}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="info@sciencehub.site"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Телефон</label>
                <input
                  type="text"
                  value={footerSettings.phone}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="+381 123 456 789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Адрес</label>
                <input
                  type="text"
                  value={footerSettings.address}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, address: e.target.value }))}
                  className="input"
                  placeholder="Science Hub, Панчево, Сербия"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Часы работы</label>
                <input
                  type="text"
                  value={footerSettings.workingHours}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, workingHours: e.target.value }))}
                  className="input"
                  placeholder="Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Telegram</label>
                <input
                  type="url"
                  value={footerSettings.socialLinks.telegram}
                  onChange={(e) => setFooterSettings(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, telegram: e.target.value }
                  }))}
                  className="input"
                  placeholder="https://t.me/sciencehub"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instagram</label>
                <input
                  type="url"
                  value={footerSettings.socialLinks.instagram}
                  onChange={(e) => setFooterSettings(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                  }))}
                  className="input"
                  placeholder="https://instagram.com/sciencehub"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">YouTube</label>
                <input
                  type="url"
                  value={footerSettings.socialLinks.youtube}
                  onChange={(e) => setFooterSettings(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                  }))}
                  className="input"
                  placeholder="https://youtube.com/sciencehub"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Дополнительный текст</label>
                <textarea
                  value={footerSettings.customText}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, customText: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Дополнительная информация в футере..."
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={footerSettings.showCopyright}
                  onChange={(e) => setFooterSettings(prev => ({ ...prev, showCopyright: e.target.checked }))}
                />
                <span className="text-gray-900 dark:text-white">Показывать копирайт</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {!loading && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 dark:text-green-300">
              Подключено к новой системе (sh_site_settings). Изменения будут применены к TopBar сразу после сохранения.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNavigation; 
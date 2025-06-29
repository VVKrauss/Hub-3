// src/pages/admin/AdminNavigationUpdated.tsx
// Обновленная версия AdminNavigation для работы с новой БД структурой

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  GripVertical, Eye, EyeOff, Save, Settings, Palette, 
  Layout, Smartphone, Monitor, RotateCcw, Plus, Trash2, Edit3, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Импортируем новые API функции
import { 
  getSiteSettings, 
  updateNavigation,
  getOrCreateSiteSettings 
} from '../../api/settings';
import type { ShSiteSettings } from '../../types/database';

// Типы для настроек топбара (обновленные)
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
  external?: boolean;
};

const AdminNavigationUpdated = () => {
  const [settings, setSettings] = useState<ShSiteSettings | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
  const [topbarSettings, setTopbarSettings] = useState<TopBarSettings>({
    alignment: 'center',
    style: 'classic',
    spacing: 'normal',
    height: 'normal',
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showStylePanel, setShowStylePanel] = useState(false);

  const [newItem, setNewItem] = useState<Partial<NavItem>>({
    label: '',
    path: '',
    visible: true,
    badge: 0,
    icon: '',
    external: false
  });

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const response = await getOrCreateSiteSettings();
      if (response.error) {
        throw new Error(response.error);
      }

      const settingsData = response.data!;
      setSettings(settingsData);

      // Загружаем навигационные элементы
      const navItems = (settingsData.navigation_items as NavItem[]) || [];
      setNavigationItems(navItems);

      // Загружаем настройки топбара
      const navStyle = settingsData.navigation_style as TopBarSettings;
      if (navStyle) {
        setTopbarSettings({
          ...topbarSettings,
          ...navStyle
        });
      }

      toast.success('Настройки загружены');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      const response = await updateNavigation(navigationItems, topbarSettings);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setSettings(response.data!);
      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const addNavigationItem = () => {
    if (!newItem.label || !newItem.path) {
      toast.error('Заполните название и путь');
      return;
    }

    const item: NavItem = {
      id: `nav_${Date.now()}`,
      label: newItem.label,
      path: newItem.path,
      visible: newItem.visible ?? true,
      order: navigationItems.length,
      badge: newItem.badge || 0,
      icon: newItem.icon || '',
      external: newItem.external || false
    };

    setNavigationItems([...navigationItems, item]);
    setNewItem({
      label: '',
      path: '',
      visible: true,
      badge: 0,
      icon: '',
      external: false
    });
    setShowAddModal(false);
    toast.success('Элемент добавлен');
  };

  const updateNavigationItem = (id: string, updates: Partial<NavItem>) => {
    setNavigationItems(items => 
      items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const deleteNavigationItem = (id: string) => {
    setNavigationItems(items => items.filter(item => item.id !== id));
    toast.success('Элемент удален');
  };

  const toggleItemVisibility = (id: string) => {
    updateNavigationItem(id, { 
      visible: !navigationItems.find(item => item.id === id)?.visible 
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(navigationItems);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Обновляем порядок элементов
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index
    }));

    setNavigationItems(updatedItems);
  };

  const resetToDefaults = () => {
    const defaultItems: NavItem[] = [
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 2 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 }
    ];

    setNavigationItems(defaultItems);
    setTopbarSettings({
      alignment: 'center',
      style: 'classic',
      spacing: 'normal',
      height: 'normal',
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
    toast.success('Настройки сброшены к значениям по умолчанию');
  };

  const getPreviewClasses = () => {
    const base = "bg-white border-b transition-all duration-200";
    const alignmentClass = {
      'left': 'justify-start',
      'center': 'justify-center', 
      'right': 'justify-end',
      'space-between': 'justify-between'
    }[topbarSettings.alignment];

    const styleClasses = {
      'classic': 'shadow-sm',
      'modern': 'shadow-lg backdrop-blur-sm',
      'minimal': 'border-b-0',
      'rounded': 'rounded-lg shadow-md mx-4 mt-2'
    }[topbarSettings.style];

    const spacingClass = {
      'compact': 'px-2 py-1',
      'normal': 'px-4 py-2', 
      'relaxed': 'px-6 py-4'
    }[topbarSettings.spacing];

    const heightClass = {
      'compact': 'h-12',
      'normal': 'h-16',
      'large': 'h-20'
    }[topbarSettings.height];

    return `${base} ${alignmentClass} ${styleClasses} ${spacingClass} ${heightClass}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2">Загрузка настроек...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Навигация сайта
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Управление меню и внешним видом навигации
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowStylePanel(!showStylePanel)}
            className="btn-secondary flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Стили
          </button>
          
          <button
            onClick={resetToDefaults}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </button>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Предварительный просмотр */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Предварительный просмотр</h3>
          <div className="flex gap-2">
            {[
              { mode: 'desktop', icon: Monitor },
              { mode: 'tablet', icon: Layout },
              { mode: 'mobile', icon: Smartphone }
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode as any)}
                className={`p-2 rounded ${
                  previewMode === mode 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className={`
          ${previewMode === 'mobile' ? 'max-w-sm' : ''}
          ${previewMode === 'tablet' ? 'max-w-2xl' : ''}
          mx-auto border rounded-lg overflow-hidden
        `}>
          <nav className={getPreviewClasses()}>
            <div className="flex items-center space-x-4">
              {navigationItems
                .filter(item => item.visible)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(item => (
                  <div key={item.id} className="relative flex items-center gap-2">
                    {topbarSettings.showIcons && item.icon && (
                      <span className="text-sm">{item.icon}</span>
                    )}
                    <span className="text-gray-700 hover:text-primary-600 cursor-pointer">
                      {item.label}
                    </span>
                    {topbarSettings.showBadges && item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))
              }
            </div>
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Панель навигационных элементов */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Элементы навигации</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Добавить элемент
            </button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="navigation-items">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {navigationItems
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`
                            bg-white dark:bg-dark-700 border rounded-lg p-4 flex items-center gap-3
                            ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}
                            ${!item.visible ? 'opacity-50' : ''}
                          `}
                        >
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                          </div>

                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <div>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updateNavigationItem(item.id, { label: e.target.value })}
                                className="input-primary w-full text-sm"
                                placeholder="Название"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={item.path}
                                onChange={(e) => updateNavigationItem(item.id, { path: e.target.value })}
                                className="input-primary w-full text-sm"
                                placeholder="Путь"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={item.badge || 0}
                                onChange={(e) => updateNavigationItem(item.id, { badge: parseInt(e.target.value) || 0 })}
                                className="input-primary w-16 text-sm"
                                placeholder="0"
                              />
                              <input
                                type="text"
                                value={item.icon || ''}
                                onChange={(e) => updateNavigationItem(item.id, { icon: e.target.value })}
                                className="input-primary w-16 text-sm"
                                placeholder="🏠"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleItemVisibility(item.id)}
                              className={`p-2 rounded ${
                                item.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => deleteNavigationItem(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
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
        </div>

        {/* Панель настроек стилей */}
        {showStylePanel && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Настройки стилей</h3>
            
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Выравнивание</label>
                <select
                  value={topbarSettings.alignment}
                  onChange={(e) => setTopbarSettings(prev => ({ ...prev, alignment: e.target.value as any }))}
                  className="input-primary w-full"
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
                  value={topbarSettings.style}
                  onChange={(e) => setTopbarSettings(prev => ({ ...prev, style: e.target.value as any }))}
                  className="input-primary w-full"
                >
                  <option value="classic">Классический</option>
                  <option value="modern">Современный</option>
                  <option value="minimal">Минимальный</option>
                  <option value="rounded">Скругленный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Отступы</label>
                <select
                  value={topbarSettings.spacing}
                  onChange={(e) => setTopbarSettings(prev => ({ ...prev, spacing: e.target.value as any }))}
                  className="input-primary w-full"
                >
                  <option value="compact">Компактные</option>
                  <option value="normal">Обычные</option>
                  <option value="relaxed">Большие</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Высота</label>
                <select
                  value={topbarSettings.height}
                  onChange={(e) => setTopbarSettings(prev => ({ ...prev, height: e.target.value as any }))}
                  className="input-primary w-full"
                >
                  <option value="compact">Компактная</option>
                  <option value="normal">Обычная</option>
                  <option value="large">Большая</option>
                </select>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'showBorder', label: 'Показывать границу' },
                  { key: 'showShadow', label: 'Показывать тень' },
                  { key: 'mobileCollapse', label: 'Сворачивать на мобильных' },
                  { key: 'showIcons', label: 'Показывать иконки' },
                  { key: 'showBadges', label: 'Показывать счетчики' },
                  { key: 'stickyHeader', label: 'Фиксированный заголовок' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={topbarSettings[key as keyof TopBarSettings] as boolean}
                      onChange={(e) => setTopbarSettings(prev => ({ 
                        ...prev, 
                        [key]: e.target.checked 
                      }))}
                      className="checkbox-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно добавления элемента */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Добавить элемент навигации</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  type="text"
                  value={newItem.label || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, label: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="Например: Контакты"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Путь</label>
                <input
                  type="text"
                  value={newItem.path || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, path: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="Например: /contacts"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Иконка</label>
                  <input
                    type="text"
                    value={newItem.icon || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, icon: e.target.value }))}
                    className="input-primary w-full"
                    placeholder="📞"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Счетчик</label>
                  <input
                    type="number"
                    value={newItem.badge || 0}
                    onChange={(e) => setNewItem(prev => ({ ...prev, badge: parseInt(e.target.value) || 0 }))}
                    className="input-primary w-full"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newItem.visible ?? true}
                    onChange={(e) => setNewItem(prev => ({ ...prev, visible: e.target.checked }))}
                    className="checkbox-primary"
                  />
                  <span className="text-sm">Видимый</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newItem.external ?? false}
                    onChange={(e) => setNewItem(prev => ({ ...prev, external: e.target.checked }))}
                    className="checkbox-primary"
                  />
                  <span className="text-sm">Внешняя ссылка</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={addNavigationItem}
                className="btn-primary"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNavigationUpdated;
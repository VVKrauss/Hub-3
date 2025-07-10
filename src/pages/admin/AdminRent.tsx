import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Loader2, 
  Info, 
  ImageIcon, 
  Plus, 
  X, 
  DollarSign, 
  Home, 
  MapPin, 
  Phone, 
  Mail,
  Upload,
  Edit3,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

// === ТИПЫ ===
interface PriceItem {
  id: string;
  name: string;
  price: number;
  duration: 'hour' | 'day' | 'week' | 'month';
  description?: string;
  is_featured?: boolean;
}

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  map_link?: string;
  working_hours?: string;
}

interface RentSettings {
  title: string;
  description: string;
  photos: string[];
  amenities: string[];
  pricelist: PriceItem[];
  contacts: ContactInfo;
  main_prices: {
    hourly?: number;
    daily?: number;
  };
  included_services: string[];
  meta_description?: string;
  is_active: boolean;
}

// === КОМПОНЕНТЫ ===

// Компонент для управления фотографиями
const PhotoManager: React.FC<{
  photos: string[];
  onChange: (photos: string[]) => void;
}> = ({ photos, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      setUploading(true);
      
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `rent-${timestamp}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`rent/${fileName}`, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(`rent/${fileName}`);

      const photoUrl = publicUrlData.publicUrl;
      onChange([...photos, photoUrl]);
      
      toast.success('Фото успешно загружено');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoUrl: string) => {
    onChange(photos.filter(url => url !== photoUrl));
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      
      {/* Кнопка загрузки */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 transition-colors text-center disabled:opacity-50"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span>Загрузка...</span>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Нажмите для загрузки фото
            </p>
            <p className="text-sm text-gray-500">PNG, JPG до 10MB</p>
          </>
        )}
      </button>

      {/* Галерея загруженных фото */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Фото ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
              />
              
              {/* Оверлей с кнопками */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    onClick={() => movePhoto(index, index - 1)}
                    className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                    title="Переместить влево"
                  >
                    ←
                  </button>
                )}
                
                <button
                  onClick={() => removePhoto(photo)}
                  className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                {index < photos.length - 1 && (
                  <button
                    onClick={() => movePhoto(index, index + 1)}
                    className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                    title="Переместить вправо"
                  >
                    →
                  </button>
                )}
              </div>
              
              {/* Индекс фото */}
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Компонент для управления прайс-листом
const PriceListManager: React.FC<{
  pricelist: PriceItem[];
  onChange: (pricelist: PriceItem[]) => void;
}> = ({ pricelist, onChange }) => {
  const addPriceItem = () => {
    const newItem: PriceItem = {
      id: `price-${Date.now()}`,
      name: '',
      price: 0,
      duration: 'hour',
      description: '',
      is_featured: false
    };
    onChange([...pricelist, newItem]);
  };

  const updatePriceItem = (id: string, updates: Partial<PriceItem>) => {
    onChange(pricelist.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removePriceItem = (id: string) => {
    onChange(pricelist.filter(item => item.id !== id));
  };

  const movePriceItem = (fromIndex: number, toIndex: number) => {
    const newList = [...pricelist];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);
    onChange(newList);
  };

  return (
    <div className="space-y-6">
      {/* Кнопка добавления */}
      <button
        onClick={addPriceItem}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить услугу
      </button>

      {/* Список услуг */}
      <div className="space-y-4">
        {pricelist.map((item, index) => (
          <div key={item.id} className="border dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-lg">Услуга #{index + 1}</h3>
                {item.is_featured && (
                  <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full text-xs font-medium">
                    Рекомендуемая
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Кнопки перемещения */}
                {index > 0 && (
                  <button
                    onClick={() => movePriceItem(index, index - 1)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Переместить вверх"
                  >
                    ↑
                  </button>
                )}
                
                {index < pricelist.length - 1 && (
                  <button
                    onClick={() => movePriceItem(index, index + 1)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Переместить вниз"
                  >
                    ↓
                  </button>
                )}
                
                <button
                  onClick={() => removePriceItem(item.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updatePriceItem(item.id, { name: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Название услуги"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Цена (€)</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updatePriceItem(item.id, { price: Number(e.target.value) })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Период</label>
                <select
                  value={item.duration}
                  onChange={(e) => updatePriceItem(item.id, { duration: e.target.value as any })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="hour">час</option>
                  <option value="day">день</option>
                  <option value="week">неделя</option>
                  <option value="month">месяц</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={item.description || ''}
                  onChange={(e) => updatePriceItem(item.id, { description: e.target.value })}
                  className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Описание услуги..."
                  rows={2}
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.is_featured || false}
                    onChange={(e) => updatePriceItem(item.id, { is_featured: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Рекомендуемая услуга</span>
                </label>
              </div>
            </div>
          </div>
        ))}
        
        {pricelist.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет дополнительных услуг. Нажмите "Добавить услугу" чтобы начать.
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для управления списками (удобства, включенные услуги)
const ListManager: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addButtonText: string;
}> = ({ items, onChange, placeholder, addButtonText }) => {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-4">
      {/* Поле добавления */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
          placeholder={placeholder}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          {addButtonText}
        </button>
      </div>

      {/* Список элементов */}
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div key={index} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full">
            <span>{item}</span>
            <button
              onClick={() => removeItem(index)}
              className="text-red-500 hover:text-red-700"
              title="Удалить"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-gray-500 text-sm py-2">
            Список пуст. Добавьте первый элемент.
          </div>
        )}
      </div>
    </div>
  );
};

// === ОСНОВНОЙ КОМПОНЕНТ ===
const AdminRent = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RentSettings>({
    title: '',
    description: '',
    photos: [],
    amenities: [],
    pricelist: [],
    contacts: {
      address: '',
      phone: '',
      email: ''
    },
    main_prices: {},
    included_services: [],
    is_active: true
  });

  // Загрузка настроек
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('rent_page_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.rent_page_settings) {
        setSettings({
          title: data.rent_page_settings.title || 'Аренда пространства Science Hub',
          description: data.rent_page_settings.description || '',
          photos: data.rent_page_settings.photos || [],
          amenities: data.rent_page_settings.amenities || [],
          pricelist: data.rent_page_settings.pricelist || [],
          contacts: data.rent_page_settings.contacts || {
            address: 'Science Hub, Панчево, Сербия',
            phone: '+381 123 456 789',
            email: 'info@sciencehub.site'
          },
          main_prices: data.rent_page_settings.main_prices || {},
          included_services: data.rent_page_settings.included_services || [],
          meta_description: data.rent_page_settings.meta_description || '',
          is_active: data.rent_page_settings.is_active !== false
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      toast.error('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Получаем ID записи site_settings или создаем новую
      let { data: existingSettings, error: fetchError } = await supabase
        .from('site_settings')
        .select('id')
        .single();
      
      if (fetchError && fetchError.code === 'PGRST116') {
        // Создаем новую запись
        const { data: newSettings, error: createError } = await supabase
          .from('site_settings')
          .insert({ rent_page_settings: settings })
          .select('id')
          .single();
          
        if (createError) throw createError;
        existingSettings = newSettings;
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Обновляем существующую запись
        const { error: updateError } = await supabase
          .from('site_settings')
          .update({ rent_page_settings: settings })
          .eq('id', existingSettings.id);
          
        if (updateError) throw updateError;
      }
      
      toast.success('Настройки аренды успешно сохранены');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  // Обработчики изменений
  const updateSettings = (updates: Partial<RentSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateContacts = (updates: Partial<ContactInfo>) => {
    setSettings(prev => ({
      ...prev,
      contacts: { ...prev.contacts, ...updates }
    }));
  };

  const updateMainPrices = (updates: Partial<RentSettings['main_prices']>) => {
    setSettings(prev => ({
      ...prev,
      main_prices: { ...prev.main_prices, ...updates }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек...</p>
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
            Управление арендой
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Настройте информацию о ваших помещениях для аренды
          </p>
        </div>

        {/* Статус и кнопка сохранения */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white dark:bg-dark-800 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSettings({ is_active: !settings.is_active })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                settings.is_active 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {settings.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {settings.is_active ? 'Страница активна' : 'Страница скрыта'}
            </button>
          </div>
          
          <button
            onClick={saveSettings}
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
          {/* Основные настройки */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl mr-4">
                <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Основная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Заголовок и описание страницы аренды</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы *
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => updateSettings({ title: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="Введите заголовок страницы аренды"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Описание страницы
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => updateSettings({ description: e.target.value })}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                  placeholder="Опишите ваши помещения для аренды..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Мета-описание (для SEO)
                </label>
                <textarea
                  value={settings.meta_description || ''}
                  onChange={(e) => updateSettings({ meta_description: e.target.value })}
                  rows={2}
                  maxLength={160}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                  placeholder="Краткое описание для поисковых систем (до 160 символов)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(settings.meta_description || '').length}/160 символов
                </p>
              </div>
            </div>
          </div>
          
          {/* Фотогалерея */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl mr-4">
                <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Фотогалерея</h2>
                <p className="text-gray-500 dark:text-gray-400">Загрузите фотографии ваших помещений</p>
              </div>
            </div>
            
            <PhotoManager
              photos={settings.photos}
              onChange={(photos) => updateSettings({ photos })}
            />
          </div>

          {/* Основные цены */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl mr-4">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Основные тарифы</h2>
                <p className="text-gray-500 dark:text-gray-400">Базовые цены на аренду</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Цена за час (€)
                </label>
                <input
                  type="number"
                  value={settings.main_prices.hourly || ''}
                  onChange={(e) => updateMainPrices({ hourly: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="25"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Цена за день (€)
                </label>
                <input
                  type="number"
                  value={settings.main_prices.daily || ''}
                  onChange={(e) => updateMainPrices({ daily: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="150"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Совет:</strong> Основные тарифы отображаются на странице аренды как главные предложения. 
                Дополнительные услуги можно настроить в разделе "Прайс-лист" ниже.
              </p>
            </div>
          </div>

          {/* Прайс-лист дополнительных услуг */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl mr-4">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Дополнительные услуги</h2>
                <p className="text-gray-500 dark:text-gray-400">Прайс-лист дополнительных услуг и оборудования</p>
              </div>
            </div>
            
            <PriceListManager
              pricelist={settings.pricelist}
              onChange={(pricelist) => updateSettings({ pricelist })}
            />
          </div>

          {/* Удобства */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl mr-4">
                <Home className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Удобства</h2>
                <p className="text-gray-500 dark:text-gray-400">Список доступных удобств в помещении</p>
              </div>
            </div>
            
            <ListManager
              items={settings.amenities}
              onChange={(amenities) => updateSettings({ amenities })}
              placeholder="Введите название удобства (например, Wi-Fi)"
              addButtonText="Добавить"
            />
          </div>

          {/* Включенные услуги */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 rounded-xl mr-4">
                <Home className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Включенные услуги</h2>
                <p className="text-gray-500 dark:text-gray-400">Услуги, которые включены в стоимость аренды</p>
              </div>
            </div>
            
            <ListManager
              items={settings.included_services}
              onChange={(included_services) => updateSettings({ included_services })}
              placeholder="Введите название включенной услуги"
              addButtonText="Добавить"
            />
          </div>

          {/* Контактная информация */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl mr-4">
                <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Контактная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Информация для связи и бронирования</p>
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
                  value={settings.contacts.email}
                  onChange={(e) => updateContacts({ email: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="info@sciencehub.site"
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
                  value={settings.contacts.phone}
                  onChange={(e) => updateContacts({ phone: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+381 123 456 789"
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
                  value={settings.contacts.address}
                  onChange={(e) => updateContacts({ address: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Science Hub, Панчево, Сербия"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ссылка на карту
                </label>
                <input
                  type="url"
                  value={settings.contacts.map_link || ''}
                  onChange={(e) => updateContacts({ map_link: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Часы работы
                </label>
                <input
                  type="text"
                  value={settings.contacts.working_hours || ''}
                  onChange={(e) => updateContacts({ working_hours: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00"
                />
              </div>
            </div>
          </div>

          {/* Статистика и превью */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-2xl p-8 border border-primary-200 dark:border-primary-700">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              📊 Статистика страницы
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {settings.photos.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Фотографий</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {settings.pricelist.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Доп. услуг</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {settings.amenities.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Удобств</div>
              </div>
              
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {settings.included_services.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Включ. услуг</div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4">
              <a
                href="/rent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Предварительный просмотр
              </a>
              
              {!settings.is_active && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg">
                  <EyeOff className="w-4 h-4" />
                  Страница скрыта от посетителей
                </div>
              )}
            </div>
          </div>

          {/* Плавающая кнопка сохранения для мобильных устройств */}
          <div className="fixed bottom-6 right-6 md:hidden">
            <button
              onClick={saveSettings}
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

export default AdminRent;
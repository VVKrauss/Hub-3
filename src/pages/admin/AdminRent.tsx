import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Edit, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Image as ImageIcon,
  Loader2,
  Home,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Info
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type PriceItem = {
  id: string;
  name: string;
  price: number;
  duration: string; // 'hour', 'day', 'week', 'month'
  description?: string;
};

type RentInfoSettings = {
  id: number;
  title: string;
  description: string | null;
  photos: string[] | null;
  pricelist: PriceItem[];
  contacts: {
    address: string;
    phone: string;
    email: string;
    map_link: string;
  } | null;
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="relative">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      <div className="absolute inset-0 w-8 h-8 border-2 border-primary-200 dark:border-primary-800 rounded-full"></div>
    </div>
    <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">Загрузка данных...</span>
  </div>
);

const AdminRent = () => {
  const [data, setData] = useState<RentInfoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<RentInfoSettings>>({});
  const [newPriceItem, setNewPriceItem] = useState<Omit<PriceItem, 'id'>>({
    name: '',
    price: 0,
    duration: 'hour',
    description: ''
  });
  
  // Photo management states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rent_info_settings')
        .select('*')
        .single();

      if (error) throw error;
      setData(data);
      setEditData(data || {});
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('rent_info_settings')
        .update(editData)
        .eq('id', data?.id);

      if (error) throw error;
      await fetchSettings();
      toast.success('Настройки успешно сохранены');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPriceItem = () => {
    if (!newPriceItem.name || newPriceItem.price <= 0) return;
    
    const updatedPricelist = [
      ...(editData.pricelist || []),
      {
        ...newPriceItem,
        id: Date.now().toString()
      }
    ];

    setEditData(prev => ({
      ...prev,
      pricelist: updatedPricelist
    }));

    setNewPriceItem({
      name: '',
      price: 0,
      duration: 'hour',
      description: ''
    });
  };

  const handleRemovePriceItem = (id: string) => {
    const updatedPricelist = (editData.pricelist || []).filter(item => item.id !== id);
    setEditData(prev => ({
      ...prev,
      pricelist: updatedPricelist
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleContactsChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setEditData(prev => ({
      ...prev,
      contacts: {
        ...(prev.contacts || {}),
        [field]: e.target.value
      }
    }));
  };

  const handlePriceItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setNewPriceItem(prev => ({
      ...prev,
      [field]: field === 'price' ? Number(e.target.value) : e.target.value
    }));
  };

  // Photo management functions
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Файл слишком большой. Максимальный размер 5MB.');
        return;
      }
      
      await uploadPhoto(file);
    }
  };

  const uploadPhoto = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filename = `${timestamp}.${fileExt}`;
      const filePath = `rent_photos/${filename}`;
      
      // Upload to Supabase Storage in images bucket with rent_photos folder
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      // Update photos array
      const updatedPhotos = [...(editData.photos || []), publicUrlData.publicUrl];
      setEditData(prev => ({
        ...prev,
        photos: updatedPhotos
      }));
      
      toast.success('Фото успешно загружено');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      // Extract filename from URL for images bucket with rent_photos folder
      const urlParts = photoUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filePath = `rent_photos/${filename}`;
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove([filePath]);
      
      if (deleteError) throw deleteError;
      
      // Update photos array
      const updatedPhotos = (editData.photos || []).filter(url => url !== photoUrl);
      setEditData(prev => ({
        ...prev,
        photos: updatedPhotos
      }));
      
      toast.success('Фото успешно удалено');
    } catch (err) {
      console.error('Error deleting photo:', err);
      toast.error('Ошибка при удалении фото');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-yellow-600 dark:text-yellow-400 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              Настройки аренды не найдены. Создайте новую запись.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление арендой
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Настройте информацию о ваших помещениях для аренды
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
          {/* Main Settings Section */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl mr-4">
                <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Основные настройки</h2>
                <p className="text-gray-500 dark:text-gray-400">Заголовок и описание страницы аренды</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Заголовок страницы</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => handleChange(e, 'title')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="Введите заголовок страницы аренды"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Описание страницы</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => handleChange(e, 'description')}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                  placeholder="Опишите ваши помещения для аренды..."
                />
              </div>
            </div>
          </div>
          
          {/* Photo Gallery Section */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl mr-4">
                <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Фотогалерея</h2>
                <p className="text-gray-500 dark:text-gray-400">Загрузите фотографии ваших помещений</p>
              </div>
            </div>
            
            {/* Photo Upload Section */}
            <div className="mb-8">
              <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-600/30 hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-200">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                  </div>
                  {isUploading ? (
                    <div>
                      <p className="text-primary-600 dark:text-primary-400 font-semibold mb-2">
                        Загрузка фотографии...
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
                        <div className="bg-primary-500 h-2 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
                      >
                        Нажмите для загрузки фото
                      </button>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        или перетащите файл сюда
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        JPG, PNG (максимум 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Current Photos */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Текущие фотографии</h4>
              {(editData.photos && editData.photos.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {editData.photos.map((photoUrl, index) => (
                    <div key={index} className="group relative">
                      <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300">
                        <img
                          src={photoUrl}
                          alt={`Rent photo ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <button
                        onClick={() => deletePhoto(photoUrl)}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 shadow-lg"
                        title="Удалить фото"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Нет загруженных фотографий</h3>
                  <p className="text-gray-500 dark:text-gray-400">Добавьте фотографии ваших помещений</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Price List Section */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl mr-4">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Прайс-лист</h2>
                  <p className="text-gray-500 dark:text-gray-400">Варианты аренды и цены</p>
                </div>
              </div>
              <button
                onClick={handleAddPriceItem}
                disabled={!newPriceItem.name || newPriceItem.price <= 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-heading disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Plus className="w-5 h-5" />
                Добавить вариант
              </button>
            </div>
            
            {/* Add New Price Item */}
            <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Добавить новый вариант</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Название</label>
                  <input
                    type="text"
                    value={newPriceItem.name}
                    onChange={(e) => handlePriceItemChange(e, 'name')}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                    placeholder="Стандартный зал"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Цена (₽)</label>
                  <input
                    type="number"
                    value={newPriceItem.price}
                    onChange={(e) => handlePriceItemChange(e, 'price')}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Период</label>
                  <select
                    value={newPriceItem.duration}
                    onChange={(e) => handlePriceItemChange(e, 'duration')}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  >
                    <option value="hour">Почасово</option>
                    <option value="day">Посуточно</option>
                    <option value="week">Понедельно</option>
                    <option value="month">Помесячно</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Описание</label>
                  <input
                    type="text"
                    value={newPriceItem.description || ''}
                    onChange={(e) => handlePriceItemChange(e, 'description')}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                    placeholder="Дополнительная информация"
                  />
                </div>
              </div>
            </div>
            
            {/* Price List Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Название</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Цена</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Период</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Описание</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(editData.pricelist || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Нет вариантов аренды</h3>
                          <p className="text-gray-500 dark:text-gray-400">Добавьте варианты аренды с ценами</p>
                        </td>
                      </tr>
                    ) : (
                      (editData.pricelist || []).map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              {item.price.toLocaleString('ru-RU')} ₽
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {{
                                hour: 'Час',
                                day: 'День',
                                week: 'Неделя',
                                month: 'Месяц'
                              }[item.duration]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                              {item.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleRemovePriceItem(item.id)}
                              className="inline-flex items-center justify-center w-8 h-8 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 transform hover:scale-110"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Contacts Section */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl mr-4">
                <Phone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Контактная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Способы связи для аренды</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Адрес
                </label>
                <input
                  type="text"
                  value={editData.contacts?.address || ''}
                  onChange={(e) => handleContactsChange(e, 'address')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all duration-200"
                  placeholder="г. Москва, ул. Примерная, д. 1"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-orange-500" />
                  Телефон
                </label>
                <input
                  type="tel"
                  value={editData.contacts?.phone || ''}
                  onChange={(e) => handleContactsChange(e, 'phone')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all duration-200"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-orange-500" />
                  Email
                </label>
                <input
                  type="email"
                  value={editData.contacts?.email || ''}
                  onChange={(e) => handleContactsChange(e, 'email')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all duration-200"
                  placeholder="example@mail.com"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Ссылка на карту
                </label>
                <input
                  type="url"
                  value={editData.contacts?.map_link || ''}
                  onChange={(e) => handleContactsChange(e, 'map_link')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all duration-200"
                  placeholder="https://yandex.ru/maps/..."
                />
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Загружено фото</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{(editData.photos || []).length}</p>
                </div>
                <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-xl">
                  <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Вариантов аренды</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{(editData.pricelist || []).length}</p>
                </div>
                <div className="p-3 bg-green-200 dark:bg-green-800 rounded-xl">
                  <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Мин. цена</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {(editData.pricelist || []).length > 0 
                      ? `${Math.min(...(editData.pricelist || []).map(item => item.price)).toLocaleString('ru-RU')} ₽`
                      : '—'
                    }
                  </p>
                </div>
                <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-xl">
                  <Home className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Save Button for Mobile */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <button
            onClick={handleSave}
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
  );
};

export default AdminRent;
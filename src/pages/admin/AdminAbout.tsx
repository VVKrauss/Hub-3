// src/pages/admin/AdminAbout.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Save, Loader2, Plus, Trash2, Info, Upload, X } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface PriceItem {
  id?: string;
  name: string;
  price: number;
  duration: string;
  description?: string;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
}

interface RentSettings {
  id?: string;
  title?: string;
  description?: string;
  contacts?: ContactInfo;
  pricelist?: PriceItem[];
  photos?: string[];
}

const AdminAbout = () => {
  const [data, setData] = useState<RentSettings | null>(null);
  const [editData, setEditData] = useState<RentSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPriceItem, setNewPriceItem] = useState<PriceItem>({
    name: '',
    price: 0,
    duration: 'hour',
    description: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const cropperRef = useRef<Cropper>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Получаем данные из консолидированной таблицы site_settings
      const { data: settingsData, error } = await supabase
        .from('site_settings')
        .select('rent_info_settings')
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        // Если нет записи, создаем дефолтную структуру
        if (error.code === 'PGRST116') {
          const defaultData: RentSettings = {
            title: 'Аренда помещений',
            description: 'Описание услуг аренды',
            contacts: {
              email: 'rent@sciencehub.rs',
              phone: '+381 XX XXX XXXX',
              address: 'Адрес',
              workingHours: '9:00 - 18:00'
            },
            pricelist: [],
            photos: []
          };
          setData(defaultData);
          setEditData(defaultData);
          return;
        }
        throw error;
      }
      
      // Извлекаем данные аренды из консолидированной структуры
      const rentData = settingsData?.rent_info_settings || {};
      setData(rentData);
      setEditData(rentData);
      
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
      
      // Получаем ID записи site_settings
      const { data: currentSettings, error: fetchError } = await supabase
        .from('site_settings')
        .select('id')
        .single();
      
      if (fetchError) {
        console.error('Error fetching site settings ID:', fetchError);
        throw fetchError;
      }
      
      // Обновляем только поле rent_info_settings в консолидированной таблице
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          rent_info_settings: editData 
        })
        .eq('id', currentSettings.id);

      if (error) throw error;
      
      // Обновляем локальное состояние
      setData(editData);
      toast.success('Настройки успешно сохранены');
      
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPriceItem = () => {
    if (!newPriceItem.name || newPriceItem.price <= 0) {
      toast.error('Заполните название и цену');
      return;
    }
    
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
      
      // Check file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Файл слишком большой. Максимальный размер 5MB.');
        return;
      }
      
      setSelectedFile(file);
      setShowCropper(true);
    }
  };

  const handleCropComplete = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      setCroppedImage(croppedCanvas.toDataURL('image/jpeg', 0.8));
    }
  };

  const uploadPhoto = async () => {
    if (!croppedImage || !selectedFile) return;
    
    try {
      setIsUploading(true);
      
      // Convert data URL to Blob
      const blob = await fetch(croppedImage).then(res => res.blob());
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `rent-${timestamp}.${fileExt}`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`rent/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(`rent/${fileName}`);

      const photoUrl = publicUrlData.publicUrl;

      // Add to photos array
      const updatedPhotos = [...(editData.photos || []), photoUrl];
      setEditData(prev => ({
        ...prev,
        photos: updatedPhotos
      }));

      setShowCropper(false);
      setCroppedImage(null);
      setSelectedFile(null);
      toast.success('Фото успешно загружено');

    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Ошибка при загрузке фото');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (photoUrl: string) => {
    const updatedPhotos = (editData.photos || []).filter(url => url !== photoUrl);
    setEditData(prev => ({
      ...prev,
      photos: updatedPhotos
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

          {/* Contact Information */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading mb-6">Контактная информация</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editData.contacts?.email || ''}
                  onChange={(e) => handleContactsChange(e, 'email')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="contact@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Телефон</label>
                <input
                  type="tel"
                  value={editData.contacts?.phone || ''}
                  onChange={(e) => handleContactsChange(e, 'phone')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+381 XX XXX XXXX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Адрес</label>
                <input
                  type="text"
                  value={editData.contacts?.address || ''}
                  onChange={(e) => handleContactsChange(e, 'address')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Адрес локации"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Часы работы</label>
                <input
                  type="text"
                  value={editData.contacts?.workingHours || ''}
                  onChange={(e) => handleContactsChange(e, 'workingHours')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Пн-Пт: 9:00-18:00"
                />
              </div>
            </div>
          </div>

          {/* Price List */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading mb-6">Прайс-лист</h2>
            
            {/* Add new price item */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <input
                type="text"
                placeholder="Название услуги"
                value={newPriceItem.name}
                onChange={(e) => handlePriceItemChange(e, 'name')}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                placeholder="Цена"
                value={newPriceItem.price}
                onChange={(e) => handlePriceItemChange(e, 'price')}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <select
                value={newPriceItem.duration}
                onChange={(e) => handlePriceItemChange(e, 'duration')}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="hour">за час</option>
                <option value="day">за день</option>
                <option value="week">за неделю</option>
                <option value="month">за месяц</option>
              </select>
              <input
                type="text"
                placeholder="Описание (опционально)"
                value={newPriceItem.description}
                onChange={(e) => handlePriceItemChange(e, 'description')}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddPriceItem}
                className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Price list items */}
            <div className="space-y-3">
              {(editData.pricelist || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.price} RSD {item.duration} {item.description && `• ${item.description}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePriceItem(item.id!)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading mb-6">Фотогалерея</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(editData.photos || []).map((photo, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={photo} 
                    alt={`Rent photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => removePhoto(photo)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
              >
                <Upload className="w-8 h-8 mb-2" />
                <span>Добавить фото</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropper && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-2xl w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Обрезать изображение</h3>
            
            <div className="mb-4">
              <Cropper
                ref={cropperRef}
                src={URL.createObjectURL(selectedFile)}
                style={{ height: 400, width: '100%' }}
                aspectRatio={16 / 9}
                preview=".img-preview"
                guides={false}
                onInitialized={handleCropComplete}
                onCrop={handleCropComplete}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCropper(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={uploadPhoto}
                disabled={isUploading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isUploading ? 'Загрузка...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAbout;
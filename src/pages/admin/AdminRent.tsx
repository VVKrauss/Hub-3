import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Save, Loader2, Info, ImageIcon, Plus, X, DollarSign, Home, MapPin, Phone, Mail } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface PriceItem {
  id: number;
  name: string;
  price: number;
  duration: 'hour' | 'day' | 'week' | 'month';
  description?: string;
}

interface RentPageSettings {
  title: string;
  description: string;
  photos: string[];
  amenities: string[];
  pricelist: PriceItem[];
  contacts: {
    address: string;
    phone: string;
    email: string;
    map_link?: string;
  };
  main_prices: {
    hourly?: number;
    daily?: number;
  };
  included_services: string[];
}

const AdminRent = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<RentPageSettings>({
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
    included_services: []
  });

  // Функции для работы с фотографиями
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10MB');
        return;
      }
      setSelectedFile(file);
      setShowCropper(true);
    }
  };

  const onCropComplete = async (croppedArea: any, croppedAreaPixels: any) => {
    if (!selectedFile) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const image = new Image();
      image.src = URL.createObjectURL(selectedFile);
      
      image.onload = () => {
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;
        
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );
        
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            setCroppedImage(croppedUrl);
          }
        }, 'image/jpeg', 0.8);
      };
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const uploadPhoto = async () => {
    if (!croppedImage || !selectedFile) return;

    try {
      setIsUploading(true);
      
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `rent-${timestamp}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`rent/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(`rent/${fileName}`);

      const photoUrl = publicUrlData.publicUrl;

      setEditData(prev => ({
        ...prev,
        photos: [...prev.photos, photoUrl]
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
    setEditData(prev => ({
      ...prev,
      photos: prev.photos.filter(url => url !== photoUrl)
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
          {/* Основные настройки */}
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
                  value={editData.title}
                  onChange={(e) => handleChange(e, 'title')}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                  placeholder="Введите заголовок страницы аренды"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Описание страницы</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => handleChange(e, 'description')}
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200 resize-none"
                  placeholder="Опишите ваши помещения для аренды..."
                />
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Фотогалерея</h2>
                <p className="text-gray-500 dark:text-gray-400">Загрузите фотографии ваших помещений</p>
              </div>
            </div>
            
            {/* Загрузка фото */}
            <div className="mb-8">
              {showCropper ? (
                <div className="space-y-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Обрезка изображения</h4>
                  
                  <div className="h-64 w-full relative rounded-lg overflow-hidden">
                    <Cropper
                      image={selectedFile ? URL.createObjectURL(selectedFile) : ''}
                      crop={crop}
                      zoom={zoom}
                      aspect={16/9}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={uploadPhoto}
                      disabled={isUploading || !croppedImage}
                      className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {isUploading ? 'Загрузка...' : 'Загрузить фото'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCropper(false);
                        setSelectedFile(null);
                        setCroppedImage(null);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 transition-colors text-center"
                >
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Нажмите для загрузки фото</p>
                  <p className="text-sm text-gray-500">PNG, JPG до 10MB</p>
                </button>
              )}
            </div>

            {/* Галерея загруженных фото */}
            {editData.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {editData.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(photo)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Основные цены */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl mr-4">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Основные цены</h2>
                <p className="text-gray-500 dark:text-gray-400">Базовые тарифы аренды</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Цена за час (€)</label>
                <input
                  type="number"
                  value={editData.main_prices.hourly || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    main_prices: { ...prev.main_prices, hourly: Number(e.target.value) }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="25"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Цена за день (€)</label>
                <input
                  type="number"
                  value={editData.main_prices.daily || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    main_prices: { ...prev.main_prices, daily: Number(e.target.value) }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="150"
                />
              </div>
            </div>
          </div>

          {/* Прайс-лист */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl mr-4">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Дополнительные услуги</h2>
                  <p className="text-gray-500 dark:text-gray-400">Прайс-лист дополнительных услуг</p>
                </div>
              </div>
              <button
                onClick={addPriceItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить услугу
              </button>
            </div>

            <div className="space-y-4">
              {editData.pricelist.map((item) => (
                <div key={item.id} className="border dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium">Услуга</h3>
                    <button
                      onClick={() => removePriceItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Название</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updatePriceItem(item.id, 'name', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="Название услуги"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Цена (€)</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePriceItem(item.id, 'price', Number(e.target.value))}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Период</label>
                      <select
                        value={item.duration}
                        onChange={(e) => updatePriceItem(item.id, 'duration', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                      >
                        <option value="hour">час</option>
                        <option value="day">день</option>
                        <option value="week">неделя</option>
                        <option value="month">месяц</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Описание</label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updatePriceItem(item.id, 'description', e.target.value)}
                        className="w-full p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700"
                        placeholder="Описание услуги"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {editData.pricelist.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Нет дополнительных услуг. Нажмите "Добавить услугу" чтобы начать.
                </div>
              )}
            </div>
          </div>

          {/* Удобства */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl mr-4">
                  <Home className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Удобства</h2>
                  <p className="text-gray-500 dark:text-gray-400">Список доступных удобств</p>
                </div>
              </div>
              <button
                onClick={addAmenity}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить удобство
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {editData.amenities.map((amenity, index) => (
                <div key={index} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full">
                  <span>{amenity}</span>
                  <button
                    onClick={() => removeAmenity(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {editData.amenities.length === 0 && (
                <div className="text-gray-500 text-center w-full py-4">
                  Нет удобств. Нажмите "Добавить удобство" чтобы начать.
                </div>
              )}
            </div>
          </div>

          {/* Включенные услуги */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 rounded-xl mr-4">
                  <Home className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Включенные услуги</h2>
                  <p className="text-gray-500 dark:text-gray-400">Услуги, включенные в стоимость аренды</p>
                </div>
              </div>
              <button
                onClick={addIncludedService}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить услугу
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {editData.included_services.map((service, index) => (
                <div key={index} className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full">
                  <span>{service}</span>
                  <button
                    onClick={() => removeIncludedService(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {editData.included_services.length === 0 && (
                <div className="text-gray-500 text-center w-full py-4">
                  Нет включенных услуг. Нажмите "Добавить услугу" чтобы начать.
                </div>
              )}
            </div>
          </div>

          {/* Контакты */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl mr-4">
                <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Контактная информация</h2>
                <p className="text-gray-500 dark:text-gray-400">Контакты для бронирования</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={editData.contacts.email}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, email: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="info@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Телефон
                </label>
                <input
                  type="tel"
                  value={editData.contacts.phone}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, phone: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+381 XX XXX XXXX"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Адрес
                </label>
                <input
                  type="text"
                  value={editData.contacts.address}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, address: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Введите адрес"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ссылка на карту (опционально)
                </label>
                <input
                  type="url"
                  value={editData.contacts.map_link || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, map_link: e.target.value }
                  }))}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRent; Состояния для работы с изображениями
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Читаем из правильного поля - rent_page_settings
      const { data: settingsData, error } = await supabase
        .from('site_settings')
        .select('rent_page_settings')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Нет данных, используем дефолтные
          const defaultData: RentPageSettings = {
            title: 'Аренда пространства Science Hub',
            description: 'Современное пространство для проведения ваших мероприятий, встреч и презентаций.',
            photos: [],
            amenities: ['Wi-Fi', 'Проектор', 'Звуковая система'],
            pricelist: [],
            contacts: {
              address: 'Science Hub, Панчево, Сербия',
              phone: '+381 123 456 789',
              email: 'info@sciencehub.site'
            },
            main_prices: {
              hourly: 25,
              daily: 150
            },
            included_services: ['Wi-Fi', 'Проектор', 'Звуковая система', 'Кондиционер']
          };
          setEditData(defaultData);
          return;
        }
        throw error;
      }
      
      // Извлекаем данные аренды
      const rentData = settingsData?.rent_page_settings || {};
      setEditData({
        title: rentData.title || 'Аренда пространства Science Hub',
        description: rentData.description || '',
        photos: rentData.photos || [],
        amenities: rentData.amenities || [],
        pricelist: rentData.pricelist || [],
        contacts: rentData.contacts || { address: '', phone: '', email: '' },
        main_prices: rentData.main_prices || {},
        included_services: rentData.included_services || []
      });
      
    } catch (err) {
      console.error('Error fetching rent settings:', err);
      toast.error('Не удалось загрузить настройки аренды');
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
      
      // Обновляем поле rent_page_settings
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          rent_page_settings: editData 
        })
        .eq('id', currentSettings.id);

      if (error) throw error;
      
      toast.success('Настройки аренды успешно сохранены');
      
    } catch (err) {
      console.error('Error saving rent settings:', err);
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

  // Функции для работы с прайс-листом
  const addPriceItem = () => {
    const newItem: PriceItem = {
      id: Date.now(),
      name: '',
      price: 0,
      duration: 'hour',
      description: ''
    };
    setEditData(prev => ({
      ...prev,
      pricelist: [...prev.pricelist, newItem]
    }));
  };

  const updatePriceItem = (id: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      pricelist: prev.pricelist.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removePriceItem = (id: number) => {
    setEditData(prev => ({
      ...prev,
      pricelist: prev.pricelist.filter(item => item.id !== id)
    }));
  };

  // Функции для работы с удобствами
  const addAmenity = () => {
    const amenity = prompt('Введите название удобства:');
    if (amenity && amenity.trim()) {
      setEditData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity.trim()]
      }));
    }
  };

  const removeAmenity = (index: number) => {
    setEditData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  // Функции для работы с включенными услугами
  const addIncludedService = () => {
    const service = prompt('Введите название услуги:');
    if (service && service.trim()) {
      setEditData(prev => ({
        ...prev,
        included_services: [...prev.included_services, service.trim()]
      }));
    }
  };

  const removeIncludedService = (index: number) => {
    setEditData(prev => ({
      ...prev,
      included_services: prev.included_services.filter((_, i) => i !== index)
    }));
  };

  //
// src/pages/admin/AdminCoworking.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, Save, X, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type CoworkingService = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц' | 'Страница';
  active: boolean;
  image_url: string;
  order: number;
  main_service: boolean;
};

type CoworkingHeader = {
  id?: string;
  title: string;
  description: string;
  address?: string;
  phone?: string;
  working_hours?: string;
};

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

const AdminCoworking = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [headerData, setHeaderData] = useState<CoworkingHeader>({ 
    title: '', 
    description: '',
    address: '',
    phone: '',
    working_hours: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CoworkingService> | null>(null);
  const [newService, setNewService] = useState<Omit<CoworkingService, 'id' | 'order'>>({
    name: '',
    description: '',
    price: 0,
    currency: 'euro',
    period: 'час',
    active: true,
    image_url: '',
    main_service: true
  });
  const [showForm, setShowForm] = useState(false);

  // Image crop states
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
    }
  }, [completedCrop]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем услуги коворкинга (эта таблица осталась)
      const { data: servicesData, error: servicesError } = await supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
      
      // Загружаем заголовок из консолидированной таблицы site_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('coworking_header_settings')
        .single();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
        // Если нет записи, создаем дефолтную структуру
        if (settingsError.code === 'PGRST116') {
          const defaultHeader: CoworkingHeader = {
            title: 'Коворкинг пространство',
            description: 'Комфортные рабочие места для исследователей и стартапов',
            address: 'Сараевская, 48',
            phone: '+381',
            working_hours: '10:00-18:00'
          };
          setHeaderData(defaultHeader);
          return;
        }
        throw settingsError;
      }
      
      // Извлекаем данные заголовка коворкинга из консолидированной структуры
      const headerFromSettings = settingsData?.coworking_header_settings || {};
      setHeaderData({
        title: headerFromSettings.title || '',
        description: headerFromSettings.description || '',
        address: headerFromSettings.address || '',
        phone: headerFromSettings.phone || '',
        working_hours: headerFromSettings.working_hours || ''
      });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не удалось загрузить данные');
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9));
  };

  const canvasPreview = async (
    image: HTMLImageElement,
    canvas: HTMLCanvasElement,
    crop: PixelCrop,
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    ctx.save();
    ctx.drawImage(
      image,
      cropX,
      cropY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height,
    );
    ctx.restore();
  };

  const uploadImage = async () => {
    if (!previewCanvasRef.current || !completedCrop) return;

    try {
      setUploading(true);

      previewCanvasRef.current.toBlob(async (blob) => {
        if (!blob) return;

        const timestamp = Date.now();
        const fileName = `coworking-${timestamp}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(`coworking/${fileName}`, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(`coworking/${fileName}`);

        const publicUrl = publicUrlData.publicUrl;

        if (editData) {
          setEditData({ ...editData, image_url: publicUrl });
        } else {
          setNewService({ ...newService, image_url: publicUrl });
        }

        setImgSrc('');
        setUploading(false);
        toast.success('Изображение успешно загружено');
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Ошибка при загрузке изображения');
      setUploading(false);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  const handleSaveHeader = async () => {
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
      
      // Обновляем заголовок коворкинга в консолидированной таблице
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          coworking_header_settings: headerData 
        })
        .eq('id', currentSettings.id);

      if (error) throw error;
      
      toast.success('Заголовок успешно сохранен');
      setError(null);
    } catch (err) {
      console.error('Error saving header:', err);
      setError('Ошибка при сохранении заголовка');
      toast.error('Ошибка при сохранении заголовка');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveService = async () => {
    try {
      if (!editData) return;

      const { error } = await supabase
        .from('coworking_info_table')
        .update(editData)
        .eq('id', editData.id);

      if (error) throw error;
      
      await fetchData();
      setEditData(null);
      setShowForm(false);
      toast.success('Услуга успешно обновлена');
    } catch (err) {
      console.error('Error saving service:', err);
      setError('Ошибка при сохранении');
      toast.error('Ошибка при сохранении');
    }
  };

  const handleAddService = async () => {
    try {
      if (!newService.name || newService.price <= 0) {
        toast.error('Заполните название и цену');
        return;
      }

      const maxOrder = services.reduce((max, service) => 
        service.order > max ? service.order : max, 0
      );

      const serviceToAdd = {
        ...newService,
        order: maxOrder + 1
      };

      const { error } = await supabase
        .from('coworking_info_table')
        .insert([serviceToAdd]);

      if (error) throw error;

      await fetchData();
      setNewService({
        name: '',
        description: '',
        price: 0,
        currency: 'euro',
        period: 'час',
        active: true,
        image_url: '',
        main_service: true
      });
      setShowForm(false);
      toast.success('Услуга успешно добавлена');
    } catch (err) {
      console.error('Error adding service:', err);
      setError('Ошибка при добавлении');
      toast.error('Ошибка при добавлении');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу?')) return;

    try {
      const { error } = await supabase
        .from('coworking_info_table')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchData();
      toast.success('Услуга удалена');
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Ошибка при удалении');
      toast.error('Ошибка при удалении');
    }
  };

  const moveService = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = services.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    try {
      const updates = [
        {
          id: services[currentIndex].id,
          order: services[newIndex].order
        },
        {
          id: services[newIndex].id,
          order: services[currentIndex].order
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('coworking_info_table')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }

      await fetchData();
    } catch (err) {
      console.error('Error moving service:', err);
      setError('Ошибка при перемещении');
      toast.error('Ошибка при перемещении');
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Управление коворкингом
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Настройте информацию о коворкинг пространстве и услугах
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Header Settings */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">
              Настройки заголовка
            </h2>
            <button
              onClick={handleSaveHeader}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить заголовок
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={headerData.title}
                onChange={(e) => setHeaderData({...headerData, title: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Название коворкинг пространства"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={headerData.address || ''}
                onChange={(e) => setHeaderData({...headerData, address: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Адрес коворкинга"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Телефон
              </label>
              <input
                type="text"
                value={headerData.phone || ''}
                onChange={(e) => setHeaderData({...headerData, phone: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+381 XX XXX XXXX"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Часы работы
              </label>
              <input
                type="text"
                value={headerData.working_hours || ''}
                onChange={(e) => setHeaderData({...headerData, working_hours: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="10:00-18:00"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={headerData.description}
                onChange={(e) => setHeaderData({...headerData, description: e.target.value})}
                rows={4}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                placeholder="Описание коворкинг пространства"
              />
            </div>
          </div>
        </div>

        {/* Services Management */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">
              Управление услугами
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              Добавить услугу
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск услуг..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Services List */}
          <div className="space-y-4">
            {filteredServices.map((service, index) => (
              <div key={service.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        service.active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {service.active ? 'Активна' : 'Неактивна'}
                      </span>
                      {service.main_service && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                          Основная
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{service.description}</p>
                    <p className="text-lg font-semibold text-primary-600">
                      {service.price} {service.currency} / {service.period}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                  onClick={editData ? handleSaveService : handleAddService}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editData ? 'Сохранить изменения' : 'Добавить услугу'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCoworking;
                      onClick={() => moveService(service.id, 'up')}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveService(service.id, 'down')}
                      disabled={index === services.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditData(service)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {service.image_url && (
                  <div className="mt-4">
                    <img 
                      src={service.image_url} 
                      alt={service.name}
                      className="w-32 h-20 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Service Modal */}
        {(showForm || editData) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editData ? 'Редактировать услугу' : 'Добавить услугу'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditData(null);
                    setImgSrc('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название услуги
                  </label>
                  <input
                    type="text"
                    value={editData ? editData.name || '' : newService.name}
                    onChange={(e) => editData 
                      ? setEditData({...editData, name: e.target.value})
                      : setNewService({...newService, name: e.target.value})
                    }
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Например: Рабочее место"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={editData ? editData.description || '' : newService.description}
                    onChange={(e) => editData 
                      ? setEditData({...editData, description: e.target.value})
                      : setNewService({...newService, description: e.target.value})
                    }
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Описание услуги"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена
                    </label>
                    <input
                      type="number"
                      value={editData ? editData.price || 0 : newService.price}
                      onChange={(e) => editData 
                        ? setEditData({...editData, price: Number(e.target.value)})
                        : setNewService({...newService, price: Number(e.target.value)})
                      }
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={editData ? editData.currency || 'euro' : newService.currency}
                      onChange={(e) => editData 
                        ? setEditData({...editData, currency: e.target.value as any})
                        : setNewService({...newService, currency: e.target.value as any})
                      }
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="euro">€</option>
                      <option value="RSD">RSD</option>
                      <option value="кофе">☕</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Период
                    </label>
                    <select
                      value={editData ? editData.period || 'час' : newService.period}
                      onChange={(e) => editData 
                        ? setEditData({...editData, period: e.target.value as any})
                        : setNewService({...newService, period: e.target.value as any})
                      }
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="час">час</option>
                      <option value="день">день</option>
                      <option value="месяц">месяц</option>
                      <option value="Страница">за страницу</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData ? editData.active ?? true : newService.active}
                      onChange={(e) => editData 
                        ? setEditData({...editData, active: e.target.checked})
                        : setNewService({...newService, active: e.target.checked})
                      }
                      className="mr-2"
                    />
                    Активная услуга
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData ? editData.main_service ?? true : newService.main_service}
                      onChange={(e) => editData 
                        ? setEditData({...editData, main_service: e.target.checked})
                        : setNewService({...newService, main_service: e.target.checked})
                      }
                      className="mr-2"
                    />
                    Основная услуга
                  </label>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображение
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectFile}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  
                  {imgSrc && (
                    <div className="mt-4 space-y-4">
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={16 / 9}
                      >
                        <img
                          ref={imgRef}
                          alt="Crop me"
                          src={imgSrc}
                          style={{ transform: `scale(1) rotate(0deg)` }}
                          onLoad={onImageLoad}
                        />
                      </ReactCrop>
                      {completedCrop && (
                        <>
                          <div>
                            <canvas
                              ref={previewCanvasRef}
                              style={{
                                border: '1px solid black',
                                objectFit: 'contain',
                                width: completedCrop.width,
                                height: completedCrop.height,
                              }}
                            />
                          </div>
                          <button
                            onClick={uploadImage}
                            disabled={uploading}
                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                          >
                            {uploading ? 'Загрузка...' : 'Загрузить изображение'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {(editData?.image_url || newService.image_url) && (
                    <div className="mt-4">
                      <img 
                        src={editData?.image_url || newService.image_url} 
                        alt="Current image"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditData(null);
                    setImgSrc('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Отмена
                </button>
                <button
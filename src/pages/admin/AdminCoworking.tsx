import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, Save, X, Upload } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { canvasPreview } from './canvasPreview';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  id: string;
  title: string;
  description: string;
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
  const [headerData, setHeaderData] = useState<CoworkingHeader>({ id: '', title: '', description: '' });
  const [loading, setLoading] = useState(true);
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
      
      const { data: servicesData, error: servicesError } = await supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
      
      const { data: headerData, error: headerError } = await supabase
        .from('coworking_header')
        .select('*')
        .maybeSingle();

      if (headerError) throw headerError;
      setHeaderData(headerData || { id: '', title: '', description: '' });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerAspectCrop(width, height, 1);
    setCrop(newCrop);
  };

  const uploadImage = async () => {
    if (!previewCanvasRef.current || !completedCrop || !imgRef.current) return;

    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 500;
      canvas.height = 500;

      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        imgRef.current,
        cropX, cropY,
        cropWidth, cropHeight,
        0, 0,
        500,
        500
      );

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileExt = 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `coworking/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        if (editData?.id) {
          setEditData({ ...editData, image_url: publicUrl });
        } else {
          setNewService({ ...newService, image_url: publicUrl });
        }

        setImgSrc('');
        setUploading(false);
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Ошибка при загрузке изображения');
      setUploading(false);
    }
  };

  const handleSaveHeader = async () => {
    try {
      const dataToSave = { ...headerData };
      
      if (!dataToSave.id) {
        dataToSave.id = crypto.randomUUID();
      }

      if (headerData.id) {
        const { error } = await supabase
          .from('coworking_header')
          .update(dataToSave)
          .eq('id', headerData.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coworking_header')
          .insert([dataToSave]);
        
        if (error) throw error;
      }
      
      setHeaderData(dataToSave);
      setError(null);
    } catch (err) {
      console.error('Error saving header:', err);
      setError('Ошибка при сохранении заголовка');
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
    } catch (err) {
      console.error('Error saving service:', err);
      setError('Ошибка при сохранении');
    }
  };

  const handleAddService = async () => {
    try {
      if (!newService.name || newService.price <= 0) return;

      const maxOrder = services.reduce((max, service) => 
        service.order > max ? service.order : max, 0);

      const { data, error } = await supabase
        .from('coworking_info_table')
        .insert([{
          ...newService,
          order: maxOrder + 1
        }])
        .select();

      if (error) throw error;
      
      setServices(prev => [...prev, ...(data || [])]);
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
    } catch (err) {
      console.error('Error adding service:', err);
      setError('Ошибка при добавлении услуги');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coworking_info_table')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(prev => prev.filter(service => service.id !== id));
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Ошибка при удалении услуги');
    }
  };

  const handleMoveService = async (id: string, direction: 'up' | 'down') => {
    try {
      const index = services.findIndex(s => s.id === id);
      if (index === -1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= services.length) return;

      const tempOrder = services[index].order;
      const updatedServices = [...services];
      
      updatedServices[index].order = updatedServices[newIndex].order;
      updatedServices[newIndex].order = tempOrder;

      setServices(updatedServices.sort((a, b) => a.order - b.order));

      await supabase
        .from('coworking_info_table')
        .update({ order: updatedServices[index].order })
        .eq('id', updatedServices[index].id);

      await supabase
        .from('coworking_info_table')
        .update({ order: updatedServices[newIndex].order })
        .eq('id', updatedServices[newIndex].id);

    } catch (err) {
      console.error('Error moving service:', err);
      setError('Ошибка при изменении порядка');
    }
  };

const formatPrice = (service: CoworkingService) => {
  const currencySymbol = service.currency === 'euro' ? '€' : 
                        service.currency === 'кофе' ? '☕' : 'RSD';
  return `${service.price} ${currencySymbol}/${service.period}`;
};

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 dark:bg-dark-700 rounded"></div>
          <div className="h-12 bg-gray-200 dark:bg-dark-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-dark-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Управление услугами коворкинга
        </h2>
        <button
          onClick={() => {
            setEditData(null);
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
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Добавить услугу
        </button>
      </div>

      {/* Header Section */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <h3 className="font-medium mb-4 text-gray-900 dark:text-white">
            Заголовок страницы
          </h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Заголовок</label>
              <input
                type="text"
                value={headerData.title}
                onChange={(e) => setHeaderData({...headerData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Описание</label>
              <textarea
                value={headerData.description}
                onChange={(e) => setHeaderData({...headerData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveHeader}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Save size={18} className="inline mr-2" />
              Сохранить заголовок
            </button>
          </div>
        </div>
      </div>

      {/* Search and Services Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Поиск услуг..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700"
            />
          </div>
        </div>

        {/* Edit/Add Form */}
        {showForm && (
          <div className="p-6 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/30">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-white">
              {editData ? 'Редактирование услуги' : 'Добавление новой услуги'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Название</label>
                <input
                  type="text"
                  value={editData ? editData.name || '' : newService.name}
                  onChange={(e) => editData ? 
                    setEditData({...editData, name: e.target.value}) : 
                    setNewService({...newService, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Цена</label>
                <input
                  type="number"
                  value={editData ? editData.price || 0 : newService.price}
                  onChange={(e) => editData ? 
                    setEditData({...editData, price: Number(e.target.value)}) : 
                    setNewService({...newService, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Валюта</label>
               <select
                  value={editData ? editData.currency || 'euro' : newService.currency}
                  onChange={(e) => editData ? 
                    setEditData({...editData, currency: e.target.value as 'euro' | 'кофе' | 'RSD'}) : 
                    setNewService({...newService, currency: e.target.value as 'euro' | 'кофе' | 'RSD'})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
                >
                  <option value="euro">Евро (€)</option>
                  <option value="кофе">Кофе (☕)</option>
                  <option value="RSD">Серб. динар (RSD)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Период</label>
              <select
                    value={editData ? editData.period || 'час' : newService.period}
                    onChange={(e) => editData ? 
                      setEditData({...editData, period: e.target.value as 'час' | 'день' | 'месяц' | 'Страница'}) : 
                      setNewService({...newService, period: e.target.value as 'час' | 'день' | 'месяц' | 'Страница'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
                  >
                    <option value="час">Час</option>
                    <option value="день">День</option>
                    <option value="месяц">Месяц</option>
                    <option value="Страница">Страница</option>
                  </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Описание</label>
                <textarea
                  value={editData ? editData.description || '' : newService.description}
                  onChange={(e) => editData ? 
                    setEditData({...editData, description: e.target.value}) : 
                    setNewService({...newService, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-800"
                />
              </div>
              
              {/* Main Service Toggle */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editData ? editData.main_service !== false : newService.main_service !== false}
                    onChange={(e) => editData ? 
                      setEditData({...editData, main_service: e.target.checked}) : 
                      setNewService({...newService, main_service: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Основная услуга (если выключено - будет отображаться как дополнительная)
                  </span>
                </label>
              </div>
              
              {/* Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Изображение
                </label>
                
                {((editData?.image_url) || newService.image_url) && !imgSrc && (
                  <div className="mb-4">
                    <img 
                      src={editData ? editData.image_url : newService.image_url} 
                      alt="Current service" 
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                {imgSrc ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        onComplete={c => setCompletedCrop(c)}
                        aspect={1}
                        className="max-h-64"
                      >
                        <img
                          ref={imgRef}
                          alt="Crop me"
                          src={imgSrc}
                          onLoad={onImageLoad}
                          className="max-h-64"
                        />
                      </ReactCrop>
                    </div>
                    
                    {completedCrop && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Предпросмотр:</h4>
                        <canvas
                          ref={previewCanvasRef}
                          style={{
                            display: 'block',
                            objectFit: 'contain',
                            width: 150,
                            height: 150,
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setImgSrc('')}
                        className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={uploadImage}
                        disabled={!completedCrop || uploading}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {uploading ? 'Загрузка...' : 'Сохранить изображение'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg cursor-pointer transition-colors">
                      <Upload size={18} />
                      Загрузить новое изображение
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={onSelectFile} 
                        className="hidden"
                      />
                    </label>
                    
                    {((editData?.image_url) || newService.image_url) && (
                      <button
                        onClick={() => editData ? 
                          setEditData({...editData, image_url: ''}) : 
                          setNewService({...newService, image_url: ''})}
                        className="text-red-600 hover:text-red-700"
                      >
                        Удалить изображение
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editData ? editData.active !== false : newService.active}
                    onChange={(e) => editData ? 
                      setEditData({...editData, active: e.target.checked}) : 
                      setNewService({...newService, active: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Активна</span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditData(null);
                  setShowForm(false);
                  setImgSrc('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={editData ? handleSaveService : handleAddService}
                disabled={!editData?.name && !newService.name}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={18} className="inline mr-2" />
                {editData ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        )}

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Порядок</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Стоимость</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
              {services.filter(service => 
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                service.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => handleMoveService(service.id, 'up')} 
                        className="text-gray-500 hover:text-primary-600 p-1"
                        disabled={service.order === 1}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <span className="text-sm font-medium">{service.order}</span>
                      <button 
                        onClick={() => handleMoveService(service.id, 'down')}
                        className="text-gray-500 hover:text-primary-600 p-1"
                        disabled={service.order === services.length}
                      >
                        <ChevronDown size={18} />
                      
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {service.image_url && (
                        <img 
                          src={service.image_url} 
                          alt={service.name} 
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="line-clamp-2">{service.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.main_service ? 
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {service.main_service ? 'Основная' : 'Дополнительная'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatPrice(service)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.active ? 
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {service.active ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditData(service);
                          setShowForm(true);
                          setImgSrc('');
                        }}
                        className="text-primary-600 hover:text-primary-700"
                        title="Редактировать"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Удалить"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoworking;
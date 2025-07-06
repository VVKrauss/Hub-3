// src/pages/admin/AdminCoworking.tsx
// Обновленная версия для работы с новой схемой sh_site_settings

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, Save, X, Building2, Upload, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getCoworkingPageSettings, 
  updateCoworkingPageSettings,
  updateCoworkingService,
  deleteCoworkingService,
  reorderCoworkingServices,
  type CoworkingService, 
  type CoworkingPageSettings 
} from '../../api/coworking';

const AdminCoworking: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [pageSettings, setPageSettings] = useState<CoworkingPageSettings>({
    title: '',
    description: '',
    heroImage: '',
    address: '',
    phone: '',
    working_hours: '',
    email: '',
    telegram: '',
    services: [],
    mainServices: [],
    metaDescription: '',
    showBookingForm: true,
    bookingFormFields: ['name', 'contact', 'phone', 'comment']
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<CoworkingService | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'header' | 'services'>('header');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏢 Loading coworking admin data...');
      
      const response = await getCoworkingPageSettings();
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setPageSettings(response.data);
        setServices(response.data.services || []);
        console.log('✅ Coworking admin data loaded successfully');
      }
      
    } catch (err) {
      console.error('❌ Error loading coworking data:', err);
      setError('Не удалось загрузить данные');
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeader = async () => {
    try {
      setSaving(true);
      
      const response = await updateCoworkingPageSettings({
        title: pageSettings.title,
        description: pageSettings.description,
        heroImage: pageSettings.heroImage,
        address: pageSettings.address,
        phone: pageSettings.phone,
        working_hours: pageSettings.working_hours,
        email: pageSettings.email,
        telegram: pageSettings.telegram,
        metaDescription: pageSettings.metaDescription,
        showBookingForm: pageSettings.showBookingForm,
        bookingFormFields: pageSettings.bookingFormFields
      });

      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('Настройки страницы сохранены');
      setError(null);
    } catch (err) {
      console.error('Error saving header:', err);
      setError('Ошибка при сохранении настроек');
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveService = async () => {
    try {
      if (!editingService) return;

      const response = await updateCoworkingService(editingService);

      if (response.error) {
        throw new Error(response.error);
      }
      
      await fetchData(); // Перезагружаем данные
      setEditingService(null);
      setShowServiceForm(false);
      toast.success('Услуга успешно сохранена');
    } catch (err) {
      console.error('Error saving service:', err);
      toast.error('Ошибка при сохранении услуги');
    }
  };

  const handleAddService = () => {
    const newService: CoworkingService = {
      id: '', // Будет установлен в API
      name: '',
      description: '',
      price: 0,
      currency: 'euro',
      period: 'час',
      active: true,
      image_url: '',
      order: services.length,
      main_service: true
    };
    
    setEditingService(newService);
    setShowServiceForm(true);
  };

  const handleEditService = (service: CoworkingService) => {
    setEditingService({ ...service });
    setShowServiceForm(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Удалить услугу?')) return;

    try {
      const response = await deleteCoworkingService(serviceId);

      if (response.error) {
        throw new Error(response.error);
      }
      
      await fetchData(); // Перезагружаем данные
      toast.success('Услуга удалена');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Ошибка при удалении услуги');
    }
  };

  const moveService = async (serviceId: string, direction: 'up' | 'down') => {
    const currentIndex = services.findIndex(s => s.id === serviceId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    const newServices = [...services];
    [newServices[currentIndex], newServices[newIndex]] = [newServices[newIndex], newServices[currentIndex]];
    
    // Обновляем порядок
    const reorderedIds = newServices.map(s => s.id);
    
    try {
      const response = await reorderCoworkingServices(reorderedIds);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      await fetchData(); // Перезагружаем данные
    } catch (err) {
      console.error('Error reordering services:', err);
      toast.error('Ошибка при изменении порядка');
    }
  };

  const toggleServiceActive = async (service: CoworkingService) => {
    try {
      const response = await updateCoworkingService({
        ...service,
        active: !service.active
      });

      if (response.error) {
        throw new Error(response.error);
      }
      
      await fetchData(); // Перезагружаем данные
      toast.success(`Услуга ${!service.active ? 'активирована' : 'деактивирована'}`);
    } catch (err) {
      console.error('Error toggling service:', err);
      toast.error('Ошибка при изменении статуса услуги');
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление коворкингом
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Настройка страницы и услуг коворкинга
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            🔄 Использует новую систему (sh_site_settings)
          </p>
        </div>
      </div>

      {/* Табы */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('header')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'header'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Настройки страницы
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'services'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Услуги ({services.length})
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Вкладка настроек страницы */}
      {activeTab === 'header' && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Настройки страницы коворкинга
            </h2>
            <button
              onClick={handleSaveHeader}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Основная информация */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы
                </label>
                <input
                  type="text"
                  value={pageSettings.title}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Название коворкинга"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={pageSettings.description}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Краткое описание коворкинга"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фоновое изображение (URL)
                </label>
                <input
                  type="url"
                  value={pageSettings.heroImage}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, heroImage: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  META описание (для SEO)
                </label>
                <textarea
                  value={pageSettings.metaDescription}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                  rows={2}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Описание для поисковых систем"
                />
              </div>
            </div>

            {/* Контактная информация */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={pageSettings.address}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Адрес коворкинга"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={pageSettings.phone}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="+381 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Время работы
                </label>
                <input
                  type="text"
                  value={pageSettings.working_hours}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, working_hours: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="Пн-Пт: 9:00-22:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={pageSettings.email}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="info@coworking.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telegram
                </label>
                <input
                  type="text"
                  value={pageSettings.telegram}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, telegram: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                  placeholder="@coworking"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка услуг */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Поиск и добавление */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск услуг..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                />
              </div>
              
              <button
                onClick={handleAddService}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Добавить услугу
              </button>
            </div>
          </div>

          {/* Список услуг */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm overflow-hidden">
            {filteredServices.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'Услуги не найдены' : 'Нет услуг'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Попробуйте изменить критерии поиска' : 'Добавьте первую услугу коворкинга'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleAddService}
                    className="btn-primary"
                  >
                    Добавить услугу
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredServices.map((service, index) => (
                  <div key={service.id} className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Изображение */}
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {service.image_url ? (
                          <img
                            src={service.image_url.startsWith('http') 
                              ? service.image_url 
                              : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`
                            }
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Информация об услуге */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {service.name}
                              {service.main_service && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                  Основная
                                </span>
                              )}
                              {!service.active && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                  Неактивна
                                </span>
                              )}
                            </h3>
                            
                            {service.description && (
                              <p className="text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                {service.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                {service.price} {service.currency === 'euro' ? '€' : service.currency === 'кофе' ? '☕' : service.currency} / {service.period}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Порядок: {service.order}
                              </span>
                            </div>
                          </div>

                          {/* Действия */}
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => toggleServiceActive(service)}
                              className={`p-2 rounded-lg transition-colors ${
                                service.active 
                                  ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              title={service.active ? 'Деактивировать' : 'Активировать'}
                            >
                              {service.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            
                            <button
                              onClick={() => moveService(service.id, 'up')}
                              disabled={index === 0}
                              className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Переместить вверх"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => moveService(service.id, 'down')}
                              disabled={index === filteredServices.length - 1}
                              className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Переместить вниз"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleEditService(service)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              title="Редактировать"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно редактирования услуги */}
      {showServiceForm && editingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowServiceForm(false)}></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-dark-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-dark-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {editingService.id ? 'Редактировать услугу' : 'Новая услуга'}
                  </h3>
                  <button
                    onClick={() => setShowServiceForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Название услуги
                      </label>
                      <input
                        type="text"
                        value={editingService.name}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        placeholder="Название услуги"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Цена
                      </label>
                      <input
                        type="number"
                        value={editingService.price}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Валюта
                      </label>
                      <select
                        value={editingService.currency}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, currency: e.target.value as any } : null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="euro">Euro (€)</option>
                        <option value="RSD">RSD</option>
                        <option value="кофе">Кофе (☕)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Период
                      </label>
                      <select
                        value={editingService.period}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, period: e.target.value as any } : null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="час">Час</option>
                        <option value="день">День</option>
                        <option value="месяц">Месяц</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Описание
                    </label>
                    <textarea
                      value={editingService.description}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="Описание услуги (поддерживается HTML)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL изображения
                    </label>
                    <input
                      type="url"
                      value={editingService.image_url}
                      onChange={(e) => setEditingService(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="main_service"
                        checked={editingService.main_service}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, main_service: e.target.checked } : null)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="main_service" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Основная услуга
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={editingService.active}
                        onChange={(e) => setEditingService(prev => prev ? { ...prev, active: e.target.checked } : null)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Активная услуга
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4">
                  <button
                    onClick={() => setShowServiceForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveService}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingService.id ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoworking;
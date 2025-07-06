// src/pages/admin/AdminCoworking.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, Save, X, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Временные типы для начала (позже заменим на импорт из API)
interface CoworkingService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц' | 'страница';
  active: boolean;
  image_url?: string;
  order: number;
  main_service: boolean;
}

interface CoworkingHeader {
  title: string;
  description: string;
  address?: string;
  phone?: string;
  working_hours?: string;
}

interface CoworkingPageSettings {
  header: CoworkingHeader;
  services: CoworkingService[];
  lastUpdated: string;
}

const AdminCoworking: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSettings, setPageSettings] = useState<CoworkingPageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CoworkingService> | null>(null);
  const [headerData, setHeaderData] = useState<CoworkingHeader>({
    title: '',
    description: '',
    address: '',
    phone: '',
    working_hours: ''
  });
  const [newService, setNewService] = useState<Omit<CoworkingService, 'id' | 'order'>>({
    name: '',
    description: '',
    price: 0,
    currency: 'euro',
    period: 'час',
    active: true,
    image_url: '',
    main_service: false
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Временно используем дефолтные данные
      const defaultSettings: CoworkingPageSettings = {
        header: {
          title: 'Коворкинг пространство',
          description: 'Комфортные рабочие места для исследователей и стартапов',
          address: 'Сараевская, 48',
          phone: '+381',
          working_hours: '10:00-18:00'
        },
        services: [
          {
            id: '1',
            name: 'Почасовая аренда',
            description: 'Гибкий график работы по часам',
            price: 5,
            currency: 'euro',
            period: 'час',
            active: true,
            order: 1,
            main_service: false
          },
          {
            id: '2',
            name: 'Дневной абонемент',
            description: 'Полный рабочий день в коворкинге',
            price: 25,
            currency: 'euro',
            period: 'день',
            active: true,
            order: 2,
            main_service: true
          },
          {
            id: '3',
            name: 'Месячный абонемент',
            description: 'Неограниченный доступ на месяц',
            price: 200,
            currency: 'euro',
            period: 'месяц',
            active: true,
            order: 3,
            main_service: false
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      setPageSettings(defaultSettings);
      setHeaderData(defaultSettings.header);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не удалось загрузить данные');
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeader = async () => {
    try {
      setSaving(true);
      
      if (!pageSettings) return;
      
      const updatedSettings = {
        ...pageSettings,
        header: headerData,
        lastUpdated: new Date().toISOString()
      };
      
      setPageSettings(updatedSettings);
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
      if (!editData || !editData.id || !pageSettings) return;

      const updatedServices = pageSettings.services.map(service =>
        service.id === editData.id ? { ...service, ...editData } : service
      );

      const updatedSettings = {
        ...pageSettings,
        services: updatedServices,
        lastUpdated: new Date().toISOString()
      };

      setPageSettings(updatedSettings);
      setEditData(null);
      setShowForm(false);
      toast.success('Услуга успешно обновлена');
    } catch (err) {
      console.error('Error saving service:', err);
      toast.error('Ошибка при сохранении');
    }
  };

  const handleAddService = async () => {
    try {
      if (!newService.name || newService.price <= 0) {
        toast.error('Заполните название и цену');
        return;
      }

      if (!pageSettings) return;

      const newServiceWithId: CoworkingService = {
        ...newService,
        id: Date.now().toString(),
        order: Math.max(...pageSettings.services.map(s => s.order), 0) + 1
      };

      const updatedSettings = {
        ...pageSettings,
        services: [...pageSettings.services, newServiceWithId],
        lastUpdated: new Date().toISOString()
      };

      setPageSettings(updatedSettings);
      setNewService({
        name: '',
        description: '',
        price: 0,
        currency: 'euro',
        period: 'час',
        active: true,
        image_url: '',
        main_service: false
      });
      setShowForm(false);
      toast.success('Услуга успешно добавлена');
    } catch (err) {
      console.error('Error adding service:', err);
      toast.error('Ошибка при добавлении');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу?')) return;

    try {
      if (!pageSettings) return;

      const updatedServices = pageSettings.services.filter(service => service.id !== id);
      const updatedSettings = {
        ...pageSettings,
        services: updatedServices,
        lastUpdated: new Date().toISOString()
      };

      setPageSettings(updatedSettings);
      toast.success('Услуга удалена');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Ошибка при удалении');
    }
  };

  const moveService = async (id: string, direction: 'up' | 'down') => {
    try {
      if (!pageSettings) return;

      const services = [...pageSettings.services].sort((a, b) => a.order - b.order);
      const currentIndex = services.findIndex(s => s.id === id);
      
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= services.length) return;

      // Меняем местами порядковые номера
      const tempOrder = services[currentIndex].order;
      services[currentIndex].order = services[newIndex].order;
      services[newIndex].order = tempOrder;

      const updatedSettings = {
        ...pageSettings,
        services,
        lastUpdated: new Date().toISOString()
      };

      setPageSettings(updatedSettings);
    } catch (err) {
      console.error('Error moving service:', err);
      toast.error('Ошибка при перемещении');
    }
  };

  const services = pageSettings?.services || [];
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
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">
                Настройки заголовка
              </h2>
            </div>
            <button
              onClick={handleSaveHeader}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить
                </>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={headerData.title}
                onChange={(e) => setHeaderData({...headerData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="Название коворкинга"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Адрес
              </label>
              <input
                type="text"
                value={headerData.address || ''}
                onChange={(e) => setHeaderData({...headerData, address: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="Адрес коворкинга"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон
              </label>
              <input
                type="text"
                value={headerData.phone || ''}
                onChange={(e) => setHeaderData({...headerData, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="Телефон для связи"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Часы работы
              </label>
              <input
                type="text"
                value={headerData.working_hours || ''}
                onChange={(e) => setHeaderData({...headerData, working_hours: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="Например: 9:00-18:00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={headerData.description}
                onChange={(e) => setHeaderData({...headerData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                placeholder="Краткое описание коворкинга"
              />
            </div>
          </div>
        </div>

        {/* Services Management */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">
              Услуги коворкинга ({services.length})
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
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск услуг..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Services List */}
          <div className="space-y-4">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Услуги не найдены' : 'Услуги не добавлены'}
              </div>
            ) : (
              filteredServices
                .sort((a, b) => a.order - b.order)
                .map((service) => (
                  <div
                    key={service.id}
                    className={`p-6 border rounded-lg ${
                      service.main_service
                        ? 'border-primary-200 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {service.name}
                          </h3>
                          {service.main_service && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                              Основная
                            </span>
                          )}
                          {!service.active && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Неактивна
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                          {service.description}
                        </p>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {service.price} {service.currency} / {service.period}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => moveService(service.id, 'up')}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Переместить вверх"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveService(service.id, 'down')}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Переместить вниз"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditData(service);
                            setShowForm(true);
                          }}
                          className="p-2 text-blue-500 hover:text-blue-700"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-red-500 hover:text-red-700"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Service Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editData ? 'Редактировать услугу' : 'Добавить услугу'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditData(null);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Название *
                    </label>
                    <input
                      type="text"
                      value={editData ? editData.name || '' : newService.name}
                      onChange={(e) => {
                        if (editData) {
                          setEditData({...editData, name: e.target.value});
                        } else {
                          setNewService({...newService, name: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      placeholder="Название услуги"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена *
                    </label>
                    <input
                      type="number"
                      value={editData ? editData.price || 0 : newService.price}
                      onChange={(e) => {
                        const price = parseInt(e.target.value) || 0;
                        if (editData) {
                          setEditData({...editData, price});
                        } else {
                          setNewService({...newService, price});
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                      placeholder="Цена"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={editData ? editData.currency || 'euro' : newService.currency}
                      onChange={(e) => {
                        const currency = e.target.value as 'euro' | 'кофе' | 'RSD';
                        if (editData) {
                          setEditData({...editData, currency});
                        } else {
                          setNewService({...newService, currency});
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="euro">Euro (€)</option>
                      <option value="RSD">RSD</option>
                      <option value="кофе">Кофе</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Период
                    </label>
                    <select
                      value={editData ? editData.period || 'час' : newService.period}
                      onChange={(e) => {
                        const period = e.target.value as 'час' | 'день' | 'месяц' | 'страница';
                        if (editData) {
                          setEditData({...editData, period});
                        } else {
                          setNewService({...newService, period});
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    >
                      <option value="час">час</option>
                      <option value="день">день</option>
                      <option value="месяц">месяц</option>
                      <option value="страница">страница</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={editData ? editData.description || '' : newService.description}
                    onChange={(e) => {
                      if (editData) {
                        setEditData({...editData, description: e.target.value});
                      } else {
                        setNewService({...newService, description: e.target.value});
                      }
                    }}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder="Описание услуги"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL изображения
                  </label>
                  <input
                    type="url"
                    value={editData ? editData.image_url || '' : newService.image_url}
                    onChange={(e) => {
                      if (editData) {
                        setEditData({...editData, image_url: e.target.value});
                      } else {
                        setNewService({...newService, image_url: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData ? editData.active !== false : newService.active}
                      onChange={(e) => {
                        if (editData) {
                          setEditData({...editData, active: e.target.checked});
                        } else {
                          setNewService({...newService, active: e.target.checked});
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Активная услуга
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData ? editData.main_service || false : newService.main_service}
                      onChange={(e) => {
                        if (editData) {
                          setEditData({...editData, main_service: e.target.checked});
                        } else {
                          setNewService({...newService, main_service: e.target.checked});
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Основная услуга
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={editData ? handleSaveService : handleAddService}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editData ? 'Сохранить изменения' : 'Добавить услугу'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditData(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  Отмена
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
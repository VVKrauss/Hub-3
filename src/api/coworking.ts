// src/api/coworking.ts
// API для работы с коворкингом в новой схеме sh_site_settings + автоматическая миграция

import { supabase, createApiResponse, type ApiResponse } from '../lib/supabase';

export interface CoworkingService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц';
  active: boolean;
  image_url: string;
  order: number;
  main_service: boolean;
}

export interface CoworkingPageSettings {
  title: string;
  description: string;
  heroImage: string;
  address?: string;
  phone?: string;
  working_hours?: string;
  email?: string;
  telegram?: string;
  services: CoworkingService[];
  mainServices: CoworkingService[];
  metaDescription: string;
  showBookingForm: boolean;
  bookingFormFields: string[];
}

// Получение настроек страницы коворкинга с автоматической миграцией
export const getCoworkingPageSettings = async (): Promise<ApiResponse<CoworkingPageSettings>> => {
  try {
    console.log('🏢 Fetching coworking page settings...');
    
    // Сначала пробуем загрузить из новой схемы
    const { data: settings, error } = await supabase
      .from('sh_site_settings')
      .select('coworking_page_settings')
      .eq('is_active', true)
      .single();

    if (!error && settings?.coworking_page_settings?.services?.length > 0) {
      console.log('✅ Loaded from new schema');
      return createApiResponse(settings.coworking_page_settings);
    }

    // Если данных нет в новой схеме, выполняем автоматическую миграцию
    console.log('🔄 No data in new schema, starting automatic migration...');
    return await migrateAndGetCoworkingSettings();

  } catch (error) {
    console.error('❌ Error fetching coworking settings:', error);
    return createApiResponse(null, error);
  }
};

// Автоматическая миграция данных из старой схемы в новую
const migrateAndGetCoworkingSettings = async (): Promise<ApiResponse<CoworkingPageSettings>> => {
  try {
    console.log('📊 Starting automatic data migration...');
    
    // Загружаем данные из старых таблиц
    const [headerResponse, servicesResponse, oldSettingsResponse] = await Promise.all([
      supabase
        .from('coworking_header')
        .select('*')
        .single()
        .then(res => ({ data: res.data, error: res.error })),
      supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true })
        .then(res => ({ data: res.data, error: res.error })),
      supabase
        .from('site_settings')
        .select('coworking_header_settings')
        .single()
        .then(res => ({ data: res.data, error: res.error }))
    ]);

    console.log('📋 Migration data collected:', {
      header: !!headerResponse.data,
      services: servicesResponse.data?.length || 0,
      oldSettings: !!oldSettingsResponse.data?.coworking_header_settings
    });

    // Формируем данные для новой схемы
    const services: CoworkingService[] = servicesResponse.data?.map(service => ({
      id: service.id,
      name: service.name || '',
      description: service.description || '',
      price: service.price || 0,
      currency: service.currency || 'euro',
      period: service.period || 'час',
      active: service.active !== false,
      image_url: service.image_url || '',
      order: service.order || 0,
      main_service: service.main_service !== false
    })) || [];

    const migratedSettings: CoworkingPageSettings = {
      title: headerResponse.data?.title || 
             oldSettingsResponse.data?.coworking_header_settings?.title || 
             'Коворкинг пространство',
      description: headerResponse.data?.description || 
                  oldSettingsResponse.data?.coworking_header_settings?.description || 
                  'Комфортные рабочие места для исследователей и стартапов',
      heroImage: '',
      address: oldSettingsResponse.data?.coworking_header_settings?.address || 
               headerResponse.data?.address || 
               'Сараевская, 48',
      phone: oldSettingsResponse.data?.coworking_header_settings?.phone || 
             headerResponse.data?.phone || 
             '+381',
      working_hours: oldSettingsResponse.data?.coworking_header_settings?.working_hours || 
                     headerResponse.data?.working_hours || 
                     '10:00-18:00',
      email: 'info@sciencehub.site',
      telegram: '@sciencehub',
      services: services,
      mainServices: services.filter(s => s.main_service && s.active),
      metaDescription: 'Современное коворкинг пространство для исследователей и стартапов в Сербии',
      showBookingForm: true,
      bookingFormFields: ['name', 'contact', 'phone', 'comment']
    };

    // Сохраняем в новую схему
    console.log('💾 Saving migrated data to new schema...');
    const saveResult = await updateCoworkingPageSettings(migratedSettings);
    
    if (saveResult.error) {
      throw new Error(`Migration save failed: ${saveResult.error}`);
    }

    console.log('✅ Automatic migration completed successfully!', {
      services: services.length,
      mainServices: migratedSettings.mainServices.length
    });
    
    return createApiResponse(migratedSettings);

  } catch (error) {
    console.error('❌ Automatic migration failed:', error);
    
    // Возвращаем значения по умолчанию в случае ошибки
    const defaultSettings: CoworkingPageSettings = {
      title: 'Коворкинг пространство',
      description: 'Комфортные рабочие места для исследователей и стартапов',
      heroImage: '',
      address: 'Сараевская, 48',
      phone: '+381',
      working_hours: '10:00-18:00',
      email: 'info@sciencehub.site',
      telegram: '@sciencehub',
      services: [],
      mainServices: [],
      metaDescription: 'Современное коворкинг пространство для исследователей и стартапов в Сербии',
      showBookingForm: true,
      bookingFormFields: ['name', 'contact', 'phone', 'comment']
    };

    await updateCoworkingPageSettings(defaultSettings);
    return createApiResponse(defaultSettings);
  }
};

// Обновление настроек страницы коворкинга
export const updateCoworkingPageSettings = async (settings: Partial<CoworkingPageSettings>): Promise<ApiResponse<CoworkingPageSettings>> => {
  try {
    console.log('💾 Updating coworking page settings...');
    
    // Получаем текущие настройки
    const { data: currentSettings } = await supabase
      .from('sh_site_settings')
      .select('id, coworking_page_settings')
      .eq('is_active', true)
      .single();

    if (currentSettings) {
      // Обновляем существующую запись
      const updatedSettings = {
        ...currentSettings.coworking_page_settings,
        ...settings,
      };

      const { data, error } = await supabase
        .from('sh_site_settings')
        .update({
          coworking_page_settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettings.id)
        .select('coworking_page_settings')
        .single();

      if (error) throw error;
      
      console.log('✅ Coworking settings updated successfully');
      return createApiResponse(data.coworking_page_settings);
    } else {
      // Создаем новую запись, если нет активной
      const { data, error } = await supabase
        .from('sh_site_settings')
        .insert([{
          site_title: 'Science Hub',
          site_description: 'Научное сообщество в Сербии',
          coworking_page_settings: settings,
          is_active: true
        }])
        .select('coworking_page_settings')
        .single();

      if (error) throw error;
      
      console.log('✅ New coworking settings created successfully');
      return createApiResponse(data.coworking_page_settings);
    }
  } catch (error) {
    console.error('❌ Error updating coworking settings:', error);
    return createApiResponse(null, error);
  }
};

// Добавление/обновление услуги коворкинга
export const updateCoworkingService = async (service: Partial<CoworkingService>): Promise<ApiResponse<CoworkingService[]>> => {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (currentSettings.error || !currentSettings.data) {
      throw new Error('Failed to get current settings');
    }

    const services = [...(currentSettings.data.services || [])];
    
    if (service.id && service.id !== '') {
      // Обновляем существующую услугу
      const index = services.findIndex(s => s.id === service.id);
      if (index !== -1) {
        services[index] = { ...services[index], ...service } as CoworkingService;
      }
    } else {
      // Добавляем новую услугу
      const newService: CoworkingService = {
        id: `service_${Date.now()}`,
        name: service.name || '',
        description: service.description || '',
        price: service.price || 0,
        currency: service.currency || 'euro',
        period: service.period || 'час',
        active: service.active !== false,
        image_url: service.image_url || '',
        order: service.order || services.length,
        main_service: service.main_service !== false
      };
      services.push(newService);
    }

    // Обновляем mainServices
    const mainServices = services.filter(s => s.main_service && s.active);

    const updateResult = await updateCoworkingPageSettings({
      services,
      mainServices
    });

    if (updateResult.error) throw updateResult.error;
    
    return createApiResponse(services);
  } catch (error) {
    console.error('Error updating coworking service:', error);
    return createApiResponse(null, error);
  }
};

// Удаление услуги коворкинга
export const deleteCoworkingService = async (serviceId: string): Promise<ApiResponse<CoworkingService[]>> => {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (currentSettings.error || !currentSettings.data) {
      throw new Error('Failed to get current settings');
    }

    const services = currentSettings.data.services.filter(s => s.id !== serviceId);
    const mainServices = services.filter(s => s.main_service && s.active);

    const updateResult = await updateCoworkingPageSettings({
      services,
      mainServices
    });

    if (updateResult.error) throw updateResult.error;
    
    return createApiResponse(services);
  } catch (error) {
    console.error('Error deleting coworking service:', error);
    return createApiResponse(null, error);
  }
};

// Изменение порядка услуг
export const reorderCoworkingServices = async (serviceIds: string[]): Promise<ApiResponse<CoworkingService[]>> => {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (currentSettings.error || !currentSettings.data) {
      throw new Error('Failed to get current settings');
    }

    const services = [...currentSettings.data.services];
    
    // Переупорядочиваем услуги согласно новому порядку
    const reorderedServices = serviceIds.map((id, index) => {
      const service = services.find(s => s.id === id);
      if (service) {
        return { ...service, order: index };
      }
      return null;
    }).filter(Boolean) as CoworkingService[];

    // Добавляем услуги, которых нет в новом порядке (на случай ошибок)
    services.forEach(service => {
      if (!serviceIds.includes(service.id)) {
        reorderedServices.push({ ...service, order: reorderedServices.length });
      }
    });

    const mainServices = reorderedServices.filter(s => s.main_service && s.active);

    const updateResult = await updateCoworkingPageSettings({
      services: reorderedServices,
      mainServices
    });

    if (updateResult.error) throw updateResult.error;
    
    return createApiResponse(reorderedServices);
  } catch (error) {
    console.error('Error reordering coworking services:', error);
    return createApiResponse(null, error);
  }
};

// Получение только активных услуг для публичной страницы
export const getActiveCoworkingServices = async (): Promise<ApiResponse<{
  mainServices: CoworkingService[];
  additionalServices: CoworkingService[];
}>> => {
  try {
    const settings = await getCoworkingPageSettings();
    
    if (settings.error || !settings.data) {
      return createApiResponse({ mainServices: [], additionalServices: [] });
    }

    const activeServices = settings.data.services.filter(s => s.active);
    const mainServices = activeServices.filter(s => s.main_service).sort((a, b) => a.order - b.order);
    const additionalServices = activeServices.filter(s => !s.main_service).sort((a, b) => a.order - b.order);

    return createApiResponse({ mainServices, additionalServices });
  } catch (error) {
    console.error('Error getting active coworking services:', error);
    return createApiResponse({ mainServices: [], additionalServices: [] });
  }
};
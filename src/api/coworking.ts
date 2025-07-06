// src/api/coworking.ts
import { supabase } from '../lib/supabase';

export interface CoworkingService {
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

export interface CoworkingHeader {
  title: string;
  description: string;
  address?: string;
  phone?: string;
  working_hours?: string;
}

export interface CoworkingPageSettings {
  header: CoworkingHeader;
  services: CoworkingService[];
  lastUpdated: string;
}

/**
 * Получить настройки страницы коворкинга из новой схемы
 */
export async function getCoworkingPageSettings(): Promise<CoworkingPageSettings | null> {
  try {
    const { data, error } = await supabase
      .from('sh_site_settings')
      .select('coworking_page_settings')
      .single();

    if (error) {
      console.error('Error fetching coworking settings:', error);
      return null;
    }

    return data?.coworking_page_settings || null;
  } catch (error) {
    console.error('Error in getCoworkingPageSettings:', error);
    return null;
  }
}

/**
 * Сохранить настройки страницы коворкинга в новую схему
 */
export async function saveCoworkingPageSettings(settings: CoworkingPageSettings): Promise<boolean> {
  try {
    // Добавляем timestamp обновления
    const settingsWithTimestamp = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('sh_site_settings')
      .upsert({
        id: 1,
        coworking_page_settings: settingsWithTimestamp
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving coworking settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveCoworkingPageSettings:', error);
    return false;
  }
}

/**
 * Обновить только заголовок коворкинга
 */
export async function updateCoworkingHeader(header: CoworkingHeader): Promise<boolean> {
  try {
    // Сначала получаем текущие настройки
    const currentSettings = await getCoworkingPageSettings();
    
    if (!currentSettings) {
      // Если настроек нет, создаем новые с пустыми услугами
      const newSettings: CoworkingPageSettings = {
        header,
        services: [],
        lastUpdated: new Date().toISOString()
      };
      return await saveCoworkingPageSettings(newSettings);
    }

    // Обновляем только заголовок
    const updatedSettings = {
      ...currentSettings,
      header,
      lastUpdated: new Date().toISOString()
    };

    return await saveCoworkingPageSettings(updatedSettings);
  } catch (error) {
    console.error('Error in updateCoworkingHeader:', error);
    return false;
  }
}

/**
 * Добавить новую услугу коворкинга
 */
export async function addCoworkingService(service: Omit<CoworkingService, 'id' | 'order'>): Promise<boolean> {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (!currentSettings) {
      console.error('No coworking settings found');
      return false;
    }

    // Создаем новую услугу с ID и порядком
    const newService: CoworkingService = {
      ...service,
      id: crypto.randomUUID(),
      order: Math.max(...currentSettings.services.map(s => s.order), 0) + 1
    };

    const updatedSettings = {
      ...currentSettings,
      services: [...currentSettings.services, newService],
      lastUpdated: new Date().toISOString()
    };

    return await saveCoworkingPageSettings(updatedSettings);
  } catch (error) {
    console.error('Error in addCoworkingService:', error);
    return false;
  }
}

/**
 * Обновить существующую услугу коворкинга
 */
export async function updateCoworkingService(serviceId: string, serviceData: Partial<CoworkingService>): Promise<boolean> {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (!currentSettings) {
      console.error('No coworking settings found');
      return false;
    }

    const updatedServices = currentSettings.services.map(service =>
      service.id === serviceId ? { ...service, ...serviceData } : service
    );

    const updatedSettings = {
      ...currentSettings,
      services: updatedServices,
      lastUpdated: new Date().toISOString()
    };

    return await saveCoworkingPageSettings(updatedSettings);
  } catch (error) {
    console.error('Error in updateCoworkingService:', error);
    return false;
  }
}

/**
 * Удалить услугу коворкинга
 */
export async function deleteCoworkingService(serviceId: string): Promise<boolean> {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (!currentSettings) {
      console.error('No coworking settings found');
      return false;
    }

    const updatedServices = currentSettings.services.filter(service => service.id !== serviceId);

    const updatedSettings = {
      ...currentSettings,
      services: updatedServices,
      lastUpdated: new Date().toISOString()
    };

    return await saveCoworkingPageSettings(updatedSettings);
  } catch (error) {
    console.error('Error in deleteCoworkingService:', error);
    return false;
  }
}

/**
 * Изменить порядок услуг коворкинга
 */
export async function reorderCoworkingServices(serviceId: string, direction: 'up' | 'down'): Promise<boolean> {
  try {
    const currentSettings = await getCoworkingPageSettings();
    
    if (!currentSettings) {
      console.error('No coworking settings found');
      return false;
    }

    const services = [...currentSettings.services].sort((a, b) => a.order - b.order);
    const currentIndex = services.findIndex(s => s.id === serviceId);
    
    if (currentIndex === -1) return false;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= services.length) return false;

    // Меняем местами порядковые номера
    const tempOrder = services[currentIndex].order;
    services[currentIndex].order = services[newIndex].order;
    services[newIndex].order = tempOrder;

    const updatedSettings = {
      ...currentSettings,
      services,
      lastUpdated: new Date().toISOString()
    };

    return await saveCoworkingPageSettings(updatedSettings);
  } catch (error) {
    console.error('Error in reorderCoworkingServices:', error);
    return false;
  }
}

/**
 * Проверить наличие данных в старой схеме
 */
export async function checkLegacyCoworkingData(): Promise<{
  hasLegacyHeader: boolean;
  hasLegacyServices: boolean;
  legacyServicesCount: number;
}> {
  try {
    // Проверяем старый заголовок в site_settings
    const { data: headerData, error: headerError } = await supabase
      .from('site_settings')
      .select('coworking_header_settings')
      .single();

    const hasLegacyHeader = !headerError && headerData?.coworking_header_settings;

    // Проверяем старые услуги в coworking_info_table
    const { data: servicesData, error: servicesError } = await supabase
      .from('coworking_info_table')
      .select('id')
      .eq('active', true);

    const hasLegacyServices = !servicesError && servicesData && servicesData.length > 0;
    const legacyServicesCount = servicesData?.length || 0;

    return {
      hasLegacyHeader: !!hasLegacyHeader,
      hasLegacyServices: !!hasLegacyServices,
      legacyServicesCount
    };
  } catch (error) {
    console.error('Error checking legacy data:', error);
    return {
      hasLegacyHeader: false,
      hasLegacyServices: false,
      legacyServicesCount: 0
    };
  }
}
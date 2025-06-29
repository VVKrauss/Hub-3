// src/api/settings.ts
// API для работы с настройками сайта с обработкой ошибок БД

import { supabase, createApiResponse, type ApiResponse } from '../lib/supabase';

// Безопасное получение настроек сайта с fallback значениями
export const getSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    // Пытаемся получить настройки из новой таблицы sh_site_settings
    const { data: newSettings, error: newError } = await supabase
      .from('sh_site_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!newError && newSettings) {
      return createApiResponse(newSettings);
    }

    // Если новая таблица недоступна, пытаемся получить из старой
    const { data: oldSettings, error: oldError } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!oldError && oldSettings) {
      return createApiResponse(oldSettings);
    }

    // Если обе таблицы недоступны, возвращаем значения по умолчанию
    console.warn('Unable to fetch site settings, using defaults');
    return createApiResponse({
      site_title: 'Science Hub',
      site_description: 'Научное сообщество в Сербии',
      navigation_items: [
        { id: '1', label: 'Главная', path: '/', visible: true },
        { id: '2', label: 'События', path: '/events', visible: true },
        { id: '3', label: 'Спикеры', path: '/speakers', visible: true },
        { id: '4', label: 'О нас', path: '/about', visible: true },
        { id: '5', label: 'Коворкинг', path: '/coworking', visible: true },
        { id: '6', label: 'Аренда', path: '/rent', visible: true }
      ],
      footer_settings: {
        email: '',
        phone: '',
        address: '',
        workingHours: '',
        socialLinks: {
          telegram: '',
          instagram: '',
          youtube: ''
        }
      },
      topbar_settings: {
        height: 'standard'
      }
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    // Возвращаем базовые настройки при любой ошибке
    return createApiResponse({
      site_title: 'Science Hub',
      site_description: 'Научное сообщество в Сербии',
      navigation_items: [
        { id: '1', label: 'Главная', path: '/', visible: true },
        { id: '2', label: 'События', path: '/events', visible: true },
        { id: '3', label: 'Спикеры', path: '/speakers', visible: true },
        { id: '4', label: 'О нас', path: '/about', visible: true },
        { id: '5', label: 'Коворкинг', path: '/coworking', visible: true },
        { id: '6', label: 'Аренда', path: '/rent', visible: true }
      ],
      footer_settings: {
        email: '',
        phone: '',
        address: '',
        workingHours: '',
        socialLinks: {
          telegram: '',
          instagram: '',
          youtube: ''
        }
      },
      topbar_settings: {
        height: 'standard'
      }
    });
  }
};

// Получение настроек конкретной страницы
export const getPageSettings = async (page: string): Promise<ApiResponse<any>> => {
  try {
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data) {
      // Возвращаем настройки по умолчанию для страницы
      const defaultPageSettings = getDefaultPageSettings(page);
      return createApiResponse(defaultPageSettings);
    }

    const settings = siteSettings.data;
    
    // Извлекаем настройки для конкретной страницы
    switch (page) {
      case 'events':
        return createApiResponse(settings.events_page_settings || {
          title: 'Мероприятия',
          defaultView: 'grid',
          showFilters: true,
          itemsPerPage: 12,
          metaDescription: 'Научные мероприятия и события в Сербии'
        });
      
      case 'speakers':
        return createApiResponse(settings.speakers_page_settings || {
          title: 'Спикеры',
          defaultView: 'grid',
          itemsPerPage: 16,
          showBio: true,
          metaDescription: 'Спикеры научного сообщества'
        });
      
      case 'about':
        return createApiResponse(settings.about_page_settings || {
          title: 'О нас',
          projectInfo: '',
          teamMembers: [],
          contributors: [],
          supportPlatforms: [],
          contactInfo: {},
          metaDescription: 'О научном сообществе Science Hub'
        });
      
      case 'rent':
        return createApiResponse(settings.rent_page_settings || {
          title: 'Аренда пространства',
          description: '',
          photos: [],
          amenities: [],
          pricelist: [],
          contactInfo: {},
          metaDescription: 'Аренда пространства для мероприятий'
        });
      
      case 'coworking':
        return createApiResponse(settings.coworking_page_settings || {
          title: 'Коворкинг',
          description: '',
          services: [],
          metaDescription: 'Коворкинг пространство для работы'
        });
      
      case 'homepage':
        return createApiResponse({
          hero_section: settings.homepage_hero_section || {
            title: 'Science Hub',
            subtitle: 'Место для научного сообщества',
            enabled: true
          },
          about_section: settings.homepage_about_section || {
            title: 'О нас',
            enabled: true
          },
          events_section: settings.homepage_events_section || {
            title: 'Ближайшие события',
            enabled: true,
            showCount: 3
          },
          services_section: settings.homepage_services_section || {
            title: 'Наши услуги',
            enabled: true,
            items: []
          }
        });
      
      default:
        return createApiResponse(getDefaultPageSettings(page));
    }
  } catch (error) {
    console.error(`Error fetching ${page} page settings:`, error);
    return createApiResponse(getDefaultPageSettings(page));
  }
};

// Функция для получения настроек по умолчанию для страницы
const getDefaultPageSettings = (page: string) => {
  const defaults = {
    events: {
      title: 'Мероприятия',
      defaultView: 'grid',
      showFilters: true,
      itemsPerPage: 12,
      metaDescription: 'Научные мероприятия и события в Сербии'
    },
    speakers: {
      title: 'Спикеры',
      defaultView: 'grid',
      itemsPerPage: 16,
      showBio: true,
      metaDescription: 'Спикеры научного сообщества'
    },
    about: {
      title: 'О нас',
      projectInfo: '',
      teamMembers: [],
      contributors: [],
      supportPlatforms: [],
      contactInfo: {},
      metaDescription: 'О научном сообществе Science Hub'
    },
    rent: {
      title: 'Аренда пространства',
      description: '',
      photos: [],
      amenities: [],
      pricelist: [],
      contactInfo: {},
      metaDescription: 'Аренда пространства для мероприятий'
    },
    coworking: {
      title: 'Коворкинг',
      description: '',
      services: [],
      metaDescription: 'Коворкинг пространство для работы'
    },
    homepage: {
      hero_section: {
        title: 'Science Hub',
        subtitle: 'Место для научного сообщества',
        enabled: true
      },
      about_section: {
        title: 'О нас',
        enabled: true
      },
      events_section: {
        title: 'Ближайшие события',
        enabled: true,
        showCount: 3
      },
      services_section: {
        title: 'Наши услуги',
        enabled: true,
        items: []
      }
    }
  };

  return defaults[page] || {};
};

// Обновление настроек сайта
export const updateSiteSettings = async (settings: any): Promise<ApiResponse<any>> => {
  try {
    // Пытаемся обновить в новой таблице
    const { data, error } = await supabase
      .from('sh_site_settings')
      .upsert([{
        ...settings,
        is_active: true,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      // Если новая таблица недоступна, пытаемся обновить старую
      const { data: oldData, error: oldError } = await supabase
        .from('site_settings')
        .upsert([settings])
        .select()
        .single();

      if (oldError) throw oldError;
      return createApiResponse(oldData);
    }

    return createApiResponse(data);
  } catch (error) {
    console.error('Error updating site settings:', error);
    return createApiResponse(null, error);
  }
};

// Получение навигационных элементов
export const getNavigationItems = async (): Promise<ApiResponse<any[]>> => {
  try {
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.navigation_items) {
      // Возвращаем навигацию по умолчанию
      return createApiResponse([
        { id: '1', label: 'Главная', path: '/', visible: true },
        { id: '2', label: 'События', path: '/events', visible: true },
        { id: '3', label: 'Спикеры', path: '/speakers', visible: true },
        { id: '4', label: 'О нас', path: '/about', visible: true },
        { id: '5', label: 'Коворкинг', path: '/coworking', visible: true },
        { id: '6', label: 'Аренда', path: '/rent', visible: true }
      ]);
    }

    return createApiResponse(siteSettings.data.navigation_items);
  } catch (error) {
    console.error('Error fetching navigation items:', error);
    return createApiResponse([
      { id: '1', label: 'Главная', path: '/', visible: true },
      { id: '2', label: 'События', path: '/events', visible: true },
      { id: '3', label: 'Спикеры', path: '/speakers', visible: true },
      { id: '4', label: 'О нас', path: '/about', visible: true },
      { id: '5', label: 'Коворкинг', path: '/coworking', visible: true },
      { id: '6', label: 'Аренда', path: '/rent', visible: true }
    ]);
  }
};

// Получение настроек футера
export const getFooterSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.footer_settings) {
      return createApiResponse({
        email: '',
        phone: '',
        address: '',
        workingHours: '',
        socialLinks: {
          telegram: '',
          instagram: '',
          youtube: ''
        }
      });
    }

    return createApiResponse(siteSettings.data.footer_settings);
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    return createApiResponse({
      email: '',
      phone: '',
      address: '',
      workingHours: '',
      socialLinks: {
        telegram: '',
        instagram: '',
        youtube: ''
      }
    });
  }
};

// Получение настроек топбара
export const getTopbarSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.topbar_settings) {
      return createApiResponse({
        height: 'standard'
      });
    }

    return createApiResponse(siteSettings.data.topbar_settings);
  } catch (error) {
    console.error('Error fetching topbar settings:', error);
    return createApiResponse({
      height: 'standard'
    });
  }
};
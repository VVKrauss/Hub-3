 // src/api/settings.ts
// API для работы с настройками сайта с добавлением курсов в навигацию

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
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
      ],
      footer_settings: {
        email: 'info@sciencehub.site',
        phone: '+381 123 456 789',
        address: 'Science Hub, Панчево, Сербия',
        workingHours: 'Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00',
        socialLinks: {
          telegram: 'https://t.me/sciencehub',
          instagram: 'https://instagram.com/sciencehub',
          youtube: 'https://youtube.com/sciencehub'
        }
      },
      topbar_settings: {
        alignment: 'center',
        style: 'classic',
        spacing: 'normal',
        height: 'standard',
        showBorder: true,
        showShadow: true,
        backgroundColor: 'white',
        animation: 'slide',
        mobileCollapse: true,
        showIcons: false,
        showBadges: true,
        stickyHeader: true,
        maxWidth: 'container'
      }
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    // Возвращаем базовые настройки при любой ошибке
    return createApiResponse({
      site_title: 'Science Hub',
      site_description: 'Научное сообщество в Сербии',
      navigation_items: [
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
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
      
      case 'courses':
        return createApiResponse(settings.courses_page_settings || {
          title: 'Курсы и обучение',
          defaultView: 'grid',
          showFilters: true,
          itemsPerPage: 12,
          metaDescription: 'Курсы и обучающие программы для научного сообщества'
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
        return createApiResponse(settings.homepage_settings || {
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
        });
      
      default:
        return createApiResponse({});
    }
  } catch (error) {
    console.error('Error fetching page settings:', error);
    const defaultPageSettings = getDefaultPageSettings(page);
    return createApiResponse(defaultPageSettings);
  }
};

// Значения по умолчанию для страниц
const getDefaultPageSettings = (page: string) => {
  const defaults: Record<string, any> = {
    events: {
      title: 'Мероприятия',
      defaultView: 'grid',
      showFilters: true,
      itemsPerPage: 12,
      metaDescription: 'Научные мероприятия и события в Сербии'
    },
    courses: {
      title: 'Курсы и обучение',
      defaultView: 'grid',
      showFilters: true,
      itemsPerPage: 12,
      metaDescription: 'Курсы и обучающие программы для научного сообщества'
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
      // Возвращаем навигацию по умолчанию с курсами
      return createApiResponse([
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
      ]);
    }

    return createApiResponse(siteSettings.data.navigation_items);
  } catch (error) {
    console.error('Error fetching navigation items:', error);
    return createApiResponse([
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
      { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
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
};// src/api/settings.ts
// API для работы с настройками сайта с добавлением курсов в навигацию

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
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
      ],
      footer_settings: {
        email: 'info@sciencehub.site',
        phone: '+381 123 456 789',
        address: 'Science Hub, Панчево, Сербия',
        workingHours: 'Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00',
        socialLinks: {
          telegram: 'https://t.me/sciencehub',
          instagram: 'https://instagram.com/sciencehub',
          youtube: 'https://youtube.com/sciencehub'
        }
      },
      topbar_settings: {
        alignment: 'center',
        style: 'classic',
        spacing: 'normal',
        height: 'standard',
        showBorder: true,
        showShadow: true,
        backgroundColor: 'white',
        animation: 'slide',
        mobileCollapse: true,
        showIcons: false,
        showBadges: true,
        stickyHeader: true,
        maxWidth: 'container'
      }
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    // Возвращаем базовые настройки при любой ошибке
    return createApiResponse({
      site_title: 'Science Hub',
      site_description: 'Научное сообщество в Сербии',
      navigation_items: [
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
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
      
      case 'courses':
        return createApiResponse(settings.courses_page_settings || {
          title: 'Курсы и обучение',
          defaultView: 'grid',
          showFilters: true,
          itemsPerPage: 12,
          metaDescription: 'Курсы и обучающие программы для научного сообщества'
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
        return createApiResponse(settings.homepage_settings || {
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
        });
      
      default:
        return createApiResponse({});
    }
  } catch (error) {
    console.error('Error fetching page settings:', error);
    const defaultPageSettings = getDefaultPageSettings(page);
    return createApiResponse(defaultPageSettings);
  }
};

// Значения по умолчанию для страниц
const getDefaultPageSettings = (page: string) => {
  const defaults: Record<string, any> = {
    events: {
      title: 'Мероприятия',
      defaultView: 'grid',
      showFilters: true,
      itemsPerPage: 12,
      metaDescription: 'Научные мероприятия и события в Сербии'
    },
    courses: {
      title: 'Курсы и обучение',
      defaultView: 'grid',
      showFilters: true,
      itemsPerPage: 12,
      metaDescription: 'Курсы и обучающие программы для научного сообщества'
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
      // Возвращаем навигацию по умолчанию с курсами
      return createApiResponse([
        { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
        { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
        { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
        { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
        { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
        { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
        { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
      ]);
    }

    return createApiResponse(siteSettings.data.navigation_items);
  } catch (error) {
    console.error('Error fetching navigation items:', error);
    return createApiResponse([
      { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
      { id: 'events', label: 'События', path: '/events', visible: true, order: 1 },
      { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
      { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
      { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
      { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
      { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
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
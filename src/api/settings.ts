// src/api/settings.ts
// API для работы с настройками сайта (sh_site_settings)

import { supabase, createApiResponse, type ApiResponse } from '../lib/supabase';
import type { ShSiteSettings } from '../types/database';

// Получение текущих настроек сайта
export const getSiteSettings = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const { data, error } = await supabase
      .from('sh_site_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек сайта
export const updateSiteSettings = async (
  settingsId: string,
  updates: Partial<Omit<ShSiteSettings, 'id' | 'created_at'>>
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const { data, error } = await supabase
      .from('sh_site_settings')
      .update({ 
        ...updates, 
        updated_at: new Date().toISOString(),
        version: supabase.sql`version + 1`
      })
      .eq('id', settingsId)
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Создание новых настроек (если не существуют)
export const createSiteSettings = async (
  settings: Omit<ShSiteSettings, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const { data, error } = await supabase
      .from('sh_site_settings')
      .insert([{ ...settings, version: 1 }])
      .select()
      .single();

    if (error) throw error;
    return createApiResponse(data);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение или создание настроек (utility функция)
export const getOrCreateSiteSettings = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const existing = await getSiteSettings();
    
    if (existing.data) {
      return existing;
    }

    // Создаем настройки по умолчанию
    const defaultSettings = {
      site_title: 'Science Hub',
      site_description: 'Место для научного сообщества',
      is_active: true,
      navigation_items: [],
      navigation_style: {
        style: 'classic',
        spacing: 'normal',
        alignment: 'center',
        showBorder: true,
        showShadow: true,
        stickyHeader: true,
        mobileCollapse: true
      },
      footer_settings: {
        email: '',
        phone: '',
        address: '',
        customText: '',
        socialLinks: {},
        workingHours: '',
        showCopyright: true
      },
      homepage_hero_section: {
        style: 'centered',
        title: 'Science Hub',
        enabled: true,
        subtitle: 'Место для научного сообщества',
        ctaButton: {
          link: '/about',
          text: 'Узнать больше'
        },
        backgroundImage: ''
      },
      homepage_about_section: {
        image: '',
        order: 1,
        title: 'О нас',
        enabled: true,
        description: ''
      },
      homepage_events_section: {
        order: 2,
        title: 'Ближайшие события',
        enabled: true,
        showCount: 3,
        showFilters: true
      },
      homepage_services_section: {
        items: [],
        order: 3,
        title: 'Наши услуги',
        enabled: true
      },
      about_page_settings: {
        title: 'О нас',
        heroImage: '',
        contactInfo: {},
        projectInfo: '',
        teamMembers: [],
        contributors: [],
        metaDescription: '',
        supportPlatforms: []
      },
      rent_page_settings: {
        title: 'Аренда пространства',
        photos: [],
        amenities: [],
        heroImage: '',
        pricelist: [],
        mainPrices: {},
        contactInfo: {},
        description: '',
        metaDescription: '',
        includedServices: []
      },
      coworking_page_settings: {
        title: 'Коворкинг',
        services: [],
        heroImage: '',
        description: '',
        mainServices: [],
        metaDescription: ''
      },
      events_page_settings: {
        title: 'Мероприятия',
        heroImage: '',
        defaultView: 'grid',
        showFilters: true,
        itemsPerPage: 12,
        metaDescription: ''
      },
      speakers_page_settings: {
        title: 'Спикеры',
        showBio: true,
        heroImage: '',
        defaultView: 'grid',
        itemsPerPage: 16,
        metaDescription: ''
      }
    };

    return await createSiteSettings(defaultSettings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление навигации
export const updateNavigation = async (
  navigationItems: any[]
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      navigation_items: navigationItems
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление футера
export const updateFooterSettings = async (
  footerSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      footer_settings: footerSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек главной страницы
export const updateHomepageSettings = async (
  heroSection?: any,
  aboutSection?: any,
  eventsSection?: any,
  servicesSection?: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    const updates: any = {};
    
    if (heroSection) updates.homepage_hero_section = heroSection;
    if (aboutSection) updates.homepage_about_section = aboutSection;
    if (eventsSection) updates.homepage_events_section = eventsSection;
    if (servicesSection) updates.homepage_services_section = servicesSection;

    return await updateSiteSettings(settings.data.id, updates);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек страницы "О нас"
export const updateAboutPageSettings = async (
  aboutSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      about_page_settings: aboutSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек страницы аренды
export const updateRentPageSettings = async (
  rentSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      rent_page_settings: rentSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек страницы коворкинга
export const updateCoworkingPageSettings = async (
  coworkingSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      coworking_page_settings: coworkingSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек страницы событий
export const updateEventsPageSettings = async (
  eventsSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      events_page_settings: eventsSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек страницы спикеров
export const updateSpeakersPageSettings = async (
  speakersSettings: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    return await updateSiteSettings(settings.data.id, {
      speakers_page_settings: speakersSettings
    });
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Получение настроек конкретной страницы
export const getPageSettings = async (
  page: 'about' | 'rent' | 'coworking' | 'events' | 'speakers' | 'homepage'
): Promise<ApiResponse<any>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    let pageSettings;
    switch (page) {
      case 'about':
        pageSettings = settings.data.about_page_settings;
        break;
      case 'rent':
        pageSettings = settings.data.rent_page_settings;
        break;
      case 'coworking':
        pageSettings = settings.data.coworking_page_settings;
        break;
      case 'events':
        pageSettings = settings.data.events_page_settings;
        break;
      case 'speakers':
        pageSettings = settings.data.speakers_page_settings;
        break;
      case 'homepage':
        pageSettings = {
          hero: settings.data.homepage_hero_section,
          about: settings.data.homepage_about_section,
          events: settings.data.homepage_events_section,
          services: settings.data.homepage_services_section
        };
        break;
      default:
        throw new Error(`Неизвестная страница: ${page}`);
    }

    return createApiResponse(pageSettings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Сброс настроек к значениям по умолчанию
export const resetSettingsToDefault = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    // Деактивируем текущие настройки
    const currentSettings = await getSiteSettings();
    if (currentSettings.data) {
      await updateSiteSettings(currentSettings.data.id, { is_active: false });
    }

    // Создаем новые настройки по умолчанию
    return await getOrCreateSiteSettings();
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Экспорт версии настроек в JSON
export const exportSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const settings = await getSiteSettings();
    if (!settings.data) throw new Error('Настройки не найдены');

    const exportData = {
      ...settings.data,
      exported_at: new Date().toISOString(),
      version: settings.data.version
    };

    return createApiResponse(exportData);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Импорт настроек из JSON
export const importSettings = async (
  settingsData: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    // Удаляем системные поля
    const { id, created_at, updated_at, version, exported_at, ...cleanSettings } = settingsData;

    // Деактивируем текущие настройки
    const currentSettings = await getSiteSettings();
    if (currentSettings.data) {
      await updateSiteSettings(currentSettings.data.id, { is_active: false });
    }

    // Создаем новые настройки
    return await createSiteSettings(cleanSettings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
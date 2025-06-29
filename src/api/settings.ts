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

// Получение или создание настроек (upsert логика)
export const getOrCreateSiteSettings = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    // Сначала пытаемся получить существующие настройки
    const existing = await getSiteSettings();
    
    if (existing.data) {
      return existing;
    }

    // Если настроек нет, создаем с дефолтными значениями
    const defaultSettings: Omit<ShSiteSettings, 'id' | 'created_at' | 'updated_at' | 'version'> = {
      site_title: 'Science Hub',
      site_description: 'Место для научного сообщества',
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
      },
      is_active: true,
      created_by: null
    };

    return await createSiteSettings(defaultSettings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление навигации
export const updateNavigation = async (
  navigationItems: any[],
  navigationStyle?: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    const updates: Partial<ShSiteSettings> = {
      navigation_items: navigationItems
    };

    if (navigationStyle) {
      updates.navigation_style = navigationStyle;
    }

    return await updateSiteSettings(settings.data.id, updates);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Обновление настроек футера
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
  section: 'hero' | 'about' | 'events' | 'services',
  sectionData: any
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getOrCreateSiteSettings();
    if (!settings.data) throw new Error('Не удалось получить настройки');

    const fieldMap = {
      hero: 'homepage_hero_section',
      about: 'homepage_about_section',
      events: 'homepage_events_section',
      services: 'homepage_services_section'
    };

    return await updateSiteSettings(settings.data.id, {
      [fieldMap[section]]: sectionData
    });
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
        throw new Error('Неизвестная страница');
    }

    return createApiResponse(pageSettings);
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Сброс настроек к дефолтным значениям
export const resetSiteSettings = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    // Деактивируем текущие настройки
    await supabase
      .from('sh_site_settings')
      .update({ is_active: false })
      .eq('is_active', true);

    // Создаем новые с дефолтными значениями
    return await getOrCreateSiteSettings();
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Экспорт настроек
export const exportSettings = async (): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const settings = await getSiteSettings();
    return settings;
  } catch (error) {
    return createApiResponse(null, error);
  }
};

// Импорт настроек
export const importSettings = async (
  settingsData: Partial<ShSiteSettings>
): Promise<ApiResponse<ShSiteSettings>> => {
  try {
    const currentSettings = await getOrCreateSiteSettings();
    if (!currentSettings.data) throw new Error('Не удалось получить текущие настройки');

    const { id, created_at, updated_at, version, ...importData } = settingsData as any;
    
    return await updateSiteSettings(currentSettings.data.id, importData);
  } catch (error) {
    return createApiResponse(null, error);
  }
};
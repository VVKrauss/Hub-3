// src/api/settings.ts - Обновленная версия для работы только с sh_site_settings
import { supabase, createApiResponse, type ApiResponse } from '../lib/supabase';

// Получение настроек сайта ТОЛЬКО из новой таблицы sh_site_settings
export const getSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    console.log('🔍 Загружаем настройки из sh_site_settings...');
    
    // Получаем настройки ТОЛЬКО из новой таблицы
    const { data: settings, error } = await supabase
      .from('sh_site_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Ошибка при получении настроек:', error);
      throw error;
    }

    if (!settings) {
      console.warn('⚠️ Активных настроек не найдено, создаем дефолтные');
      // Если нет активных настроек, создаем их
      const defaultSettings = await createDefaultSiteSettings();
      return defaultSettings;
    }

    console.log('✅ Настройки успешно загружены:', settings);
    return createApiResponse(settings);

  } catch (error) {
    console.error('💥 Критическая ошибка при получении настроек:', error);
    
    // В случае любой ошибки, возвращаем hardcoded дефолты с курсами
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
      navigation_style: {
        style: 'classic',
        spacing: 'normal',
        alignment: 'center',
        showBorder: true,
        showShadow: true,
        stickyHeader: true,
        mobileCollapse: true
      },
      is_active: true
    });
  }
};

// Создание дефолтных настроек сайта
const createDefaultSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    console.log('🔧 Создаем дефолтные настройки сайта...');
    
    const defaultData = {
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
        email: 'info@sciencehub.site',
        phone: '+381 123 456 789',
        address: 'Science Hub, Панчево, Сербия',
        customText: '',
        socialLinks: {
          telegram: 'https://t.me/sciencehub',
          instagram: 'https://instagram.com/sciencehub',
          youtube: 'https://youtube.com/sciencehub'
        },
        workingHours: 'Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00',
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
        projectInfo: 'Science Hub - это место для научного сообщества в Сербии',
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
      is_active: true
    };

    // Деактивируем все старые записи
    await supabase
      .from('sh_site_settings')
      .update({ is_active: false })
      .eq('is_active', true);

    // Создаем новую запись
    const { data: newSettings, error } = await supabase
      .from('sh_site_settings')
      .insert([defaultData])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка при создании дефолтных настроек:', error);
      throw error;
    }

    console.log('✅ Дефолтные настройки успешно созданы:', newSettings);
    return createApiResponse(newSettings);

  } catch (error) {
    console.error('💥 Ошибка при создании дефолтных настроек:', error);
    throw error;
  }
};

// Получение навигационных элементов
export const getNavigationItems = async (): Promise<ApiResponse<any[]>> => {
  try {
    console.log('🔍 Загружаем элементы навигации...');
    
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.navigation_items) {
      console.warn('⚠️ Навигация не найдена, используем дефолт с курсами');
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

    console.log('✅ Навигация загружена:', siteSettings.data.navigation_items);
    return createApiResponse(siteSettings.data.navigation_items);
  } catch (error) {
    console.error('💥 Ошибка при загрузке навигации:', error);
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

// Обновление настроек сайта (только новая таблица)
export const updateSiteSettings = async (settings: any): Promise<ApiResponse<any>> => {
  try {
    console.log('💾 Обновляем настройки сайта...');
    
    // Получаем текущие активные настройки
    const { data: currentSettings } = await supabase
      .from('sh_site_settings')
      .select('id')
      .eq('is_active', true)
      .single();

    if (currentSettings) {
      // Обновляем существующую запись
      const { data, error } = await supabase
        .from('sh_site_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettings.id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Настройки обновлены:', data);
      return createApiResponse(data);
    } else {
      // Создаем новую запись если активной нет
      const { data, error } = await supabase
        .from('sh_site_settings')
        .insert([{
          ...settings,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Новые настройки созданы:', data);
      return createApiResponse(data);
    }
  } catch (error) {
    console.error('💥 Ошибка при обновлении настроек:', error);
    return createApiResponse(null, error);
  }
};

// Обновление навигации
export const updateNavigation = async (navigationItems: any[], navigationStyle?: any): Promise<ApiResponse<any>> => {
  try {
    console.log('🔄 Обновляем навигацию...');
    
    const updates: any = {
      navigation_items: navigationItems,
      updated_at: new Date().toISOString()
    };

    if (navigationStyle) {
      updates.navigation_style = navigationStyle;
    }

    const result = await updateSiteSettings(updates);
    
    if (result.error) {
      throw new Error(result.error);
    }

    console.log('✅ Навигация обновлена');
    return result;
  } catch (error) {
    console.error('💥 Ошибка при обновлении навигации:', error);
    return createApiResponse(null, error);
  }
};

// Получение или создание настроек сайта
export const getOrCreateSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const settings = await getSiteSettings();
    
    if (settings.data) {
      return settings;
    }
    
    // Если настроек нет, создаем дефолтные
    return await createDefaultSiteSettings();
  } catch (error) {
    console.error('💥 Ошибка при получении/создании настроек:', error);
    return createApiResponse(null, error);
  }
};

// Получение настроек футера
export const getFooterSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.footer_settings) {
      return createApiResponse({
        email: 'info@sciencehub.site',
        phone: '+381 123 456 789',
        address: 'Science Hub, Панчево, Сербия',
        workingHours: 'Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00',
        socialLinks: {
          telegram: 'https://t.me/sciencehub',
          instagram: 'https://instagram.com/sciencehub',
          youtube: 'https://youtube.com/sciencehub'
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
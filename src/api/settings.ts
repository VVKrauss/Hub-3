// src/api/settings.ts - Исправленная версия с таймаутами
import { supabase, createApiResponse, createPaginatedResponse } from '../lib/supabase';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Добавляем таймаут к запросам Supabase
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

// Получение настроек сайта с таймаутом
export const getSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    console.log('🔧 API: Получение настроек сайта...');
    
    const { data, error } = await withTimeout(
      supabase
        .from('sh_site_settings')
        .select('*')
        .eq('is_active', true)
        .single(),
      3000 // 3 секунды таймаут
    );

    if (error) {
      console.warn('🔧 API: Ошибка получения настроек:', error);
      return createApiResponse(null, error);
    }

    console.log('✅ API: Настройки сайта получены');
    return createApiResponse(data);
  } catch (error) {
    console.error('❌ API: Таймаут или ошибка при получении настроек:', error);
    return createApiResponse(null, error);
  }
};

// Получение навигационных элементов с fallback
export const getNavigationItems = async (): Promise<ApiResponse<any[]>> => {
  try {
    console.log('🔧 API: Загрузка навигации...');
    
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data?.navigation_items) {
      console.log('🔧 API: Использование fallback навигации');
      return createApiResponse(getDefaultNavigation());
    }

    const navItems = siteSettings.data.navigation_items;
    
    // Проверяем что это массив и элементы имеют нужные поля
    if (!Array.isArray(navItems) || navItems.length === 0) {
      console.log('🔧 API: Невалидная навигация, используем fallback');
      return createApiResponse(getDefaultNavigation());
    }

    // Валидируем структуру элементов
    const validNavItems = navItems.filter(item => 
      item && 
      typeof item === 'object' && 
      item.id && 
      item.label && 
      item.path
    ).map(item => ({
      ...item,
      visible: item.visible !== false, // По умолчанию true
      order: typeof item.order === 'number' ? item.order : 0
    }));

    if (validNavItems.length === 0) {
      console.log('🔧 API: Нет валидных элементов навигации, используем fallback');
      return createApiResponse(getDefaultNavigation());
    }

    console.log('✅ API: Загружено', validNavItems.length, 'элементов навигации');
    return createApiResponse(validNavItems);
    
  } catch (error) {
    console.error('❌ API: Ошибка загрузки навигации:', error);
    return createApiResponse(getDefaultNavigation());
  }
};

// Дефолтная навигация
const getDefaultNavigation = () => [
  { id: 'home', label: 'Главная', path: '/', visible: true, order: 0 },
  { id: 'events', label: 'Мероприятия', path: '/events', visible: true, order: 1 },
  { id: 'courses', label: 'Курсы', path: '/courses', visible: true, order: 2 },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true, order: 3 },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true, order: 4 },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true, order: 5 },
  { id: 'about', label: 'О нас', path: '/about', visible: true, order: 6 }
];

// Получение настроек топбара с fallback
export const getTopbarSettings = async (): Promise<ApiResponse<any>> => {
  try {
    console.log('🔧 API: Получение настроек топбара...');
    
    const siteSettings = await getSiteSettings();
    
    if (siteSettings.error || !siteSettings.data) {
      console.log('🔧 API: Используем дефолтные настройки топбара');
      return createApiResponse(getDefaultTopbarSettings());
    }

    const navigationStyle = siteSettings.data.navigation_style || {};
    
    const topbarSettings = {
      height: navigationStyle.height || 'standard',
      alignment: navigationStyle.alignment || 'center',
      style: navigationStyle.style || 'classic',
      spacing: navigationStyle.spacing || 'normal',
      showBorder: navigationStyle.showBorder !== false,
      showShadow: navigationStyle.showShadow !== false,
      stickyHeader: navigationStyle.stickyHeader !== false,
      mobileCollapse: navigationStyle.mobileCollapse !== false
    };

    console.log('✅ API: Настройки топбара получены');
    return createApiResponse(topbarSettings);
    
  } catch (error) {
    console.error('❌ API: Ошибка получения настроек топбара:', error);
    return createApiResponse(getDefaultTopbarSettings());
  }
};

// Дефолтные настройки топбара
const getDefaultTopbarSettings = () => ({
  height: 'standard',
  alignment: 'center',
  style: 'classic',
  spacing: 'normal',
  showBorder: true,
  showShadow: true,
  stickyHeader: true,
  mobileCollapse: true
});

// Получение или создание настроек сайта с улучшенной обработкой ошибок
export const getOrCreateSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    console.log('🔧 API: Получение или создание настроек сайта...');
    
    const settings = await getSiteSettings();
    
    if (settings.data) {
      console.log('✅ API: Существующие настройки найдены');
      return settings;
    }
    
    // Если настроек нет, пытаемся создать дефолтные
    console.log('🔧 API: Создание дефолтных настроек...');
    
    try {
      const defaultSettings = await createDefaultSiteSettings();
      console.log('✅ API: Дефолтные настройки созданы');
      return defaultSettings;
    } catch (createError) {
      console.error('❌ API: Ошибка создания дефолтных настроек:', createError);
      
      // Если не можем создать в базе, возвращаем fallback объект
      const fallbackSettings = {
        navigation_items: getDefaultNavigation(),
        navigation_style: getDefaultTopbarSettings(),
        footer_settings: {
          email: 'info@sciencehub.site',
          phone: '+381 123 456 789',
          address: 'Science Hub, Панчево, Сербия',
          workingHours: 'Пн-Пт: 9:00-22:00',
          socialLinks: {
            telegram: '',
            instagram: '',
            youtube: ''
          }
        }
      };
      
      console.log('⚠️ API: Используем fallback настройки');
      return createApiResponse(fallbackSettings);
    }
    
  } catch (error) {
    console.error('❌ API: Критическая ошибка при работе с настройками:', error);
    
    // Возвращаем минимальные fallback настройки
    const emergencyFallback = {
      navigation_items: getDefaultNavigation(),
      navigation_style: getDefaultTopbarSettings(),
      footer_settings: {}
    };
    
    return createApiResponse(emergencyFallback);
  }
};

// Создание дефолтных настроек сайта
const createDefaultSiteSettings = async (): Promise<ApiResponse<any>> => {
  try {
    const defaultData = {
      navigation_items: getDefaultNavigation(),
      navigation_style: getDefaultTopbarSettings(),
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
      about_page_settings: {
        title: 'О Science Hub',
        projectInfo: 'Science Hub - это место для научного сообщества в Сербии',
        teamMembers: [],
        contributors: [],
        supportPlatforms: []
      },
      is_active: true
    };

    // Деактивируем все старые записи с таймаутом
    await withTimeout(
      supabase
        .from('sh_site_settings')
        .update({ is_active: false })
        .eq('is_active', true),
      2000
    );

    // Создаем новую запись с таймаутом
    const { data: newSettings, error } = await withTimeout(
      supabase
        .from('sh_site_settings')
        .insert([defaultData])
        .select()
        .single(),
      3000
    );

    if (error) {
      throw error;
    }

    return createApiResponse(newSettings);

  } catch (error) {
    console.error('❌ API: Ошибка создания дефолтных настроек:', error);
    throw error;
  }
};

// Обновление настроек сайта с таймаутом
export const updateSiteSettings = async (settings: any): Promise<ApiResponse<any>> => {
  try {
    console.log('🔧 API: Обновление настроек сайта...');
    
    // Получаем текущие активные настройки с таймаутом
    const { data: currentSettings } = await withTimeout(
      supabase
        .from('sh_site_settings')
        .select('id')
        .eq('is_active', true)
        .single(),
      2000
    );

    if (currentSettings) {
      // Обновляем существующую запись
      const { data, error } = await withTimeout(
        supabase
          .from('sh_site_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSettings.id)
          .select()
          .single(),
        3000
      );

      if (error) throw error;
      
      console.log('✅ API: Настройки обновлены');
      return createApiResponse(data);
    } else {
      // Создаем новую запись если активной нет
      const { data, error } = await withTimeout(
        supabase
          .from('sh_site_settings')
          .insert([{
            ...settings,
            is_active: true
          }])
          .select()
          .single(),
        3000
      );

      if (error) throw error;
      
      console.log('✅ API: Новые настройки созданы');
      return createApiResponse(data);
    }
  } catch (error) {
    console.error('❌ API: Ошибка обновления настроек:', error);
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
        workingHours: 'Пн-Пт: 9:00-22:00',
        socialLinks: {
          telegram: '',
          instagram: '',
          youtube: ''
        }
      });
    }

    return createApiResponse(siteSettings.data.footer_settings);
  } catch (error) {
    console.error('❌ API: Ошибка получения настроек футера:', error);
    return createApiResponse(null, error);
  }
};
// src/utils/coworkingMigration.ts
// Скрипт для миграции данных коворкинга из старой схемы в новую

import { supabase } from '../lib/supabase';
import { updateCoworkingPageSettings } from '../api/coworking';

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedServices: number;
  errors: string[];
}

// Основная функция миграции
export const migrateCoworkingData = async (): Promise<MigrationResult> => {
  const errors: string[] = [];
  let migratedServices = 0;

  try {
    console.log('🔄 Starting coworking data migration...');

    // 1. Получаем данные из старых таблиц
    const [headerResponse, servicesResponse, oldSettingsResponse] = await Promise.all([
      supabase
        .from('coworking_header')
        .select('*')
        .single(),
      supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true }),
      supabase
        .from('site_settings')
        .select('coworking_header_settings')
        .single()
    ]);

    console.log('📊 Old data loaded:', {
      header: !!headerResponse.data,
      services: servicesResponse.data?.length || 0,
      oldSettings: !!oldSettingsResponse.data?.coworking_header_settings
    });

    // 2. Формируем данные для новой схемы
    const services = servicesResponse.data?.map(service => ({
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

    const migratedSettings = {
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

    // 3. Сохраняем в новую схему
    console.log('💾 Saving to new schema...');
    const updateResult = await updateCoworkingPageSettings(migratedSettings);

    if (updateResult.error) {
      throw new Error(`Failed to save migrated data: ${updateResult.error}`);
    }

    migratedServices = services.length;

    console.log('✅ Migration completed successfully');
    return {
      success: true,
      message: `Миграция завершена успешно. Перенесено ${migratedServices} услуг.`,
      migratedServices,
      errors
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    errors.push(`Migration error: ${error}`);
    
    return {
      success: false,
      message: 'Ошибка при миграции данных',
      migratedServices,
      errors
    };
  }
};

// Проверка необходимости миграции
export const checkMigrationNeeded = async (): Promise<boolean> => {
  try {
    // Проверяем, есть ли данные в новой схеме
    const { data: newSettings } = await supabase
      .from('sh_site_settings')
      .select('coworking_page_settings')
      .eq('is_active', true)
      .single();

    if (newSettings?.coworking_page_settings?.services?.length > 0) {
      console.log('✅ New schema already has data, migration not needed');
      return false;
    }

    // Проверяем, есть ли данные в старых таблицах
    const [servicesResponse] = await Promise.all([
      supabase
        .from('coworking_info_table')
        .select('id')
        .limit(1)
    ]);

    const hasOldData = servicesResponse.data && servicesResponse.data.length > 0;
    
    console.log(`${hasOldData ? '🔄' : '✅'} Migration ${hasOldData ? 'needed' : 'not needed'}`);
    return hasOldData;

  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

// Резервное копирование старых данных
export const backupOldData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('💾 Creating backup of old coworking data...');

    const [headerResponse, servicesResponse, settingsResponse] = await Promise.all([
      supabase.from('coworking_header').select('*'),
      supabase.from('coworking_info_table').select('*'),
      supabase.from('site_settings').select('coworking_header_settings')
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      coworking_header: headerResponse.data,
      coworking_info_table: servicesResponse.data,
      site_settings_coworking: settingsResponse.data,
      migration_version: '1.0'
    };

    // Сохраняем резервную копию в таблицу migration_backups (если существует)
    // или просто логируем в консоль для ручного сохранения
    console.log('📋 Backup data (save this manually if needed):', JSON.stringify(backup, null, 2));

    return {
      success: true,
      message: 'Резервная копия создана успешно. Данные выведены в консоль.'
    };

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return {
      success: false,
      message: `Ошибка создания резервной копии: ${error}`
    };
  }
};

// Валидация мигрированных данных
export const validateMigration = async (): Promise<{ success: boolean; message: string; issues: string[] }> => {
  const issues: string[] = [];

  try {
    console.log('🔍 Validating migration...');

    // Получаем данные из новой схемы
    const { data: newSettings } = await supabase
      .from('sh_site_settings')
      .select('coworking_page_settings')
      .eq('is_active', true)
      .single();

    if (!newSettings?.coworking_page_settings) {
      issues.push('Настройки коворкинга не найдены в новой схеме');
      return { success: false, message: 'Данные не найдены', issues };
    }

    const settings = newSettings.coworking_page_settings;

    // Проверяем основные поля
    if (!settings.title) issues.push('Отсутствует заголовок');
    if (!settings.description) issues.push('Отсутствует описание');
    if (!settings.services || !Array.isArray(settings.services)) {
      issues.push('Услуги не найдены или имеют неверный формат');
    } else {
      // Проверяем услуги
      settings.services.forEach((service: any, index: number) => {
        if (!service.id) issues.push(`Услуга ${index + 1}: отсутствует ID`);
        if (!service.name) issues.push(`Услуга ${index + 1}: отсутствует название`);
        if (typeof service.price !== 'number') issues.push(`Услуга ${index + 1}: неверная цена`);
      });
    }

    const success = issues.length === 0;
    const message = success 
      ? `Валидация пройдена. Найдено ${settings.services?.length || 0} услуг.`
      : `Найдено ${issues.length} проблем при валидации`;

    console.log(success ? '✅' : '⚠️', message);
    if (issues.length > 0) {
      console.log('Issues found:', issues);
    }

    return { success, message, issues };

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return {
      success: false,
      message: `Ошибка валидации: ${error}`,
      issues: [`Validation error: ${error}`]
    };
  }
};
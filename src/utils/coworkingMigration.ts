// src/utils/coworkingMigration.ts
import { supabase } from '../lib/supabase';
import { saveCoworkingPageSettings, type CoworkingPageSettings, type CoworkingService, type CoworkingHeader } from '../api/coworking';

/**
 * Миграция данных коворкинга из старой схемы в новую
 */
export async function migrateLegacyCoworkingData(): Promise<boolean> {
  try {
    console.log('Начинаем миграцию данных коворкинга...');

    // 1. Получаем заголовок из старой схемы (site_settings.coworking_header_settings)
    const { data: headerData, error: headerError } = await supabase
      .from('site_settings')
      .select('coworking_header_settings')
      .single();

    let migratedHeader: CoworkingHeader = {
      title: 'Коворкинг пространство',
      description: 'Комфортные рабочие места для исследователей и стартапов',
      address: 'Сараевская, 48',
      phone: '+381',
      working_hours: '10:00-18:00'
    };

    if (!headerError && headerData?.coworking_header_settings) {
      const oldHeader = headerData.coworking_header_settings;
      migratedHeader = {
        title: oldHeader.title || migratedHeader.title,
        description: oldHeader.description || migratedHeader.description,
        address: oldHeader.address || migratedHeader.address,
        phone: oldHeader.phone || migratedHeader.phone,
        working_hours: oldHeader.working_hours || migratedHeader.working_hours
      };
      console.log('Заголовок найден в старой схеме:', migratedHeader);
    } else {
      console.log('Заголовок не найден в старой схеме, используем дефолтный');
    }

    // 2. Получаем услуги из старой схемы (coworking_info_table)
    const { data: servicesData, error: servicesError } = await supabase
      .from('coworking_info_table')
      .select('*')
      .order('order', { ascending: true });

    let migratedServices: CoworkingService[] = [];

    if (!servicesError && servicesData && servicesData.length > 0) {
      migratedServices = servicesData.map((oldService, index) => ({
        id: oldService.id || crypto.randomUUID(),
        name: oldService.name || `Услуга ${index + 1}`,
        description: oldService.description || '',
        price: oldService.price || 0,
        currency: oldService.currency || 'euro',
        period: oldService.period || 'час',
        active: oldService.active !== false,
        image_url: oldService.image_url || '',
        order: oldService.order || index + 1,
        main_service: oldService.main_service || false
      }));
      console.log(`Найдено ${migratedServices.length} услуг в старой схеме`);
    } else {
      console.log('Услуги не найдены в старой схеме');
    }

    // 3. Создаем новые настройки страницы
    const newPageSettings: CoworkingPageSettings = {
      header: migratedHeader,
      services: migratedServices,
      lastUpdated: new Date().toISOString()
    };

    // 4. Сохраняем в новую схему
    const success = await saveCoworkingPageSettings(newPageSettings);

    if (success) {
      console.log('Миграция завершена успешно!');
      console.log('Перенесено:', {
        header: migratedHeader,
        servicesCount: migratedServices.length
      });
      return true;
    } else {
      console.error('Ошибка при сохранении в новую схему');
      return false;
    }

  } catch (error) {
    console.error('Ошибка при миграции:', error);
    return false;
  }
}

/**
 * Создание резервной копии старых данных перед миграцией
 */
export async function backupLegacyCoworkingData(): Promise<boolean> {
  try {
    console.log('Создаем резервную копию старых данных...');

    // Получаем старый заголовок
    const { data: headerData } = await supabase
      .from('site_settings')
      .select('coworking_header_settings')
      .single();

    // Получаем старые услуги
    const { data: servicesData } = await supabase
      .from('coworking_info_table')
      .select('*');

    // Создаем объект с резервной копией
    const backupData = {
      timestamp: new Date().toISOString(),
      header: headerData?.coworking_header_settings || null,
      services: servicesData || [],
      migration_info: {
        source: 'legacy_coworking_schema',
        version: '1.0'
      }
    };

    // Сохраняем в новую схему как backup
    const { error } = await supabase
      .from('sh_site_settings')
      .upsert({
        id: 1,
        coworking_legacy_backup: backupData
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Ошибка при создании резервной копии:', error);
      return false;
    }

    console.log('Резервная копия создана успешно');
    return true;

  } catch (error) {
    console.error('Ошибка при создании резервной копии:', error);
    return false;
  }
}

/**
 * Полная миграция с созданием резервной копии
 */
export async function fullMigrationWithBackup(): Promise<boolean> {
  try {
    // 1. Создаем резервную копию
    const backupSuccess = await backupLegacyCoworkingData();
    if (!backupSuccess) {
      console.error('Не удалось создать резервную копию');
      return false;
    }

    // 2. Выполняем миграцию
    const migrationSuccess = await migrateLegacyCoworkingData();
    if (!migrationSuccess) {
      console.error('Не удалось выполнить миграцию');
      return false;
    }

    console.log('Полная миграция с резервной копией завершена успешно!');
    return true;

  } catch (error) {
    console.error('Ошибка при полной миграции:', error);
    return false;
  }
}

/**
 * Восстановление данных из резервной копии
 */
export async function restoreFromBackup(): Promise<boolean> {
  try {
    console.log('Восстанавливаем данные из резервной копии...');

    // Получаем резервную копию
    const { data, error } = await supabase
      .from('sh_site_settings')
      .select('coworking_legacy_backup')
      .eq('id', 1)
      .single();

    if (error || !data?.coworking_legacy_backup) {
      console.error('Резервная копия не найдена');
      return false;
    }

    const backupData = data.coworking_legacy_backup;

    // Восстанавливаем заголовок в старую схему
    if (backupData.header) {
      const { error: headerError } = await supabase
        .from('site_settings')
        .upsert({
          id: 1,
          coworking_header_settings: backupData.header
        });

      if (headerError) {
        console.error('Ошибка при восстановлении заголовка:', headerError);
      }
    }

    // Восстанавливаем услуги в старую схему
    if (backupData.services && backupData.services.length > 0) {
      // Сначала очищаем таблицу
      await supabase.from('coworking_info_table').delete().neq('id', '');

      // Затем вставляем данные из резервной копии
      const { error: servicesError } = await supabase
        .from('coworking_info_table')
        .insert(backupData.services);

      if (servicesError) {
        console.error('Ошибка при восстановлении услуг:', servicesError);
      }
    }

    console.log('Данные восстановлены из резервной копии');
    return true;

  } catch (error) {
    console.error('Ошибка при восстановлении:', error);
    return false;
  }
}

/**
 * Очистка старых данных после успешной миграции
 */
export async function cleanupLegacyData(): Promise<boolean> {
  try {
    console.log('Очищаем старые данные...');

    // Очищаем заголовок из старой схемы
    const { error: headerError } = await supabase
      .from('site_settings')
      .update({ coworking_header_settings: null })
      .eq('id', 1);

    if (headerError) {
      console.error('Ошибка при очистке заголовка:', headerError);
    }

    // Помечаем старые услуги как неактивные вместо удаления
    const { error: servicesError } = await supabase
      .from('coworking_info_table')
      .update({ active: false })
      .eq('active', true);

    if (servicesError) {
      console.error('Ошибка при деактивации услуг:', servicesError);
    }

    console.log('Очистка старых данных завершена');
    return true;

  } catch (error) {
    console.error('Ошибка при очистке:', error);
    return false;
  }
}

/**
 * Проверка целостности данных после миграции
 */
export async function validateMigration(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Проверяем новые данные
    const { data: newData, error } = await supabase
      .from('sh_site_settings')
      .select('coworking_page_settings')
      .eq('id', 1)
      .single();

    if (error || !newData?.coworking_page_settings) {
      issues.push('Новые данные не найдены в схеме sh_site_settings');
      return { isValid: false, issues };
    }

    const settings = newData.coworking_page_settings;

    // Проверяем заголовок
    if (!settings.header || !settings.header.title) {
      issues.push('Отсутствует заголовок или его название');
    }

    // Проверяем услуги
    if (!settings.services || !Array.isArray(settings.services)) {
      issues.push('Услуги не являются массивом');
    } else {
      settings.services.forEach((service: any, index: number) => {
        if (!service.id) {
          issues.push(`Услуга ${index + 1}: отсутствует ID`);
        }
        if (!service.name) {
          issues.push(`Услуга ${index + 1}: отсутствует название`);
        }
        if (typeof service.price !== 'number') {
          issues.push(`Услуга ${index + 1}: некорректная цена`);
        }
      });
    }

    // Проверяем timestamp
    if (!settings.lastUpdated) {
      issues.push('Отсутствует timestamp последнего обновления');
    }

    return { isValid: issues.length === 0, issues };

  } catch (error) {
    console.error('Ошибка при валидации:', error);
    return { 
      isValid: false, 
      issues: [`Ошибка при валидации: ${error}`] 
    };
  }
}
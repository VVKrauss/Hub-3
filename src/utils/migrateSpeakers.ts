// src/utils/migrateSpeakers.ts - Скрипт миграции спикеров из старой БД в новую
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Типы для старой БД
interface OldSpeaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  date_of_birth: string | null;
  photos: { url: string }[];
  contact_info: any;
  blogs: any[];
  blog_visibility: any;
  google_drive_link: string | null;
  active: boolean;
}

// Функция для создания slug из имени
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[а-я]/g, (char) => {
      const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
      const en = 'abvgdeejzijklmnoprstufhccss_y_eua';
      const index = ru.indexOf(char);
      return index !== -1 ? en[index] : char;
    })
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Функция для извлечения социальных ссылок из contact_info
const extractSocialLinks = (contactInfo: any, speakerId: string) => {
  if (!contactInfo || typeof contactInfo !== 'object') {
    return [];
  }

  const socialLinks = [];
  let displayOrder = 0;

  // Проверяем различные поля в contact_info
  const platformMappings = {
    website: 'website',
    site: 'website',
    linkedin: 'linkedin',
    twitter: 'twitter',
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube',
    github: 'github',
    telegram: 'website' // мапим telegram на website пока нет отдельного типа
  };

  Object.entries(contactInfo).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      const lowerKey = key.toLowerCase();
      const platform = platformMappings[lowerKey as keyof typeof platformMappings];
      
      if (platform && (value.startsWith('http') || value.startsWith('www'))) {
        socialLinks.push({
          speaker_id: speakerId,
          platform,
          url: value.startsWith('www') ? `https://${value}` : value,
          display_name: key,
          description: null,
          is_public: true,
          is_primary: displayOrder === 0,
          display_order: displayOrder,
          created_at: new Date().toISOString()
        });
        displayOrder++;
      }
    }
  });

  return socialLinks;
};

// Основная функция миграции
export const migrateSpeakersToNewDB = async (): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let migratedCount = 0;
  let skippedCount = 0;

  try {
    console.log('Начинаем миграцию спикеров...');

    // Получаем всех спикеров из старой БД
    const { data: oldSpeakers, error: fetchError } = await supabase
      .from('speakers')
      .select('*')
      .order('name');

    if (fetchError) {
      throw new Error(`Ошибка при получении спикеров: ${fetchError.message}`);
    }

    if (!oldSpeakers || oldSpeakers.length === 0) {
      console.log('Спикеры в старой БД не найдены');
      return { success: true, migratedCount: 0, skippedCount: 0, errors: [] };
    }

    console.log(`Найдено ${oldSpeakers.length} спикеров для миграции`);

    // Получаем существующих спикеров из новой БД для проверки дублей
    const { data: existingSpeakers } = await supabase
      .from('sh_speakers')
      .select('name, slug');

    const existingNames = new Set(existingSpeakers?.map(s => s.name.toLowerCase()) || []);
    const existingSlugs = new Set(existingSpeakers?.map(s => s.slug) || []);

    // Мигрируем каждого спикера
    for (const oldSpeaker of oldSpeakers as OldSpeaker[]) {
      try {
        // Проверяем, не существует ли уже спикер с таким именем
        if (existingNames.has(oldSpeaker.name.toLowerCase())) {
          console.log(`Пропускаем спикера ${oldSpeaker.name} - уже существует`);
          skippedCount++;
          continue;
        }

        // Генерируем уникальный slug
        let slug = generateSlug(oldSpeaker.name);
        let counter = 1;
        while (existingSlugs.has(slug)) {
          slug = `${generateSlug(oldSpeaker.name)}-${counter}`;
          counter++;
        }
        existingSlugs.add(slug);

        // Формируем данные для новой БД
        const newSpeakerData = {
          name: oldSpeaker.name,
          slug: slug,
          bio: oldSpeaker.description || null,
          field_of_expertise: oldSpeaker.field_of_expertise || null,
          birth_date: oldSpeaker.date_of_birth || null,
          avatar_url: oldSpeaker.photos?.[0]?.url || null,
          private_notes: oldSpeaker.google_drive_link ? `Google Drive: ${oldSpeaker.google_drive_link}` : null,
          status: oldSpeaker.active ? 'active' : 'inactive' as const,
          is_featured: false,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Создаем спикера в новой БД
        const { data: newSpeaker, error: speakerError } = await supabase
          .from('sh_speakers')
          .insert([newSpeakerData])
          .select()
          .single();

        if (speakerError) {
          throw new Error(`Ошибка при создании спикера ${oldSpeaker.name}: ${speakerError.message}`);
        }

        console.log(`Мигрирован спикер: ${oldSpeaker.name} -> ${newSpeaker.id}`);

        // Извлекаем и создаем социальные ссылки
        const socialLinks = extractSocialLinks(oldSpeaker.contact_info, newSpeaker.id);
        
        if (socialLinks.length > 0) {
          const { error: socialError } = await supabase
            .from('sh_speaker_social_links')
            .insert(socialLinks);

          if (socialError) {
            errors.push(`Ошибка при создании социальных ссылок для ${oldSpeaker.name}: ${socialError.message}`);
          } else {
            console.log(`Добавлено ${socialLinks.length} социальных ссылок для ${oldSpeaker.name}`);
          }
        }

        migratedCount++;
        existingNames.add(oldSpeaker.name.toLowerCase());

      } catch (error) {
        const errorMessage = `Ошибка при миграции спикера ${oldSpeaker.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    console.log(`Миграция завершена. Мигрировано: ${migratedCount}, пропущено: ${skippedCount}, ошибок: ${errors.length}`);

    return {
      success: true,
      migratedCount,
      skippedCount,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Критическая ошибка миграции:', errorMessage);
    return {
      success: false,
      migratedCount,
      skippedCount,
      errors: [errorMessage, ...errors]
    };
  }
};

// Функция для отката миграции (удаления всех мигрированных спикеров)
export const rollbackSpeakersMigration = async (): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    console.log('Начинаем откат миграции спикеров...');

    // Получаем всех спикеров из новой БД
    const { data: speakers, error: fetchError } = await supabase
      .from('sh_speakers')
      .select('id, name');

    if (fetchError) {
      throw new Error(`Ошибка при получении спикеров: ${fetchError.message}`);
    }

    if (!speakers || speakers.length === 0) {
      console.log('Спикеры в новой БД не найдены');
      return { success: true, deletedCount: 0, errors: [] };
    }

    // Удаляем всех спикеров (социальные ссылки удалятся автоматически по CASCADE)
    const { error: deleteError } = await supabase
      .from('sh_speakers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем всех

    if (deleteError) {
      throw new Error(`Ошибка при удалении спикеров: ${deleteError.message}`);
    }

    deletedCount = speakers.length;
    console.log(`Удалено ${deletedCount} спикеров`);

    return {
      success: true,
      deletedCount,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Ошибка отката миграции:', errorMessage);
    return {
      success: false,
      deletedCount,
      errors: [errorMessage]
    };
  }
};

// Функция для проверки состояния миграции
export const checkMigrationStatus = async (): Promise<{
  oldSpeakersCount: number;
  newSpeakersCount: number;
  needsMigration: boolean;
}> => {
  try {
    // Считаем спикеров в старой БД
    const { count: oldCount } = await supabase
      .from('speakers')
      .select('*', { count: 'exact', head: true });

    // Считаем спикеров в новой БД
    const { count: newCount } = await supabase
      .from('sh_speakers')
      .select('*', { count: 'exact', head: true });

    return {
      oldSpeakersCount: oldCount || 0,
      newSpeakersCount: newCount || 0,
      needsMigration: (oldCount || 0) > (newCount || 0)
    };
  } catch (error) {
    console.error('Ошибка при проверке статуса миграции:', error);
    return {
      oldSpeakersCount: 0,
      newSpeakersCount: 0,
      needsMigration: false
    };
  }
};

// Компонент для UI миграции (можно использовать в админке)
export const MigrationUI: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    oldSpeakersCount: number;
    newSpeakersCount: number;
    needsMigration: boolean;
  } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const migrationStatus = await checkMigrationStatus();
    setStatus(migrationStatus);
  };

  const handleMigration = async () => {
    if (!confirm('Вы уверены, что хотите запустить миграцию спикеров? Это может занять некоторое время.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await migrateSpeakersToNewDB();
      
      if (result.success) {
        toast.success(`Миграция завершена! Мигрировано: ${result.migratedCount}, пропущено: ${result.skippedCount}`);
        
        if (result.errors.length > 0) {
          console.warn('Ошибки при миграции:', result.errors);
          toast.error(`Найдены ошибки: ${result.errors.length}. Проверьте консоль.`);
        }
      } else {
        toast.error('Миграция не удалась');
        console.error('Ошибки миграции:', result.errors);
      }
      
      await checkStatus();
    } catch (error) {
      console.error('Ошибка миграции:', error);
      toast.error('Ошибка при выполнении миграции');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!confirm('Вы уверены, что хотите удалить всех спикеров из новой БД? Это действие нельзя отменить!')) {
      return;
    }

    setLoading(true);
    try {
      const result = await rollbackSpeakersMigration();
      
      if (result.success) {
        toast.success(`Откат завершен! Удалено: ${result.deletedCount} спикеров`);
      } else {
        toast.error('Откат не удался');
        console.error('Ошибки отката:', result.errors);
      }
      
      await checkStatus();
    } catch (error) {
      console.error('Ошибка отката:', error);
      toast.error('Ошибка при выполнении отката');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return <div>Загрузка статуса миграции...</div>;
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Миграция спикеров</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-300">Старая БД</h3>
          <p className="text-2xl font-bold text-blue-600">{status.oldSpeakersCount}</p>
          <p className="text-sm text-blue-700 dark:text-blue-400">спикеров</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-green-900 dark:text-green-300">Новая БД</h3>
          <p className="text-2xl font-bold text-green-600">{status.newSpeakersCount}</p>
          <p className="text-sm text-green-700 dark:text-green-400">спикеров</p>
        </div>
      </div>

      {status.needsMigration && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Обнаружены спикеры, которые нужно мигрировать в новую БД.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleMigration}
          disabled={loading || !status.needsMigration}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Выполняется...' : 'Запустить миграцию'}
        </button>

        {status.newSpeakersCount > 0 && (
          <button
            onClick={handleRollback}
            disabled={loading}
            className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
          >
            Откатить миграцию
          </button>
        )}

        <button
          onClick={checkStatus}
          disabled={loading}
          className="btn-outline"
        >
          Обновить статус
        </button>
      </div>
    </div>
  );
};
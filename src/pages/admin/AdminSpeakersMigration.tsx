// src/pages/admin/AdminSpeakersMigration.tsx - Страница для миграции спикеров
import React, { useState, useEffect } from 'react';
import { ArrowRight, Database, Users, AlertTriangle, CheckCircle, RefreshCw, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

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

  const platformMappings = {
    website: 'website',
    site: 'website',
    linkedin: 'linkedin',
    twitter: 'twitter',
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube',
    github: 'github',
    telegram: 'website'
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

const AdminSpeakersMigration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [migrationStep, setMigrationStep] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    oldSpeakersCount: number;
    newSpeakersCount: number;
    needsMigration: boolean;
  } | null>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkMigrationStatus = async () => {
    try {
      // Считаем спикеров в старой БД
      const { count: oldCount } = await supabase
        .from('speakers')
        .select('*', { count: 'exact', head: true });

      // Считаем спикеров в новой БД
      const { count: newCount } = await supabase
        .from('sh_speakers')
        .select('*', { count: 'exact', head: true });

      setStatus({
        oldSpeakersCount: oldCount || 0,
        newSpeakersCount: newCount || 0,
        needsMigration: (oldCount || 0) > (newCount || 0)
      });
    } catch (error) {
      console.error('Ошибка при проверке статуса миграции:', error);
      toast.error('Ошибка при проверке статуса миграции');
    }
  };

  const migrateSpeakers = async () => {
    if (!confirm('Вы уверены, что хотите запустить миграцию спикеров? Это может занять некоторое время.')) {
      return;
    }

    setLoading(true);
    setMigrationStep('running');
    setLogs([]);
    setProgress({ current: 0, total: 0 });

    try {
      addLog('Начинаем миграцию спикеров...');

      // Получаем всех спикеров из старой БД
      const { data: oldSpeakers, error: fetchError } = await supabase
        .from('speakers')
        .select('*')
        .order('name');

      if (fetchError) {
        throw new Error(`Ошибка при получении спикеров: ${fetchError.message}`);
      }

      if (!oldSpeakers || oldSpeakers.length === 0) {
        addLog('Спикеры в старой БД не найдены');
        setMigrationStep('completed');
        return;
      }

      setProgress({ current: 0, total: oldSpeakers.length });
      addLog(`Найдено ${oldSpeakers.length} спикеров для миграции`);

      // Получаем существующих спикеров из новой БД
      const { data: existingSpeakers } = await supabase
        .from('sh_speakers')
        .select('name, slug');

      const existingNames = new Set(existingSpeakers?.map(s => s.name.toLowerCase()) || []);
      const existingSlugs = new Set(existingSpeakers?.map(s => s.slug) || []);

      let migratedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Мигрируем каждого спикера
      for (let i = 0; i < oldSpeakers.length; i++) {
        const oldSpeaker = oldSpeakers[i] as OldSpeaker;
        setProgress({ current: i + 1, total: oldSpeakers.length });

        try {
          // Проверяем, не существует ли уже спикер с таким именем
          if (existingNames.has(oldSpeaker.name.toLowerCase())) {
            addLog(`Пропускаем спикера ${oldSpeaker.name} - уже существует`);
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

          addLog(`✓ Мигрирован спикер: ${oldSpeaker.name}`);

          // Извлекаем и создаем социальные ссылки
          const socialLinks = extractSocialLinks(oldSpeaker.contact_info, newSpeaker.id);
          
          if (socialLinks.length > 0) {
            const { error: socialError } = await supabase
              .from('sh_speaker_social_links')
              .insert(socialLinks);

            if (socialError) {
              errors.push(`Ошибка при создании социальных ссылок для ${oldSpeaker.name}: ${socialError.message}`);
            } else {
              addLog(`  ↳ Добавлено ${socialLinks.length} социальных ссылок`);
            }
          }

          migratedCount++;
          existingNames.add(oldSpeaker.name.toLowerCase());

          // Небольшая пауза чтобы не перегружать БД
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          const errorMessage = `Ошибка при миграции спикера ${oldSpeaker.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
          addLog(`✗ ${errorMessage}`);
          errors.push(errorMessage);
        }
      }

      addLog(`Миграция завершена! Мигрировано: ${migratedCount}, пропущено: ${skippedCount}, ошибок: ${errors.length}`);
      
      if (errors.length > 0) {
        setMigrationStep('error');
        toast.error(`Миграция завершена с ошибками: ${errors.length}`);
      } else {
        setMigrationStep('completed');
        toast.success(`Миграция успешно завершена! Мигрировано: ${migratedCount} спикеров`);
      }

      await checkMigrationStatus();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      addLog(`Критическая ошибка миграции: ${errorMessage}`);
      setMigrationStep('error');
      toast.error('Критическая ошибка миграции');
    } finally {
      setLoading(false);
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('Вы уверены, что хотите удалить всех спикеров из новой БД? Это действие нельзя отменить!')) {
      return;
    }

    setLoading(true);
    setLogs([]);

    try {
      addLog('Начинаем откат миграции...');

      const { data: speakers, error: fetchError } = await supabase
        .from('sh_speakers')
        .select('id, name');

      if (fetchError) {
        throw new Error(`Ошибка при получении спикеров: ${fetchError.message}`);
      }

      if (!speakers || speakers.length === 0) {
        addLog('Спикеры в новой БД не найдены');
        toast.info('Спикеры для удаления не найдены');
        return;
      }

      addLog(`Найдено ${speakers.length} спикеров для удаления`);

      // Удаляем всех спикеров (социальные ссылки удалятся автоматически по CASCADE)
      const { error: deleteError } = await supabase
        .from('sh_speakers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем всех

      if (deleteError) {
        throw new Error(`Ошибка при удалении спикеров: ${deleteError.message}`);
      }

      addLog(`✓ Удалено ${speakers.length} спикеров`);
      toast.success(`Откат завершен! Удалено: ${speakers.length} спикеров`);
      
      await checkMigrationStatus();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      addLog(`Ошибка отката миграции: ${errorMessage}`);
      toast.error('Ошибка при выполнении отката');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Миграция спикеров
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Перенос данных спикеров из старой БД в новую структуру
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300">
                Старая БД
              </h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {status.oldSpeakersCount}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                спикеров в таблице `speakers`
              </p>
            </div>
            <Database className="h-12 w-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-green-900 dark:text-green-300">
                Новая БД
              </h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {status.newSpeakersCount}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                спикеров в таблице `sh_speakers`
              </p>
            </div>
            <Users className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className={`rounded-lg p-6 ${
          status.needsMigration 
            ? 'bg-yellow-50 dark:bg-yellow-900/20' 
            : 'bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-medium ${
                status.needsMigration 
                  ? 'text-yellow-900 dark:text-yellow-300' 
                  : 'text-gray-900 dark:text-gray-300'
              }`}>
                Статус
              </h3>
              <p className={`text-sm mt-2 ${
                status.needsMigration 
                  ? 'text-yellow-700 dark:text-yellow-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {status.needsMigration ? 'Требуется миграция' : 'Миграция не требуется'}
              </p>
            </div>
            {status.needsMigration ? (
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
          </div>
        </div>
      </div>

      {/* Migration Controls */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Управление миграцией</h2>
        
        {status.needsMigration && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Обнаружены спикеры для миграции
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  В старой БД найдено {status.oldSpeakersCount - status.newSpeakersCount} спикеров, 
                  которые еще не перенесены в новую структуру.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button
            onClick={migrateSpeakers}
            disabled={loading || !status.needsMigration}
            className="btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            {loading && migrationStep === 'running' ? 'Миграция...' : 'Запустить миграцию'}
          </button>

          {status.newSpeakersCount > 0 && (
            <button
              onClick={rollbackMigration}
              disabled={loading}
              className="btn-outline border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Откатить миграцию
            </button>
          )}

          <button
            onClick={checkMigrationStatus}
            disabled={loading}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Обновить статус
          </button>
        </div>

        {/* Progress */}
        {migrationStep === 'running' && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Прогресс миграции</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Migration Logs */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Логи миграции</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-300 mb-4">
          Инструкции по миграции
        </h2>
        <div className="space-y-3 text-blue-800 dark:text-blue-300">
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
            <p>Проверьте статус миграции - сколько спикеров в старой и новой БД</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</span>
            <p>Если требуется миграция, нажмите "Запустить миграцию"</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
            <p>Следите за прогрессом в логах миграции</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</span>
            <p>После успешной миграции обновите код для использования новой БД</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSpeakersMigration;
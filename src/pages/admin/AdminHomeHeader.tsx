// Добавить в AdminHomeHeader.tsx

// 1. Добавить в типы и интерфейсы
type HomepageEventsSettings = {
  events_count: number;
  show_title: boolean;
  show_date: boolean;
  show_time: boolean;
  show_language: boolean;
  show_type: boolean;
  show_age: boolean;
  show_image: boolean;
  show_price: boolean;
};

// 2. Добавить в дефолтные значения
const defaultEventsSettings: HomepageEventsSettings = {
  events_count: 3,
  show_title: true,
  show_date: true,
  show_time: true,
  show_language: true,
  show_type: true,
  show_age: true,
  show_image: true,
  show_price: true
};

// 3. Добавить в состояние компонента
const [eventsSettings, setEventsSettings] = useState<HomepageEventsSettings>(defaultEventsSettings);

// 4. Добавить в fetchData функцию
if (data.homepage_settings) {
  setEventsSettings({
    ...defaultEventsSettings,
    ...data.homepage_settings
  });
}

// 5. Добавить в handleSave функцию
homepage_settings: eventsSettings,

// 6. Добавить секцию в JSX (после других секций)
{/* Events Settings Section */}
<div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6 mb-6">
  <div className="flex justify-between items-center mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
        <Calendar className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Настройки блока "Мероприятия"</h2>
    </div>
  </div>

  <div className="space-y-6">
    {/* Количество событий */}
    <div>
      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
        Количество отображаемых мероприятий
      </label>
      <select
        value={eventsSettings.events_count}
        onChange={(e) => setEventsSettings(prev => ({
          ...prev,
          events_count: parseInt(e.target.value)
        }))}
        className="w-full p-3 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-800 dark:text-white focus:ring-2 focus:ring-primary-500"
      >
        <option value={1}>1 мероприятие</option>
        <option value={2}>2 мероприятия</option>
        <option value={3}>3 мероприятия</option>
        <option value={4}>4 мероприятия</option>
        <option value={6}>6 мероприятий</option>
        <option value={8}>8 мероприятий</option>
      </select>
    </div>

    {/* Настройки отображения */}
    <div>
      <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
        Отображаемые элементы
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { key: 'show_title', label: 'Заголовок' },
          { key: 'show_date', label: 'Дата' },
          { key: 'show_time', label: 'Время' },
          { key: 'show_language', label: 'Язык' },
          { key: 'show_type', label: 'Тип события' },
          { key: 'show_age', label: 'Возрастная категория' },
          { key: 'show_image', label: 'Изображение' },
          { key: 'show_price', label: 'Цена' }
        ].map(setting => (
          <label key={setting.key} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={eventsSettings[setting.key as keyof HomepageEventsSettings] as boolean}
              onChange={(e) => setEventsSettings(prev => ({
                ...prev,
                [setting.key]: e.target.checked
              }))}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-dark-700 dark:text-dark-300">
              {setting.label}
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* Предварительный просмотр */}
    <div>
      <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
        Предварительный просмотр
      </h3>
      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-dark-600">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Calendar className="w-8 h-8 mx-auto mb-2" />
          <p>Будет показано {eventsSettings.events_count} мероприятий</p>
          <p className="text-xs mt-1">
            С элементами: {[
              eventsSettings.show_title && 'заголовок',
              eventsSettings.show_date && 'дата',
              eventsSettings.show_time && 'время',
              eventsSettings.show_image && 'изображение',
              eventsSettings.show_price && 'цена'
            ].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
// ============ ОСНОВНОЙ РЕНДЕР ============

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Мероприятия"
            subtitle="Загрузка событий..."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Hero слайдшоу с предстоящими событиями */}
        <div className="bg-white dark:bg-gray-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <EventsHeroSlider events={events} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Поисковая панель */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Строка поиска */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск событий по названию, описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопки управления */}
              <div className="flex gap-2">
                {/* Кнопка фильтров для мобильных */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>

                {/* Переключатель вида */}
                <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${
                      viewMode === 'grid'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${
                      viewMode === 'list'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Сортировка */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-10 text-sm focus:ring-primary-500 focus:border-primary-500 dark:text-white"
                  >
                    <option value="date_asc">Дата: сначала ближайшие</option>
                    <option value="date_desc">Дата: сначала дальние</option>
                    <option value="title_asc">Название: А-Я</option>
                    <option value="title_desc">Название: Я-А</option>
                    <option value="price_asc">Цена: по возрастанию</option>
                    <option value="price_desc">Цена: по убыванию</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Экспорт */}
                <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Экспорт</span>
                </button>
              </div>
            </div>

            {/* Быстрые фильтры */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleFilterChange('status', ['active'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.status?.includes('active') && filters.status?.length === 1
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Активные
              </button>
              
              <button
                onClick={() => handleFilterChange('payment_type', ['free'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.payment_type?.includes('free')
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Бесплатные
              </button>

              <button
                onClick={() => handleFilterChange('is_featured', true)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.is_featured === true
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ⭐ Рекомендуемые
              </button>

              {/* Очистить фильтры */}
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                >
                  ✕ Очистить все
                </button>
              )}
            </div>
          </div>

          {/* Мобильные фильтры */}
          {showMobileFilters && (
            <div className="lg:hidden mb-8">
              <FiltersPanel />
            </div>
          )}

          {/* Основной контент */}
          <div className="flex gap-8">
            {/* Боковая панель с фильтрами (десктоп) */}
            {pageSettings.showFilters && (
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-8">
                  <FiltersPanel />
                </div>
              </aside>
            )}

            {/* Основная область контента */}
            <main className="flex-1 min-w-0">
              {/* Рекомендуемые события */}
              {featuredEvents.length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-500" />
                      Рекомендуемые события
                    </h2>
                    <Link
                      to="/events?featured=true"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                      Все рекомендуемые
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {featuredEvents.slice(0, 3).map(event => renderEventCard(event))}
                  </div>
                </section>
              )}

              {/* Заголовок секции основных событий */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {searchQuery ? `Результаты поиска "${searchQuery}"` : 'Все события'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {loading ? 'Загрузка...' : 
                       searchQuery ? `Найдено: ${events.length}` :
                       `Показано ${events.length} из ${stats.total} событий`}
                    </p>
                  </div>

                  {/* Статистика */}
                  {!searchQuery && stats.total > 0 && (
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.active}</div>
                        <div>Активных</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.past}</div>
                        <div>Прошедших</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.featured}</div>
                        <div>Рекомендуемых</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                  <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Ошибка загрузки
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {error}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                          loadEvents(true);
                        }}
                        className="ml-auto bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Повторить
                      </button>
                    </div>
                  </div>
                )}

                {/* Индикатор загрузки */}
                {loadingMore && !loading && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
                  </div>
                )}

                {/* Список событий */}
                {!loading && !loadingMore && events.length === 0 ? (
                  /* Пустое состояние */
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      События не найдены
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      {searchQuery 
                        ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить условия поиска.`
                        : hasActiveFilters()
                        ? 'События с такими фильтрами не найдены. Попробуйте изменить условия поиска.'
                        : 'В ближайшее время событий не запланировано. Следите за обновлениями!'
                      }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {hasActiveFilters() && (
                        <button
                          onClick={clearFilters}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Показать все события
                        </button>
                      )}
                      
                      <Link
                        to="/events?status=past"
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        {searchQuery ? 'Перейти к полному списку' : 'Посмотреть прошедшие события'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Сетка/список событий */
                  <>
                    <div className={
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                        : 'space-y-4'
                    }>
                      {events.map(event => 
                        viewMode === 'grid' 
                          ? renderEventCard(event)
                          : renderEventListItem(event)
                      )}
                    </div>

                    {/* Кнопка "Загрузить еще" */}
                    {hasMore && !searchQuery && (
                      <div className="text-center mt-12">
                        <button
                          onClick={() => loadEvents(false)}
                          disabled={loadingMore}
                          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Загрузить еще события
                            </>
                          )}
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Показано {events.length} из {stats.total} событий
                        </p>
                      </div>
                    )}

                    {/* Информация о завершении списка */}
                    {!hasMore && events.length > pageSettings.itemsPerPage && (
                      <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                          Вы просмотрели все доступные события ({events.length})
                        </p>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                        >
                          ↑ Вернуться к началу
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Call to Action */}
              {events.length > 0 && (
                <section className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-white text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    Не нашли подходящее событие?
                  </h2>
                  <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                    Подпишитесь на наши уведомления, чтобы первыми узнавать о новых мероприятиях, 
                    или предложите свою тему для будущих событий.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors">
                      Подписаться на уведомления
                    </button>
                    <Link
                      to="/contact"
                      className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Предложить тему
                    </Link>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;// ============ ОСНОВНОЙ РЕНДЕР ============

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Мероприятия"
            subtitle="Загрузка событий..."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Hero слайдшоу с предстоящими событиями */}
        <div className="bg-white dark:bg-gray-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <EventsHeroSlider events={events} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Поисковая панель */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Строка поиска */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск событий по названию, описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Кнопки управления */}
              <div className="flex gap-2">
                {/* Кнопка фильтров для мобильных */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>

                {/* Переключатель вида */}
                <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${
                      viewMode === 'grid'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${
                      viewMode === 'list'
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    } transition-colors`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Сортировка */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-10 text-sm focus:ring-primary-500 focus:border-primary-500 dark:text-white"
                  >
                    <option value="date_asc">Дата: сначала ближайшие</option>
                    <option value="date_desc">Дата: сначала дальние</option>
                    <option value="title_asc">Название: А-Я</option>
                    <option value="title_desc">Название: Я-А</option>
                    <option value="price_asc">Цена: по возрастанию</option>
                    <option value="price_desc">Цена: по убыванию</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Экспорт */}
                <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Экспорт</span>
                </button>
              </div>
            </div>

            {/* Быстрые фильтры */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleFilterChange('status', ['active'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.status?.includes('active') && filters.status?.length === 1
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Активные
              </button>
              
              <button
                onClick={() => handleFilterChange('payment_type', ['free'])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.payment_type?.includes('free')
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Бесплатные
              </button>

              <button
                onClick={() => handleFilterChange('is_featured', true)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.is_featured === true
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ⭐ Рекомендуемые
              </button>

              {/* Очистить фильтры */}
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                >
                  ✕ Очистить все
                </button>
              )}
            </div>
          </div>

          {/* Мобильные фильтры */}
          {showMobileFilters && (
            <div className="lg:hidden mb-8">
              <FiltersPanel />
            </div>
          )}

          {/* Основной контент */}
          <div className="flex gap-8">
            {/* Боковая панель с фильтрами (десктоп) */}
            {pageSettings.showFilters && (
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-8">
                  <FiltersPanel />
                </div>
              </aside>
            )}

            {/* Основная область контента */}
            <main className="flex-1 min-w-0">
              {/* Рекомендуемые события */}
              {featuredEvents.length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-500" />
                      Рекомендуемые события
                    </h2>
                    <Link
                      to="/events?featured=true"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                      Все рекомендуемые
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {featuredEvents.slice(0, 3).map(event => renderEventCard(event))}
                  </div>
                </section>
              )}

              {/* Заголовок секции основных событий */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {searchQuery ? `Результаты поиска "${searchQuery}"` : 'Все события'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {loading ? 'Загрузка...' : 
                       searchQuery ? `Найдено: ${events.length}` :
                       `Показано ${events.length} из ${stats.total} событий`}
                    </p>
                  </div>

                  {/* Статистика */}
                  {!searchQuery && stats.total > 0 && (
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.active}</div>
                        <div>Активных</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.past}</div>
                        <div>Прошедших</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white">{stats.featured}</div>
                        <div>Рекомендуемых</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                  <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Ошибка загрузки
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {error}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                          loadEvents(true);
                        }}
                        className="ml-auto bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Повторить
                      </button>
                    </div>
                  </div>
                )}

                {/* Индикатор загрузки */}
                {loadingMore && !loading && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Загружаем события...</p>
                  </div>
                )}

                {/* Список событий */}
                {!loading && !loadingMore && events.length === 0 ? (
                  /* Пустое состояние */
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      События не найдены
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      {searchQuery 
                        ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить условия поиска.`
                        : hasActiveFilters()
                        ? 'События с такими фильтрами не найдены. Попробуйте изменить условия поиска.'
                        : 'В ближайшее время событий не запланировано. Следите за обновлениями!'
                      }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {hasActiveFilters() && (
                        <button
                          onClick={clearFilters}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Показать все события
                        </button>
                      )}
                      
                      <Link
                        to="/events?status=past"
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        {searchQuery ? 'Перейти к полному списку' : 'Посмотреть прошедшие события'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Сетка/список событий */
                  <>
                    <div className={
                      viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                        : 'space-y-4'
                    }>
                      {events.map(event => 
                        viewMode === 'grid' 
                          ? renderEventCard(event)
                          : renderEventListItem(event)
                      )}
                    </div>

                    {/* Кнопка "Загрузить еще" */}
                    {hasMore && !searchQuery && (
                      <div className="text-center mt-12">
                        <button
                          onClick={() => loadEvents(false)}
                          disabled={loadingMore}
                          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Загрузить еще события
                            </>
                          )}
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Показано {events.length} из {stats.total} событий
                        </p>
                      </div>
                    )}

                    {/* Информация о завершении списка */}
                    {!hasMore && events.length > pageSettings.itemsPerPage && (
                      <div className="text-center mt-12 py-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                          Вы просмотрели все доступные события ({events.length})
                        </p>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                        >
                          ↑ Вернуться к началу
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Call to Action */}
              {events.length > 0 && (
                <section className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-white text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    Не нашли подходящее событие?
                  </h2>
                  <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                    Подпишитесь на наши уведомления, чтобы первыми узнавать о новых мероприятиях, 
                    или предложите свою тему для будущих событий.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors">
                      Подписаться на уведомления
                    </button>
                    <Link
                      to="/contact"
                      className="bg-primary-700 hover:bg-primary-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Предложить тему
                    </Link>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
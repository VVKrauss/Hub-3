           </p>
                  </div>

                  {/* Индикатор избранных */}
                  {favorites.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>У вас {favorites.size} избранных событий</span>
                    </div>
                  )}
                </div>

                {/* Сетка или список событий */}
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
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
                      className="btn-primary flex items-center gap-2 mx-auto px-8 py-3"
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
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
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
                Подпишитесь на уведомления о новых событиях или предложите свою тему для мероприятия
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/notifications" 
                  className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Подписаться на уведомления
                </Link>
                <Link 
                  to="/suggest-event" 
                  className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
                >
                  Предложить событие
                </Link>
              </div>
            </section>
          )}

          {/* Мобильная панель фильтров (модальное окно) */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)} />
              <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-dark-800 shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="p-4 overflow-y-auto">
                  {/* Мобильная версия фильтров */}
                  <div className="space-y-6">
                    {/* Тип события */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Тип события
                      </label>
                      <select
                        value={filters.event_type?.[0] || ''}
                        onChange={(e) => updateFilter('event_type', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Все типы</option>
                        <option value="lecture">Лекция</option>
                        <option value="workshop">Мастер-класс</option>
                        <option value="festival">Фестиваль</option>
                        <option value="conference">Конференция</option>
                        <option value="seminar">Семинар</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>

                    {/* Возрастная категория */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Возраст
                      </label>
                      <select
                        value={filters.age_category?.[0] || ''}
                        onChange={(e) => updateFilter('age_category', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Все возрасты</option>
                        <option value="0+">0+</option>
                        <option value="6+">6+</option>
                        <option value="12+">12+</option>
                        <option value="16+">16+</option>
                        <option value="18+">18+</option>
                      </select>
                    </div>

                    {/* Тип оплаты */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Оплата
                      </label>
                      <select
                        value={filters.payment_type?.[0] || ''}
                        onChange={(e) => updateFilter('payment_type', e.target.value ? [e.target.value] : undefined)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-600 dark:bg-dark-700 dark:text-white"
                      >
                        <option value="">Любая</option>
                        <option value="free">Бесплатно</option>
                        <option value="paid">Платно</option>
                        <option value="donation">Донат</option>
                      </select>
                    </div>

                    {/* Чекбоксы */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={filters.is_featured || false}
                          onChange={(e) => updateFilter('is_featured', e.target.checked || undefined)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Рекомендуемые</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex gap-3">
                    <button
                      onClick={clearFilters}
                      className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EventsPageUpdated;
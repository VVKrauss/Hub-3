
import Layout from '../components/layout/Layout';

const CoworkingPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen py-20 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-800 dark:to-dark-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-6">
            Коворкинг пространство
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-16">
            Комфортные рабочие места для исследователей и стартапов
          </p>
          
          {/* Контактная информация */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Адрес</h3>
              <p className="text-gray-600 dark:text-gray-300">Сараевская, 48</p>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Телефон</h3>
              <p className="text-gray-600 dark:text-gray-300">+381</p>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Часы работы</h3>
              <p className="text-gray-600 dark:text-gray-300">10:00-18:00</p>
            </div>
          </div>

          {/* Тарифы */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-dark-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Почасовая аренда</h3>
              <div className="text-4xl font-bold text-primary-600 mb-6">€5<span className="text-lg text-gray-600">/час</span></div>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Гибкий график работы по часам</p>
              <button className="w-full py-3 px-6 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                Забронировать
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-8 rounded-2xl shadow-lg border-2 border-primary-200 dark:border-primary-700 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Популярный
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Дневной абонемент</h3>
              <div className="text-4xl font-bold text-primary-600 mb-6">€25<span className="text-lg text-gray-600">/день</span></div>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Полный рабочий день в коворкинге</p>
              <button className="w-full py-3 px-6 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-colors">
                Забронировать
              </button>
            </div>
            
            <div className="bg-white dark:bg-dark-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Месячный абонемент</h3>
              <div className="text-4xl font-bold text-primary-600 mb-6">€200<span className="text-lg text-gray-600">/месяц</span></div>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Неограниченный доступ на месяц</p>
              <button className="w-full py-3 px-6 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                Забронировать
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoworkingPage;
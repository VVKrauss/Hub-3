// src/pages/AboutPageUpdated.tsx
// Обновленная версия AboutPage для работы с новой БД структурой

import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';

// Импортируем новые API функции
import { getPageSettings } from '../api/settings';

interface AboutPageData {
  title: string;
  heroImage?: string;
  projectInfo: string;
  teamMembers: Array<{
    name: string;
    role: string;
    photo: string;
    bio?: string;
  }>;
  contributors: Array<{
    name: string;
    photo: string;
    contribution?: string;
  }>;
  supportPlatforms: Array<{
    url: string;
    platform: string;
    description?: string;
  }>;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
    workingHours?: string;
  };
  metaDescription?: string;
}

// Компонент для отображения иконки платформы
const PlatformIcon = ({ platform }: { platform: string }) => {
  const logos: Record<string, string> = {
    'Boosty': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/bosty-logo-100x100.png',
    'Patreon': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/pn-logo-100x100.png',
    'PayPal': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/pp-logo-100x100.png',
    'GitHub': 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    'Discord': 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png'
  };

  const logoUrl = logos[platform] || '';

  if (!logoUrl) {
    return (
      <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-600">
          {platform.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={logoUrl} 
      alt={platform}
      className="w-6 h-6 object-contain rounded"
      onError={(e) => {
        // Fallback если изображение не загружается
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        target.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
};

const AboutPageUpdated = () => {
  const [aboutData, setAboutData] = useState<AboutPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Получаем настройки страницы "О нас" из новой системы
      const response = await getPageSettings('about');
      
      if (response.error) {
        throw new Error(response.error);
      }

      const settings = response.data;
      
      // Преобразуем данные из новой структуры в ожидаемый формат
      const aboutPageData: AboutPageData = {
        title: settings?.title || 'О нас',
        heroImage: settings?.heroImage || '',
        projectInfo: settings?.projectInfo || '',
        teamMembers: settings?.teamMembers || [],
        contributors: settings?.contributors || [],
        supportPlatforms: settings?.supportPlatforms || [],
        contactInfo: settings?.contactInfo || {
          email: '',
          phone: '',
          address: ''
        },
        metaDescription: settings?.metaDescription || ''
      };

      setAboutData(aboutPageData);
    } catch (err) {
      console.error('Error fetching about data:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные страницы');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Загрузка данных...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Ошибка загрузки</h2>
              <p>{error}</p>
              <button 
                onClick={fetchAboutData}
                className="mt-4 btn-primary"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!aboutData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300">Данные не найдены</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <PageHeader 
          title={aboutData.title}
          description={aboutData.metaDescription}
          backgroundImage={aboutData.heroImage}
        />

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          {/* Информация о проекте */}
          {aboutData.projectInfo && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                О проекте
              </h2>
              <div className="prose prose-lg mx-auto dark:prose-invert">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: aboutData.projectInfo 
                  }} 
                />
              </div>
            </section>
          )}

          {/* Команда */}
          {aboutData.teamMembers.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Наша команда
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {aboutData.teamMembers.map((member, index) => (
                  <div 
                    key={index}
                    className="bg-white dark:bg-dark-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {member.photo && (
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {member.name}
                      </h3>
                      <p className="text-primary-600 dark:text-primary-400 font-medium mb-3">
                        {member.role}
                      </p>
                      {member.bio && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Контрибьюторы */}
          {aboutData.contributors.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Участники проекта
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {aboutData.contributors.map((contributor, index) => (
                  <div 
                    key={index}
                    className="text-center group"
                  >
                    {contributor.photo && (
                      <div className="aspect-square rounded-full overflow-hidden mb-3 mx-auto w-20 h-20">
                        <img
                          src={contributor.photo}
                          alt={contributor.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                    )}
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {contributor.name}
                    </h4>
                    {contributor.contribution && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {contributor.contribution}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Поддержка проекта */}
          {aboutData.supportPlatforms.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Поддержать проект
              </h2>
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl p-8">
                <p className="text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Ваша поддержка помогает нам развивать проект и создавать качественный контент. 
                  Выберите удобный для вас способ поддержки:
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {aboutData.supportPlatforms.map((platform, index) => (
                    <a
                      key={index}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white dark:bg-dark-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-3 hover:scale-105"
                    >
                      <PlatformIcon platform={platform.platform} />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {platform.platform}
                        </span>
                        {platform.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {platform.description}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Контактная информация */}
          {(aboutData.contactInfo.email || aboutData.contactInfo.phone || aboutData.contactInfo.address) && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Контакты
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {aboutData.contactInfo.email && (
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-6 text-center">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                        <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Email</h3>
                        <a 
                          href={`mailto:${aboutData.contactInfo.email}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {aboutData.contactInfo.email}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {aboutData.contactInfo.phone && (
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-6 text-center">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                        <Phone className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Телефон</h3>
                        <a 
                          href={`tel:${aboutData.contactInfo.phone}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {aboutData.contactInfo.phone}
                        </a>
                        {aboutData.contactInfo.workingHours && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {aboutData.contactInfo.workingHours}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {aboutData.contactInfo.address && (
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-6 text-center">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
                        <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Адрес</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {aboutData.contactInfo.address}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Призыв к действию */}
          <section className="text-center">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">
                Присоединяйтесь к нашему сообществу
              </h2>
              <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                Будьте в курсе наших событий, встреч и новых проектов. 
                Вместе мы можем создать что-то удивительное!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/events" 
                  className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Посмотреть события
                </a>
                <a 
                  href="/speakers" 
                  className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
                >
                  Наши спикеры
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPageUpdated;
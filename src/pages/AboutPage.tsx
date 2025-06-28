import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { Mail, Phone, MapPin } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AboutData {
  project_info: string;
  team_members: Array<{
    name: string;
    role: string;
    photo: string;
  }>;
  contributors: Array<{
    name: string;
    photo: string;
  }>;
  support_platforms: Array<{
    url: string;
    platform: string;
  }>;
  contact_info: {
    email: string;
    phone: string;
    address: string;
  };
}

// Компонент для отображения иконки платформы
const PlatformIcon = ({ platform }: { platform: string }) => {
  const logos = {
    'Boosty': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/bosty-logo-100x100.png',
    'Patreon': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/pn-logo-100x100.png',
    'PayPal': 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/pp-logo-100x100.png'
  };

  const logoUrl = logos[platform as keyof typeof logos] || '';

  return (
    <img 
      src={logoUrl} 
      alt={platform}
      className="w-6 h-6 object-contain"
    />
  );
};

const AboutPage = () => {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const { data, error } = await supabase
          .from('about_table')
          .select('*')
          .limit(1)
          .single();

        if (error) throw error;
        setAboutData(data);
      } catch (err) {
        console.error('Error fetching about data:', err);
        setError('Failed to load about page data');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <PageHeader title="О проекте" />
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container text-center py-12">
            Загрузка...
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !aboutData) {
    return (
      <Layout>
        <PageHeader title="О проекте" />
        <div className="section bg-gray-50 dark:bg-dark-800">
          <div className="container text-center py-12 text-red-600">
            {error || 'Данные не найдены'}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader 
        title="О проекте" 
        subtitle="Science Hub — научно-популярное сообщество в Сербии"
      />
      
      <main className="section bg-gray-50 dark:bg-dark-800">
        <div className="container">
          {/* Project Info */}
          <div className="mb-16">
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: aboutData.project_info }}
            />
          </div>

          {/* Team Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-8">Наша команда</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {aboutData.team_members.map((member, index) => (
                <div key={index} className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    <img 
                      src={member.photo} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-1">{member.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Contributors Section */}
          {aboutData.contributors.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-semibold mb-8">Нам помогают</h2>
              <div className="flex flex-wrap justify-around gap-10">
                {aboutData.contributors.map((contributor, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
                      <img 
                        src={contributor.photo} 
                        alt={contributor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-lg font-medium">{contributor.name}</h3>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Support Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-8">Поддержать</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {aboutData.support_platforms.map((platform, index) => (
                <a
                  key={index}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center justify-center gap-2"
                >
                  <PlatformIcon platform={platform.platform} />
                  <span>{platform.platform}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Contacts Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-8">Контакты</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Email</h3>
                  <a 
                    href={`mailto:${aboutData.contact_info.email}`}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                  >
                    {aboutData.contact_info.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Телефон</h3>
                  <a 
                    href={`tel:${aboutData.contact_info.phone.replace(/\s/g, '')}`}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                  >
                    {aboutData.contact_info.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Адрес</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {aboutData.contact_info.address}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default AboutPage;
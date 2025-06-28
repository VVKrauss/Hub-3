import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, AtSign, Phone, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../ui/Logo';

interface FooterSettings {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  socialLinks: {
    telegram: string;
    instagram: string;
    youtube: string;
  };
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
}

export function Footer() {
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    email: '',
    phone: '',
    address: '',
    workingHours: '',
    socialLinks: {
      telegram: '',
      instagram: '',
      youtube: ''
    }
  });
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('footer_settings, navigation_items')
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching footer settings:', error);
          return;
        }

        if (data) {
          // Загружаем настройки футера
          if (data.footer_settings) {
            setFooterSettings({
              ...footerSettings,
              ...data.footer_settings
            });
          }

          // Загружаем элементы навигации
          if (data.navigation_items) {
            const visibleItems = data.navigation_items
              .filter((item: NavItem) => item.visible)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setNavItems(visibleItems);
          }
        }
      } catch (error) {
        console.error('Error fetching footer data:', error);
      }
    };

    fetchSettings();
  }, []);

  // Логотипы социальных сетей
  const getSocialLogo = (platform: string) => {
    const logos = {
      telegram: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/tg-logo-100x100.png',
      instagram: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/ist-logo-100x100.png',
      youtube: 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logos/yt_100x100.png'
    };
    return logos[platform as keyof typeof logos];
  };

  return (
    <footer className="bg-dark-900 border-t border-dark-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Колонка 1: Логотип и описание */}
          <div>
            <Logo className="h-10 w-auto mb-4" inverted />
            <p className="text-dark-300 mb-6 leading-relaxed">
              Рассказываем в Сербии о науке легко и интересно через кинопоказы, лекции, фестивали, квизы, экскурсии. 
              Помогаем понять, как устроен мир, и найти единомышленников.
            </p>
            
            {/* Социальные сети */}
            {Object.entries(footerSettings.socialLinks).some(([_, url]) => url) && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Мы в соцсетях</h4>
                <div className="flex gap-4">
                  {Object.entries(footerSettings.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const logoUrl = getSocialLogo(platform);
                    if (!logoUrl) return null;
                    
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:scale-110 transition-transform duration-200"
                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      >
                        <img 
                          src={logoUrl}
                          alt={platform}
                          className="w-8 h-8 object-contain"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Колонка 2: Навигация */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Навигация</h4>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link 
                    to={item.path}
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Колонка 3: Контакты */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Контакты</h4>
            <ul className="space-y-3">
              {footerSettings.email && (
                <li className="flex items-start gap-3">
                  <AtSign className="h-5 w-5 mt-0.5 text-primary-400 flex-shrink-0" />
                  <a 
                    href={`mailto:${footerSettings.email}`}
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {footerSettings.email}
                  </a>
                </li>
              )}
              {footerSettings.phone && (
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 mt-0.5 text-primary-400 flex-shrink-0" />
                  <a 
                    href={`tel:${footerSettings.phone}`}
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {footerSettings.phone}
                  </a>
                </li>
              )}
              {footerSettings.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary-400 flex-shrink-0" />
                  <span className="text-dark-300">
                    {footerSettings.address}
                  </span>
                </li>
              )}
              {footerSettings.workingHours && (
                <li className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 mt-0.5 text-primary-400 flex-shrink-0" />
                  <span className="text-dark-300">
                    {footerSettings.workingHours}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Нижняя часть футера */}
        <div className="mt-8 pt-8 border-t border-dark-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-dark-400 text-sm">
              © {new Date().getFullYear()} ScienceHub. Все права защищены.
            </p>
            <p className="text-dark-400 text-sm mt-2 md:mt-0">
              Сделано с ❤️ для научного сообщества
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
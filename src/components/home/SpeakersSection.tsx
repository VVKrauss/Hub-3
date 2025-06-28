import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type Speaker = {
  id: string;
  name: string;
  field_of_expertise: string;
  photos: { url: string; isMain?: boolean }[];
};

const SpeakersSection = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [displayedSpeakers, setDisplayedSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        const { data, error } = await supabase
          .from('speakers')
          .select('*')
          .eq('active', true);

        if (error) throw error;
        
        // Сохраняем всех спикеров
        setSpeakers(data || []);
        
        // Выбираем случайных спикеров для отображения
        if (data && data.length > 0) {
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          setDisplayedSpeakers(shuffled.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching speakers:', err);
        setError('Не удалось загрузить спикеров');
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakers();
  }, []);

  // Функция для обновления отображаемых спикеров
  const refreshSpeakers = () => {
    if (speakers.length > 0) {
      const shuffled = [...speakers].sort(() => 0.5 - Math.random());
      setDisplayedSpeakers(shuffled.slice(0, 4));
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-12 text-center text-gray-900 dark:text-white">
            Наши спикеры
          </h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-12 text-center text-gray-900 dark:text-white">
            Наши спикеры
          </h2>
          <div className="text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (speakers.length === 0) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-12 text-center text-gray-900 dark:text-white">
            Наши спикеры
          </h2>
          <div className="text-center text-gray-600 dark:text-gray-400">
            В данный момент нет активных спикеров
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-dark-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-0">
            Наши спикеры
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshSpeakers}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              Показать других
            </button>
            <a
              href="https://forms.gle/2SvevGTqxBbtCs7x5"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              + стать спикером
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedSpeakers.map((speaker) => (
            <Link
              key={speaker.id}
              to={`/speakers/${speaker.id}`}
              className="group bg-white dark:bg-dark-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-square">
                {speaker.photos?.[0]?.url ? (
                  <img
                    src={getSupabaseImageUrl(speaker.photos[0].url)}
                    alt={speaker.name}
                    className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '';
                      target.parentElement!.className = 'relative aspect-square bg-gray-100 dark:bg-dark-700 flex items-center justify-center';
                      target.parentElement!.innerHTML = '<User className="w-12 h-12 text-gray-400 dark:text-dark-500" />';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-dark-700">
                    <User className="w-12 h-12 text-gray-400 dark:text-dark-500" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {speaker.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {speaker.field_of_expertise}
                </p>
              </div>
            </Link>
          ))}
          
          {/* All Speakers Card */}
          <Link
            to="/speakers"
            className="group bg-white dark:bg-dark-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="mb-3 p-3 bg-gray-100 dark:bg-dark-800 rounded-full">
              <ArrowRight className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Все спикеры
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Познакомиться со всеми
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpeakersSection;
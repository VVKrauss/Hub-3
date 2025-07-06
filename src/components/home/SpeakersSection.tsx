import { useState, useEffect, useRef } from 'react';
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
  const isMountedRef = useRef(true);

  // ИСПРАВЛЕННАЯ ВЕРСИЯ - только один раз загружаем данные
  useEffect(() => {
    isMountedRef.current = true;
    
    const fetchSpeakers = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🚀 Fetching speakers...');
        const { data, error } = await supabase
          .from('speakers')
          .select('*')
          .eq('active', true);

        if (!isMountedRef.current) return;

        if (error) throw error;
        
        // Сохраняем всех спикеров
        setSpeakers(data || []);
        
        // Выбираем случайных спикеров для отображения
        if (data && data.length > 0) {
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          setDisplayedSpeakers(shuffled.slice(0, 4));
        }
        
        console.log(`✅ Loaded ${data?.length || 0} speakers`);
      } catch (err) {
        console.error('❌ Error fetching speakers:', err);
        if (isMountedRef.current) {
          setError('Не удалось загрузить спикеров');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchSpeakers();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // КРИТИЧНО: пустой массив зависимостей

  // Функция для обновления отображаемых спикеров
  const refreshSpeakers = () => {
    if (speakers.length > 0 && isMountedRef.current) {
      const shuffled = [...speakers].sort(() => 0.5 - Math.random());
      setDisplayedSpeakers(shuffled.slice(0, 4));
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50 dark:bg-dark-800">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (displayedSpeakers.length === 0) {
    return null; // Не показываем секцию если нет спикеров
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-dark-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Наши спикеры
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Эксперты и профессионалы, которые делятся знаниями в ScienceHub
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {displayedSpeakers.map((speaker) => (
            <Link
              key={speaker.id}
              to={`/speakers/${speaker.id}`}
              className="group bg-white dark:bg-dark-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                {speaker.photos && speaker.photos.length > 0 ? (
                  <img
                    src={getSupabaseImageUrl(speaker.photos[0].url)}
                    alt={speaker.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {speaker.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                  {speaker.field_of_expertise}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/speakers"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <span>Все спикеры</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpeakersSection;
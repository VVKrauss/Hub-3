import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type CoworkingSectionData = {
  title: string;
  description: string;
  image: string;
  enabled: boolean;
  order: number;
};

const CoworkingSection = () => {
  const [data, setData] = useState<CoworkingSectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoworkingData();
  }, []);

  const fetchCoworkingData = async () => {
    try {
      setLoading(true);
      const { data: settings, error } = await supabase
        .from('site_settings')
        .select('coworking_selection')
        .single();

      if (error) throw error;

      // Проверяем наличие данных в поле coworking_selection
      if (settings?.coworking_selection) {
        setData(settings.coworking_selection);
      }
    } catch (error) {
      console.error('Error fetching Coworking section data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data || !data.enabled) {
    return null;
  }

  return (
    <section className="section bg-white dark:bg-dark-900">
      <div className="container grid-layout items-center">
        <div className="text-content">
          <h3 className="mb-6">{data.title}</h3>
          <div 
            className="text-base space-y-4 mb-8"
            dangerouslySetInnerHTML={{ __html: data.description }} 
          />
          <Link 
            to="/about" 
            className="inline-flex items-center text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Занять место
            <ArrowRight className="ml-2" />
          </Link>
        </div>
        <div className="image-content mt-8 md:mt-0">
          <img 
            src={getSupabaseImageUrl(data.image)} 
            alt={data.title} 
            className="w-full h-auto rounded-lg shadow-md"
          />
        </div>
      </div>
    </section>
  );
};

export default CoworkingSection;
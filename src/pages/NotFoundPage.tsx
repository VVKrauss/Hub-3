import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Atom } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="container max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
             
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold">
                404
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Страница не найдена</h1>
          <p className="text-lg text-dark-600 dark:text-dark-300 mb-8">
            Извините, запрошенная страница не существует или была перемещена.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="btn-primary">
              Вернуться на главную
            </Link>
            <Link to="/events" className="btn-outline">
              Посмотреть мероприятия
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
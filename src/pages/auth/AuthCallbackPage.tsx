import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';

const AuthCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Проверка аутентификации...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash and handle the auth callback
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setStatus('success');
        setMessage('Аутентификация успешна! Перенаправление...');
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        console.error('Error during auth callback:', error);
        setStatus('error');
        setMessage('Произошла ошибка при аутентификации. Пожалуйста, попробуйте снова.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white dark:bg-dark-800 rounded-lg shadow-lg text-center">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          )}
          
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          )}
          
          {status === 'error' && (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
          
          <h1 className="text-2xl font-bold mb-4">
            {status === 'loading' ? 'Подождите...' : 
             status === 'success' ? 'Успешно!' : 
             'Ошибка'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
          
          {status === 'error' && (
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Вернуться на главную
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AuthCallbackPage;
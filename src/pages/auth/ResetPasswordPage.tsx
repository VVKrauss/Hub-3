import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a hash in the URL (from password reset email)
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      setError('Недействительная или истекшая ссылка для сброса пароля');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Ошибка при сбросе пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white dark:bg-dark-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Сброс пароля</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Пароль успешно изменен!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Вы будете перенаправлены на главную страницу через несколько секунд.
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
              >
                Вернуться на главную
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label htmlFor="password" className="block font-medium mb-2">
                  Новый пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 dark:bg-dark-800"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword" className="block font-medium mb-2">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 dark:bg-dark-800"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2"
              >
                {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;
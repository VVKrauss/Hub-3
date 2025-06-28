import { useState } from 'react';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (resetPassword) {
        // Handle password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        toast.success('Инструкции по сбросу пароля отправлены на вашу почту');
        setResetPassword(false);
      } else if (isSignUp) {
        // Handle registration
        if (!name.trim()) {
          setError('Имя обязательно для заполнения');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });

        if (error) throw error;

        toast.success('Регистрация успешна! Проверьте почту для подтверждения.');
      } else {
        // Handle login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        toast.success('Успешный вход');
        onClose();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || (isSignUp ? 'Ошибка регистрации' : 'Ошибка входа'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setResetPassword(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetForm();
      }}
      title={resetPassword ? 'Сброс пароля' : (isSignUp ? 'Регистрация' : 'Вход в аккаунт')}
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!resetPassword && isSignUp && (
          <div className="form-group">
            <label htmlFor="name" className="block font-medium mb-2">
              Имя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 dark:bg-dark-800"
                required={isSignUp}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email" className="block font-medium mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 dark:bg-dark-800"
              required
            />
          </div>
        </div>

        {!resetPassword && (
          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block font-medium">
                Пароль
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setResetPassword(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Забыли пароль?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-dark-600 dark:bg-dark-800"
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-2"
        >
          {loading 
            ? (resetPassword ? 'Отправка...' : (isSignUp ? 'Регистрация...' : 'Вход...')) 
            : (resetPassword ? 'Отправить инструкции' : (isSignUp ? 'Зарегистрироваться' : 'Войти'))}
        </button>

        {resetPassword ? (
          <button
            type="button"
            onClick={() => setResetPassword(false)}
            className="w-full text-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Вернуться к входу
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="w-full text-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}
          </button>
        )}
      </form>
    </Modal>
  );
};

export default LoginModal;
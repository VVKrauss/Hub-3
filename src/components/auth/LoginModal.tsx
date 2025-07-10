// src/components/auth/LoginModal.tsx - ОБНОВЛЕННАЯ ВЕРСИЯ с анимированным логотипом
import { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import CustomLoader from '../ui/CustomLoader';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (resetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        toast.success('Инструкции отправлены на почту');
        setResetPassword(false);
        setEmail('');
        onClose();
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) throw error;

        toast.success('Аккаунт создан! Проверьте почту для подтверждения.');
        setEmail('');
        setPassword('');
        setName('');
        setIsSignUp(false);
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Toast будет показан в TopBarContext
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
    setShowPassword(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          onClose();
          resetForm();
        }}
      />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-dark-900 shadow-2xl transition-all">
          {/* Header с градиентом */}
          <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 px-8 py-8 text-white">
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4">
              <div className="h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            </div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4">
              <div className="h-16 w-16 rounded-full bg-white/5 blur-lg"></div>
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  {resetPassword ? (
                    <Mail className="h-5 w-5" />
                  ) : isSignUp ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                </div>
                <h2 className="text-2xl font-bold">
                  {resetPassword ? 'Сброс пароля' : (isSignUp ? 'Регистрация' : 'Добро пожаловать!')}
                </h2>
              </div>
              <p className="text-white/80 text-sm">
                {resetPassword 
                  ? 'Введите email для получения инструкций' 
                  : isSignUp 
                    ? 'Создайте новый аккаунт для доступа' 
                    : 'Войдите в свой аккаунт'
                }
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="absolute right-4 top-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name field (только для регистрации) */}
              {isSignUp && !resetPassword && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Полное имя
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:focus:border-primary-400"
                      placeholder="Введите ваше имя"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:focus:border-primary-400"
                    placeholder="Введите email"
                    required
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>
              </div>

              {/* Password field (не показываем для сброса пароля) */}
              {!resetPassword && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Пароль
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetPassword(true);
                          setError(null);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      >
                        Забыли пароль?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 pl-12 pr-12 text-gray-900 dark:text-white placeholder-gray-500 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:focus:border-primary-400"
                      placeholder="Введите пароль"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Минимум 6 символов
                    </p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 py-3 text-white font-medium transition-all hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <CustomLoader size="sm" />
                      <span className="ml-2">
                        {resetPassword ? 'Отправляем...' : (isSignUp ? 'Создаём аккаунт...' : 'Входим...')}
                      </span>
                    </>
                  ) : (
                    <>
                      {resetPassword ? 'Отправить инструкции' : (isSignUp ? 'Создать аккаунт' : 'Войти')}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
                
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </button>

              {/* Toggle between login/signup */}
              <div className="text-center">
                {resetPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResetPassword(false);
                      setError(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    ← Вернуться к входу
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {isSignUp ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {isSignUp ? 'Войти' : 'Зарегистрироваться'}
                    </span>
                  </button>
                )}
              </div>
            </form>

            {/* Additional info */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {isSignUp 
                  ? 'Создавая аккаунт, вы соглашаетесь с нашими условиями использования'
                  : 'Безопасный вход через зашифрованное соединение'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
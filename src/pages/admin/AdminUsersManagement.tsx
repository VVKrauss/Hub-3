// src/pages/admin/AdminUsersManagement.tsx - Управление пользователями и ролями
import React, { useState, useEffect } from 'react';
import { Users, Crown, User, Mail, Calendar, Shield, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
}

const AdminUsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    try {
      // Получаем текущего пользователя через Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        setCurrentUserRole('user');
        return;
      }

      if (!user) {
        console.log('No authenticated user found');
        setCurrentUserRole('user');
        return;
      }

      console.log('Current authenticated user:', user.email);

      // Временное решение: хардкод для краuss@inbox.ru
      if (user.email === 'krauss@inbox.ru') {
        console.log('Setting super_admin role for krauss@inbox.ru');
        setCurrentUserRole('super_admin');
        return;
      }

      // Для других пользователей проверяем роль в базе через user_roles view
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!roleError && userRoles) {
        console.log('User role from user_roles view:', userRoles.role);
        setCurrentUserRole(userRoles.role || 'user');
      } else {
        console.log('Could not fetch role, defaulting to user');
        setCurrentUserRole('user');
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
      setCurrentUserRole('user');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Получаем пользователей через view user_roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userEmail: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('assign_user_role', {
        user_email: userEmail,
        new_role: newRole
      });

      if (error) throw error;

      toast.success(`Роль "${newRole}" назначена пользователю ${userEmail}`);
      fetchUsers(); // Обновляем список
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Ошибка при назначении роли');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    const labels = {
      super_admin: 'Супер Админ',
      admin: 'Администратор',
      user: 'Пользователь'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[role as keyof typeof styles] || styles.user}`}>
        {getRoleIcon(role)}
        {labels[role as keyof typeof labels] || 'Пользователь'}
      </span>
    );
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageRoles = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Управление пользователями
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Всего пользователей: {users.length} | Ваша роль: {getRoleBadge(currentUserRole)}
          </p>
        </div>
      </div>

      {!canManageRoles && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            У вас нет прав для управления ролями пользователей. Обратитесь к супер-администратору.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Поиск по email или роли..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Регистрация
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Последний вход
                </th>
                {canManageRoles && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.last_sign_in_at ? (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(user.last_sign_in_at).toLocaleDateString('ru-RU')}
                      </div>
                    ) : (
                      'Никогда'
                    )}
                  </td>
                  {canManageRoles && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => assignRole(user.email, 'admin')}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Сделать админом
                          </button>
                        )}
                        {user.role !== 'user' && (
                          <button
                            onClick={() => assignRole(user.email, 'user')}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                          >
                            Убрать права
                          </button>
                        )}
                        {currentUserRole === 'super_admin' && user.role !== 'super_admin' && (
                          <button
                            onClick={() => assignRole(user.email, 'super_admin')}
                            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            Супер-админ
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Пользователи появятся после регистрации'}
            </p>
          </div>
        )}
      </div>

      {/* Role Assignment Guide */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
          Роли пользователей
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <div className="font-medium text-purple-900 dark:text-purple-300">Супер Админ</div>
              <div className="text-purple-700 dark:text-purple-400">Полный доступ ко всем функциям + управление ролями</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-300">Администратор</div>
              <div className="text-blue-700 dark:text-blue-400">Управление контентом (спикеры, события и т.д.)</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-600 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-300">Пользователь</div>
              <div className="text-gray-700 dark:text-gray-400">Базовый доступ к публичным функциям</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersManagement;
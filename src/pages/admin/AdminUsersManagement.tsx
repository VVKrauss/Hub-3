import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX, 
  Calendar,
  Mail,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  Clock,
  User as UserIcon
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type UserRole = 'Admin' | 'Editor' | 'Guest';

type User = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  banned_until?: string;
};

type Registration = {
  id: string;
  event_id: string;
  event_title?: string;
  status: 'active' | 'cancelled' | 'completed';
  registration_date: string;
  payment_status: 'pending' | 'paid' | 'failed';
  qr_code?: string;
};

type UserWithRegistrations = User & {
  registrations: Registration[];
};

const AdminUsersManagement = () => {
  const [users, setUsers] = useState<UserWithRegistrations[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRegistrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRegistrations | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Получаем пользователей из profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Получаем дополнительную информацию из auth.users через service key
      const usersWithAuth = await Promise.all(
        profiles.map(async (profile) => {
          try {
            // Получаем регистрации пользователя
            const { data: registrations, error: regError } = await supabase
              .from('user_registrations')
              .select(`
                id,
                event_id,
                status,
                registration_date,
                payment_status,
                qr_code,
                events:event_id (
                  title
                )
              `)
              .eq('user_id', profile.id)
              .order('registration_date', { ascending: false });

            const userRegistrations: Registration[] = registrations?.map(reg => ({
              id: reg.id,
              event_id: reg.event_id,
              event_title: (reg.events as any)?.title || 'Неизвестное событие',
              status: reg.status,
              registration_date: reg.registration_date,
              payment_status: reg.payment_status,
              qr_code: reg.qr_code
            })) || [];

            // Пытаемся получить email из auth
            let userEmail = profile.email;
            if (!userEmail) {
              try {
                const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
                userEmail = authUser.user?.email;
              } catch (error) {
                console.warn('Could not fetch auth user data for:', profile.id);
              }
            }

            return {
              id: profile.id,
              name: profile.name,
              email: userEmail,
              role: profile.role,
              created_at: profile.created_at,
              last_sign_in_at: profile.last_sign_in_at,
              email_confirmed_at: profile.email_confirmed_at,
              banned_until: profile.banned_until,
              registrations: userRegistrations
            };
          } catch (error) {
            console.error('Error processing user:', profile.id, error);
            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              created_at: profile.created_at,
              registrations: []
            };
          }
        })
      );

      setUsers(usersWithAuth);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast.success('Роль пользователя обновлена');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Ошибка при обновлении роли');
    }
  };

  const banUser = async (userId: string, duration: number) => {
    try {
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + duration);

      const { error } = await supabase
        .from('profiles')
        .update({ banned_until: bannedUntil.toISOString() })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers(); // Перезагружаем данные
      toast.success(`Пользователь заблокирован на ${duration} дней`);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Ошибка при блокировке пользователя');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ banned_until: null })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
      toast.success('Пользователь разблокирован');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Ошибка при разблокировке пользователя');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      // Сначала удаляем профиль
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Затем пытаемся удалить пользователя из auth
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authError) {
        console.warn('Could not delete from auth:', authError);
      }

      setUsers(users.filter(user => user.id !== userId));
      toast.success('Пользователь удален');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Ошибка при удалении пользователя');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'Editor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Guest':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (user: User) => {
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return 'text-red-500';
    }
    if (user.email_confirmed_at) {
      return 'text-green-500';
    }
    return 'text-yellow-500';
  };

  const getStatusIcon = (user: User) => {
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return <Ban className="w-4 h-4 text-red-500" />;
    }
    if (user.email_confirmed_at) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Пагинация
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 dark:bg-dark-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Управление пользователями</h1>
              <p className="text-dark-600 dark:text-dark-400">
                Всего пользователей: {users.length}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Поиск по имени или email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Фильтр по роли */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="px-4 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Все роли</option>
              <option value="Admin">Администратор</option>
              <option value="Editor">Редактор</option>
              <option value="Guest">Гость</option>
            </select>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Всего пользователей',
              value: users.length,
              icon: Users,
              color: 'blue'
            },
            {
              title: 'Администраторы',
              value: users.filter(u => u.role === 'Admin').length,
              icon: Shield,
              color: 'red'
            },
            {
              title: 'Активные',
              value: users.filter(u => u.email_confirmed_at && (!u.banned_until || new Date(u.banned_until) <= new Date())).length,
              icon: UserCheck,
              color: 'green'
            },
            {
              title: 'Заблокированные',
              value: users.filter(u => u.banned_until && new Date(u.banned_until) > new Date()).length,
              icon: UserX,
              color: 'yellow'
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-600 dark:text-dark-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-dark-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                  stat.color === 'red' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                  stat.color === 'green' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                  'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Таблица пользователей */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-dark-200 dark:border-dark-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Регистрации
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-dark-200 dark:divide-dark-700">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-50 dark:hover:bg-dark-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-dark-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-dark-500 dark:text-dark-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role === 'Admin' ? 'Администратор' : 
                         user.role === 'Editor' ? 'Редактор' : 'Гость'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user)}
                        <span className={`text-sm ${getStatusColor(user)}`}>
                          {user.banned_until && new Date(user.banned_until) > new Date() ? 'Заблокирован' :
                           user.email_confirmed_at ? 'Активен' : 'Не подтвержден'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-dark-900 dark:text-white">
                        {user.registrations.length} регистраций
                      </div>
                      <div className="text-sm text-dark-500 dark:text-dark-400">
                        Активных: {user.registrations.filter(r => r.status === 'active').length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Просмотр деталей"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown меню для действий */}
                        <div className="relative inline-block text-left">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            className="text-xs border border-dark-300 dark:border-dark-600 rounded px-2 py-1 bg-white dark:bg-dark-700 text-dark-900 dark:text-white"
                          >
                            <option value="Guest">Гость</option>
                            <option value="Editor">Редактор</option>
                            <option value="Admin">Администратор</option>
                          </select>
                        </div>

                        {user.banned_until && new Date(user.banned_until) > new Date() ? (
                          <button
                            onClick={() => unbanUser(user.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Разблокировать"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => banUser(user.id, 7)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Заблокировать на 7 дней"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Удалить пользователя"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-dark-200 dark:border-dark-700">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-dark-300 dark:border-dark-600 text-sm font-medium rounded-md text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-dark-300 dark:border-dark-600 text-sm font-medium rounded-md text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-800 hover:bg-dark-50 dark:hover:bg-dark-700 disabled:opacity-50"
                >
                  Вперед
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-dark-700 dark:text-dark-300">
                    Показано <span className="font-medium">{indexOfFirstUser + 1}</span> до{' '}
                    <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> из{' '}
                    <span className="font-medium">{filteredUsers.length}</span> результатов
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'bg-white dark:bg-dark-800 border-dark-300 dark:border-dark-600 text-dark-500 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно деталей пользователя */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                  Детали пользователя
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Информация о пользователе */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
                    Основная информация
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-dark-500 dark:text-dark-400">Имя:</span>
                      <p className="text-dark-900 dark:text-white">{selectedUser.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-dark-500 dark:text-dark-400">Email:</span>
                      <p className="text-dark-900 dark:text-white">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-dark-500 dark:text-dark-400">Роль:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role === 'Admin' ? 'Администратор' : 
                         selectedUser.role === 'Editor' ? 'Редактор' : 'Гость'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-dark-500 dark:text-dark-400">Дата регистрации:</span>
                      <p className="text-dark-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
                    Статус аккаунта
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedUser)}
                      <span className={getStatusColor(selectedUser)}>
                        {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() ? 'Заблокирован' :
                         selectedUser.email_confirmed_at ? 'Активен' : 'Не подтвержден'}
                      </span>
                    </div>
                    {selectedUser.email_confirmed_at && (
                      <div>
                        <span className="text-sm text-dark-500 dark:text-dark-400">Email подтвержден:</span>
                        <p className="text-dark-900 dark:text-white">{formatDate(selectedUser.email_confirmed_at)}</p>
                      </div>
                    )}
                    {selectedUser.last_sign_in_at && (
                      <div>
                        <span className="text-sm text-dark-500 dark:text-dark-400">Последний вход:</span>
                        <p className="text-dark-900 dark:text-white">{formatDate(selectedUser.last_sign_in_at)}</p>
                      </div>
                    )}
                    {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() && (
                      <div>
                        <span className="text-sm text-dark-500 dark:text-dark-400">Заблокирован до:</span>
                        <p className="text-red-600 dark:text-red-400">{formatDate(selectedUser.banned_until)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Регистрации пользователя */}
              <div>
                <h3 className="text-lg font-medium text-dark-900 dark:text-white mb-4">
                  Регистрации на мероприятия ({selectedUser.registrations.length})
                </h3>
                
                {selectedUser.registrations.length > 0 ? (
                  <div className="space-y-4">
                    {selectedUser.registrations.map((registration) => (
                      <div key={registration.id} className="bg-dark-50 dark:bg-dark-700 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-dark-900 dark:text-white mb-2">
                              {registration.event_title}
                            </h4>
                            <div className="flex flex-wrap gap-4 text-sm text-dark-600 dark:text-dark-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(registration.registration_date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Статус: {
                                  registration.status === 'active' ? 'Активна' :
                                  registration.status === 'cancelled' ? 'Отменена' : 'Завершена'
                                }
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* Статус оплаты */}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              registration.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                              registration.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            }`}>
                              {registration.payment_status === 'paid' ? 'Оплачено' :
                               registration.payment_status === 'pending' ? 'Ожидает оплаты' : 'Не оплачено'}
                            </span>
                            
                            {/* Статус регистрации */}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              registration.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                              registration.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                            }`}>
                              {registration.status === 'active' ? 'Активна' :
                               registration.status === 'cancelled' ? 'Отменена' : 'Завершена'}
                            </span>
                          </div>
                        </div>
                        
                        {registration.qr_code && (
                          <div className="mt-3 pt-3 border-t border-dark-200 dark:border-dark-600">
                            <span className="text-xs text-dark-500 dark:text-dark-400">
                              QR-код: {registration.qr_code}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-dark-400" />
                    <h3 className="mt-2 text-sm font-medium text-dark-900 dark:text-white">
                      Нет регистраций
                    </h3>
                    <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
                      Этот пользователь еще не регистрировался на мероприятия
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Действия */}
            <div className="px-6 py-4 bg-dark-50 dark:bg-dark-700 border-t border-dark-200 dark:border-dark-700 flex justify-between">
              <div className="flex gap-3">
                <select
                  value={selectedUser.role}
                  onChange={(e) => {
                    updateUserRole(selectedUser.id, e.target.value as UserRole);
                    setSelectedUser({ ...selectedUser, role: e.target.value as UserRole });
                  }}
                  className="px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
                >
                  <option value="Guest">Гость</option>
                  <option value="Editor">Редактор</option>
                  <option value="Admin">Администратор</option>
                </select>

                {selectedUser.banned_until && new Date(selectedUser.banned_until) > new Date() ? (
                  <button
                    onClick={() => {
                      unbanUser(selectedUser.id);
                      setSelectedUser({ ...selectedUser, banned_until: undefined });
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Разблокировать
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      banUser(selectedUser.id, 7);
                      const bannedUntil = new Date();
                      bannedUntil.setDate(bannedUntil.getDate() + 7);
                      setSelectedUser({ ...selectedUser, banned_until: bannedUntil.toISOString() });
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Заблокировать
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-dark-300 dark:border-dark-600 text-dark-700 dark:text-dark-300 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-600"
                >
                  Закрыть
                </button>
                <button
                  onClick={() => {
                    deleteUser(selectedUser.id);
                    setShowUserModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить пользователя
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;
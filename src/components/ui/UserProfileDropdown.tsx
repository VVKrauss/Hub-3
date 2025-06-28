import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import UserAvatar from './UserAvatar';

type UserData = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
};

type UserProfileDropdownProps = {
  user: UserData;
  onLogout: () => void;
};

const UserProfileDropdown = ({ user, onLogout }: UserProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
      >
        <UserAvatar 
          avatarUrl={user.avatar}
          name={user.name || user.email}
          size="sm"
        />
        {/* Убираем отображение имени */}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-800 rounded-lg shadow-lg py-2 z-50 border border-gray-200 dark:border-dark-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center gap-3">
              <UserAvatar 
                avatarUrl={user.avatar}
                name={user.name || user.email}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                {user.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Роль: {user.role}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <Link
            to="/profile"
            className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4 inline mr-2" />
            Мой профиль
          </Link>
          
          {user.role === 'Admin' && (
            <Link
              to="/admin"
              className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Панель управления
            </Link>
          )}
          
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-red-600 dark:text-red-400"
          >
            <LogOut className="h-4 w-4 inline mr-2" />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
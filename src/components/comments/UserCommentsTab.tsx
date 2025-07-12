// src/components/comments/UserCommentsTab.tsx - Минимальная версия
import React from 'react';
import { MessageCircle } from 'lucide-react';

interface UserCommentsTabProps {
  userId: string;
  className?: string;
}

const UserCommentsTab: React.FC<UserCommentsTabProps> = ({
  userId,
  className = ''
}) => {
  return (
    <div className={className}>
      <div className="text-center py-12">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Комментарии пользователя
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          User ID: {userId}
        </p>
        <p className="text-sm text-gray-400">
          Функция комментариев в разработке
        </p>
      </div>
    </div>
  );
};

export default UserCommentsTab;
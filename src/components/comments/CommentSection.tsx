// src/components/comments/CommentSection.tsx - Минимальная версия для тестирования
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CommentSectionProps {
  eventId: string;
  eventTitle?: string;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  eventId,
  eventTitle,
  className = ''
}) => {
  const { user } = useAuth();

  return (
    <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-lg ${className}`}>
      {/* Заголовок секции */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Комментарии
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Event ID: {eventId}
            </p>
          </div>
        </div>
      </div>

      {/* Контент секции */}
      <div className="p-6">
        {!user ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              Войдите в систему, чтобы оставить комментарий
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-primary-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Система комментариев загружается...
            </p>
            <div className="text-sm text-gray-500">
              Пользователь: {user.email}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
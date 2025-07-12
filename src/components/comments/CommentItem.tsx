// src/components/comments/CommentItem.tsx
import React, { useState, useCallback } from 'react';
import { 
  Reply, 
  Quote, 
  Edit, 
  Trash2, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronUp,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useComments } from '../../hooks/useComments';
import { EventComment } from '../../api/comments';
import CommentForm from './CommentForm';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CommentItemProps {
  comment: EventComment;
  eventId: string;
  canModerate?: boolean;
  level?: number;
  maxLevel?: number;
  onQuote?: (text: string, commentId: string, author: string) => void;
  className?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  eventId,
  canModerate = false,
  level = 0,
  maxLevel = 3,
  onQuote,
  className = ''
}) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    getReplies,
    loadReplies,
    createNewComment,
    updateExistingComment,
    deleteExistingComment,
    loadingReplies,
    updating,
    deleting
  } = useComments({
    eventId,
    autoLoad: false
  });

  const replies = getReplies(comment.id);
  const hasReplies = replies.length > 0;
  const isUpdating = updating[comment.id];
  const isDeleting = deleting[comment.id];

  // Обработка загрузки ответов
  const handleLoadReplies = useCallback(async () => {
    if (!hasReplies && !loadingReplies[comment.id]) {
      await loadReplies(comment.id);
    }
    setShowReplies(!showReplies);
  }, [comment.id, hasReplies, loadReplies, loadingReplies, showReplies]);

  // Обработка создания ответа
  const handleReplySubmit = async (content: string, quotedText?: string, quotedCommentId?: string) => {
    const reply = await createNewComment({
      content,
      parent_comment_id: comment.id,
      quoted_text: quotedText,
      quoted_comment_id: quotedCommentId
    });
    
    if (reply) {
      setShowReplyForm(false);
      if (!showReplies) {
        setShowReplies(true);
      }
    }
    
    return !!reply;
  };

  // Обработка редактирования
  const handleEditSubmit = async (content: string) => {
    const updatedComment = await updateExistingComment(comment.id, content);
    if (updatedComment) {
      setShowEditForm(false);
    }
    return !!updatedComment;
  };

  // Обработка удаления
  const handleDelete = async () => {
    if (!canModerate) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите удалить этот комментарий?');
    if (!confirmed) return;

    const success = await deleteExistingComment(comment.id);
    if (success) {
      // Комментарий будет удален из списка автоматически через хук
    }
  };

  // Обработка выделения текста для цитирования
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText('');
    }
  };

  // Цитирование выделенного текста
  const handleQuoteSelected = () => {
    if (selectedText && onQuote) {
      onQuote(selectedText, comment.id, comment.user_name || 'Пользователь');
    } else if (!selectedText) {
      // Цитируем весь комментарий, если ничего не выделено
      const textToQuote = comment.content.length > 100 
        ? comment.content.substring(0, 100) + '...'
        : comment.content;
      onQuote?.(textToQuote, comment.id, comment.user_name || 'Пользователь');
    }
    setSelectedText('');
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ru 
      });
    } catch {
      return 'недавно';
    }
  };

  // Получение аватара пользователя
  const getUserAvatar = () => {
    if (comment.user_avatar) {
      return comment.user_avatar;
    }
    // Генерируем аватар на основе имени
    const name = comment.user_name || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=40`;
  };

  // Проверка, является ли пользователь автором
  const isAuthor = user?.id === comment.user_id;

  // Отступ для вложенных комментариев
  const indentClass = level > 0 ? `ml-${Math.min(level * 6, 24)}` : '';

  return (
    <div className={`${indentClass} ${className}`}>
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-4">
        {/* Заголовок комментария */}
        <div className="flex items-start gap-3 mb-3">
          {/* Аватар */}
          <img
            src={getUserAvatar()}
            alt={comment.user_name || 'Пользователь'}
            className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-dark-600"
          />

          <div className="flex-1 min-w-0">
            {/* Имя и метаданные */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-white">
                {comment.user_name || 'Пользователь'}
              </span>
              
              {comment.user_role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  <Shield className="w-3 h-3" />
                  Админ
                </span>
              )}

              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(comment.created_at)}
              </span>

              {comment.is_edited && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  (изменено)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Цитата (если есть) */}
        {comment.quoted_text && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-dark-700 border-l-4 border-primary-500 rounded-r-lg">
            <div className="flex items-center gap-2 mb-1">
              <Quote className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Цитата:
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              "{comment.quoted_text}"
            </p>
          </div>
        )}

        {/* Содержимое комментария */}
        {showEditForm ? (
          <div className="mb-4">
            <CommentForm
              onSubmit={handleEditSubmit}
              onCancel={() => setShowEditForm(false)}
              loading={isUpdating}
              initialContent={comment.content}
              submitText="Сохранить"
              placeholder="Редактировать комментарий..."
            />
          </div>
        ) : (
          <div 
            className="mb-4 text-gray-900 dark:text-white whitespace-pre-wrap select-text cursor-text"
            onMouseUp={handleTextSelection}
          >
            {comment.content}
          </div>
        )}

        {/* Действия с комментарием */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Кнопка ответа */}
            {user && level < maxLevel && !showEditForm && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Ответить
              </button>
            )}

            {/* Кнопка цитирования */}
            {user && onQuote && !showEditForm && (
              <button
                onClick={handleQuoteSelected}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title={selectedText ? `Цитировать: "${selectedText.substring(0, 50)}..."` : 'Цитировать комментарий'}
              >
                <Quote className="w-4 h-4" />
                {selectedText ? 'Цитировать выделенное' : 'Цитировать'}
              </button>
            )}

            {/* Кнопка просмотра ответов */}
            {(hasReplies || replies.length > 0) && (
              <button
                onClick={handleLoadReplies}
                className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                disabled={loadingReplies[comment.id]}
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Скрыть ответы
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {loadingReplies[comment.id] ? 'Загрузка...' : `Показать ответы (${replies.length})`}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Админские действия */}
          {canModerate && !showEditForm && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditForm(true)}
                disabled={isUpdating}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Редактировать комментарий"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Удалить комментарий"
              >
                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Форма ответа */}
        {showReplyForm && user && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600">
            <CommentForm
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
              placeholder={`Ответить ${comment.user_name || 'пользователю'}...`}
              submitText="Ответить"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Ответы на комментарий */}
      {showReplies && replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              eventId={eventId}
              canModerate={canModerate}
              level={level + 1}
              maxLevel={maxLevel}
              onQuote={onQuote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
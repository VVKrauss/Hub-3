// src/components/comments/CommentForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Quote, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CommentFormProps {
  onSubmit: (content: string, quotedText?: string, quotedCommentId?: string) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  initialContent?: string;
  quotedText?: string;
  quotedCommentId?: string;
  quotedAuthor?: string;
  maxLength?: number;
  minLength?: number;
  autoFocus?: boolean;
  className?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  placeholder = 'Напишите комментарий...',
  submitText = 'Отправить',
  cancelText = 'Отмена',
  initialContent = '',
  quotedText,
  quotedCommentId,
  quotedAuthor,
  maxLength = 2000,
  minLength = 1,
  autoFocus = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Автофокус
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting || loading) return;
    
    const trimmedContent = content.trim();
    
    if (trimmedContent.length < minLength) {
      return;
    }
    
    if (trimmedContent.length > maxLength) {
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onSubmit(trimmedContent, quotedText, quotedCommentId);
      
      if (success) {
        setContent('');
        setShowPreview(false);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setShowPreview(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter для отправки
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isValid = content.trim().length >= minLength && content.trim().length <= maxLength;
  const currentLength = content.length;
  const isSubmitDisabled = !isValid || isSubmitting || loading;

  if (!user) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Войдите в систему, чтобы оставить комментарий
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600 ${className}`}>
      <form onSubmit={handleSubmit} className="p-4">
        {/* Цитируемый текст */}
        {quotedText && quotedAuthor && (
          <div className="mb-3 p-3 bg-white dark:bg-dark-800 border-l-4 border-primary-500 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <Quote className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {quotedAuthor}:
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              "{quotedText}"
            </p>
          </div>
        )}

        {/* Поле ввода */}
        <div className="relative">
          {showPreview ? (
            // Режим предварительного просмотра
            <div className="min-h-[80px] p-3 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                {content || placeholder}
              </div>
            </div>
          ) : (
            // Режим редактирования
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full min-h-[80px] max-h-[200px] p-3 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={loading || isSubmitting}
            />
          )}
        </div>

        {/* Счетчик символов и инфо */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <span>Ctrl+Enter для отправки</span>
            {quotedText && (
              <span className="flex items-center gap-1">
                <Quote className="w-3 h-3" />
                Цитата добавлена
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`${
              currentLength > maxLength * 0.9 
                ? 'text-red-500' 
                : currentLength > maxLength * 0.7 
                ? 'text-yellow-500' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {currentLength}/{maxLength}
            </span>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {/* Кнопка предварительного просмотра */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-800 rounded-md transition-colors"
              disabled={loading || isSubmitting}
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Редактировать</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Предпросмотр</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка отмены */}
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-800 rounded-lg transition-colors"
                disabled={loading || isSubmitting}
              >
                <X className="w-4 h-4" />
                {cancelText}
              </button>
            )}

            {/* Кнопка отправки */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isSubmitDisabled
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
              {isSubmitting ? 'Отправка...' : submitText}
            </button>
          </div>
        </div>

        {/* Ошибки валидации */}
        {content.trim().length > 0 && content.trim().length < minLength && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Комментарий слишком короткий (минимум {minLength} символ)
          </div>
        )}
        
        {currentLength > maxLength && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Комментарий слишком длинный (максимум {maxLength} символов)
          </div>
        )}
      </form>
    </div>
  );
};

export default CommentForm;
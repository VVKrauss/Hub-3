// src/components/comments/index.ts
export { default as CommentSection } from './CommentSection';
export { default as CommentForm } from './CommentForm';
export { default as CommentItem } from './CommentItem';
export { default as UserCommentsTab } from './UserCommentsTab';
export { default as CommentNotifications } from './CommentNotifications';
export { default as NotificationBell } from './NotificationBell';

// Экспорт хуков
export { useComments } from '../../hooks/useComments';
export { useCommentNotifications } from '../../hooks/useCommentNotifications';

// Экспорт типов
export type { EventComment, CommentNotification } from '../../api/comments';
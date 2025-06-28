// src/components/ui/UserAvatar.tsx

import { User } from 'lucide-react';

type UserAvatarProps = {
  avatarUrl?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const UserAvatar = ({ 
  avatarUrl, 
  name, 
  size = 'md', 
  className = '', 
  showFallback = true 
}: UserAvatarProps) => {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || 'User avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide image if it fails to load, fallback will show
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : showFallback ? (
        <User className={`${iconSize} text-primary-600 dark:text-primary-400`} />
      ) : null}
    </div>
  );
};

export default UserAvatar;
// src/components/ui/CustomLoader.tsx - Улучшенный компонент с серым фоном из палитры
import { FC } from 'react';

interface CustomLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  text?: string;
  variant?: 'default' | 'overlay' | 'page';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

const CustomLoader: FC<CustomLoaderProps> = ({ 
  size = 'md', 
  className = '', 
  showText = false,
  text = 'Загрузка...',
  variant = 'default'
}) => {
  const getBackgroundClasses = () => {
    switch (variant) {
      case 'overlay':
        return 'fixed inset-0 bg-gray-500/75 dark:bg-dark-600/75 backdrop-blur-sm flex items-center justify-center z-50';
      case 'page':
        return 'min-h-screen bg-gray-500 dark:bg-dark-600 flex items-center justify-center';
      default:
        return 'flex flex-col items-center justify-center';
    }
  };

  const loaderContent = (
    <>
      <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
        {/* Анимированный логотип */}
        <img 
          src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/anim_logo_optimize.gif"
          alt="Загрузка"
          className="w-full h-full object-contain"
          loading="eager"
        />
        
        {/* Дополнительный пульсирующий эффект */}
        <div className="absolute inset-0 rounded-full border-2 border-primary-300 dark:border-primary-600 animate-pulse opacity-50" />
      </div>
      
      {showText && (
        <p className={`mt-3 text-gray-700 dark:text-gray-200 animate-pulse font-medium ${textSizeClasses[size]} ${className}`}>
          {text}
        </p>
      )}
    </>
  );

  return (
    <div className={`${getBackgroundClasses()} ${className}`}>
      {variant === 'default' ? (
        loaderContent
      ) : (
        <div className="text-center">
          {loaderContent}
        </div>
      )}
    </div>
  );
};

export default CustomLoader;
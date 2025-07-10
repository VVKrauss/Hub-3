// src/components/ui/CustomLoader.tsx - Компонент с анимированным логотипом
import { cn } from '../../utils/cn';

interface CustomLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  text?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const CustomLoader = ({ 
  size = 'md', 
  className = '', 
  showText = false,
  text = 'Загрузка...'
}: CustomLoaderProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size]
      )}>
        <img 
          src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/anim_logo_optimize.gif"
          alt="Загрузка"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>
      
      {showText && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default CustomLoader;
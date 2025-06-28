import { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg bg-white dark:bg-dark-800 p-6 text-left shadow-xl transition-all`}>
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
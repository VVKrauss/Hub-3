import { CreditCard, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Modal from '../ui/Modal';

type PaymentOptionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'online' | 'venue') => void;
  hasOnlinePayment: boolean;
  paymentType: string; // 'widget' | 'link'
  paymentLink?: string;
};

const PaymentOptionsModal = ({
  isOpen,
  onClose,
  onSelectOption,
  hasOnlinePayment,
  paymentType,
  paymentLink
}: PaymentOptionsModalProps) => {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && paymentType === 'widget' && widgetContainerRef.current) {
      // Очищаем контейнер перед вставкой виджета
      widgetContainerRef.current.innerHTML = '';
      
      // Создаем элемент div для виджета
      const widgetElement = document.createElement('div');
      widgetElement.className = 'oblakkarte-widget';
      widgetElement.setAttribute('data-organizer-public-token', 'Yi0idjZg');
      widgetElement.setAttribute('data-event-id', 'YOUR_EVENT_ID'); // Замените на реальный ID события
      
      widgetContainerRef.current.appendChild(widgetElement);
      
      // Если виджет не загрузился автоматически, попробуем инициализировать его вручную
      if (window.OblakkarteWidget) {
        window.OblakkarteWidget.init();
      }
    }
  }, [isOpen, paymentType]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выберите способ оплаты"
      size="md"
    >
      <div className="space-y-4">
        {hasOnlinePayment && paymentType === 'widget' ? (
          <div className="space-y-4">
            <div ref={widgetContainerRef} className="w-full"></div>
            <button
              onClick={() => onSelectOption('venue')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center gap-4"
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium">Оплата на месте</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Оплатите при посещении мероприятия
                </p>
              </div>
            </button>
          </div>
        ) : hasOnlinePayment && (
          <button
            onClick={() => onSelectOption('online')}
            className="w-full p-4 border-2 border-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-4"
          >
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
              <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Онлайн оплата</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Оплатите сейчас картой или электронным кошельком
              </p>
            </div>
          </button>
        )}
        
        {paymentType !== 'widget' && (
          <button
            onClick={() => onSelectOption('venue')}
            className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center gap-4"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Оплата на месте</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Оплатите при посещении мероприятия
              </p>
            </div>
          </button>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="mt-6 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
      >
        Отмена
      </button>
    </Modal>
  );
};

export default PaymentOptionsModal;
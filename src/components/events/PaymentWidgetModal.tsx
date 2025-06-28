import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Modal from '../ui/Modal';

type PaymentWidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
};

const PaymentWidgetModal = ({ isOpen, onClose, widgetId }: PaymentWidgetModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && widgetId && containerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://widget.oblakkarte.rs/widget.js';
      script.setAttribute('data-organizer-public-token', widgetId);
      containerRef.current.appendChild(script);

      return () => {
        if (containerRef.current?.contains(script)) {
          containerRef.current.removeChild(script);
        }
      };
    }
  }, [isOpen, widgetId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Оплата билета"
      size="lg"
    >
      <div ref={containerRef} className="p-6" />
    </Modal>
  );
};

export default PaymentWidgetModal;
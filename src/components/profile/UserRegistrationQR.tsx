// src/components/profile/UserRegistrationQR.tsx
import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { QrCode, Download, Share2, Copy, X, Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';

interface RegistrationData {
  id: string;
  event_id: string;
  registration_id: string;
  full_name: string;
  email: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  payment_status: string;
  status: string;
  registration_date: string;
  event?: {
    id: string;
    title: string;
    start_at?: string;
    location?: string;
    event_type?: string;
    bg_image?: string;
  };
}

interface UserRegistrationQRProps {
  registration: RegistrationData;
  isOpen: boolean;
  onClose: () => void;
}

const UserRegistrationQR: React.FC<UserRegistrationQRProps> = ({
  registration,
  isOpen,
  onClose
}) => {
  const [qrSize, setQrSize] = useState(256);

  if (!isOpen) return null;

  const generateQRData = () => {
    return JSON.stringify({
      type: 'event_registration',
      registrationId: registration.registration_id,
      eventId: registration.event_id,
      userId: registration.id,
      fullName: registration.full_name,
      email: registration.email,
      adultTickets: registration.adult_tickets,
      childTickets: registration.child_tickets,
      totalAmount: registration.total_amount,
      paymentStatus: registration.payment_status,
      timestamp: Date.now()
    });
  };

  const downloadQR = () => {
    const svg = document.getElementById('registration-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      // Белый фон
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
      }
      
      const link = document.createElement('a');
      link.download = `registration-qr-${registration.registration_id}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyQRData = async () => {
    const qrData = generateQRData();
    try {
      await navigator.clipboard.writeText(qrData);
      toast.success('Данные регистрации скопированы');
    } catch (error) {
      console.error('Error copying QR data:', error);
      toast.error('Ошибка копирования');
    }
  };

  const shareQR = async () => {
    const qrData = generateQRData();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Регистрация на ${registration.event?.title}`,
          text: `QR-код регистрации на мероприятие`,
          url: qrData
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyQRData();
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'free':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачено';
      case 'pending':
        return 'Ожидает оплаты';
      case 'free':
        return 'Бесплатно';
      default:
        return 'Неизвестно';
    }
  };

  const qrData = generateQRData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <h2 className="text-lg font-semibold">QR-код регистрации</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Event Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {registration.event?.title || 'Мероприятие'}
            </h3>
            
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {registration.event?.start_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatRussianDate(registration.event.start_at)}
                    {registration.event.start_at && (
                      <> в {formatTimeFromTimestamp(registration.event.start_at)}</>
                    )}
                  </span>
                </div>
              )}
              
              {registration.event?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{registration.event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  {registration.adult_tickets} взрослых
                  {registration.child_tickets > 0 && `, ${registration.child_tickets} детей`}
                </span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="mt-3">
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(registration.payment_status)}`}>
                {getPaymentStatusText(registration.payment_status)}
              </span>
              {registration.total_amount > 0 && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {registration.total_amount} ₽
                </span>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm inline-block mb-4">
              <QRCode
                id="registration-qr-code"
                value={qrData}
                size={qrSize}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
              />
            </div>

            {/* QR Size Controls */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setQrSize(200)}
                className={`px-3 py-1 text-xs rounded ${qrSize === 200 ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-dark-700'}`}
              >
                Маленький
              </button>
              <button
                onClick={() => setQrSize(256)}
                className={`px-3 py-1 text-xs rounded ${qrSize === 256 ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-dark-700'}`}
              >
                Средний
              </button>
              <button
                onClick={() => setQrSize(300)}
                className={`px-3 py-1 text-xs rounded ${qrSize === 300 ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-dark-700'}`}
              >
                Большой
              </button>
            </div>

            {/* Registration Details */}
            <div className="text-left bg-gray-50 dark:bg-dark-700 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium mb-1">Детали регистрации:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>ID:</strong> {registration.registration_id}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Имя:</strong> {registration.full_name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Email:</strong> {registration.email}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Дата регистрации:</strong> {new Date(registration.registration_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={downloadQR}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Скачать</span>
            </button>

            <button
              onClick={copyQRData}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              <Copy className="h-4 w-4" />
              <span className="text-sm">Копировать</span>
            </button>

            <button
              onClick={shareQR}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Поделиться</span>
            </button>
          </div>

          {/* Event Link */}
          {registration.event && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600">
              <a
                href={`/events/${registration.event_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">Перейти к мероприятию</span>
              </a>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Покажите этот QR-код администратору на входе в мероприятие для подтверждения регистрации
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistrationQR;
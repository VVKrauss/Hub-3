// src/components/profile/UserQRCode.tsx
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Download, RefreshCw, QrCode, Share2, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface UserQRCodeProps {
  userId: string;
  userName: string;
  userEmail: string;
}

const UserQRCode: React.FC<UserQRCodeProps> = ({ userId, userName, userEmail }) => {
  const [qrToken, setQrToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchQRToken();
  }, [userId]);

  const fetchQRToken = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('qr_token')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data?.qr_token) {
        setQrToken(data.qr_token);
      } else {
        // Если нет токена, создаем новый
        await regenerateQRToken();
      }
    } catch (error) {
      console.error('Error fetching QR token:', error);
      toast.error('Ошибка загрузки QR-кода');
    } finally {
      setLoading(false);
    }
  };

  const regenerateQRToken = async () => {
    try {
      setRegenerating(true);
      
      const { data, error } = await supabase.rpc('regenerate_qr_token', {
        profile_id: userId
      });

      if (error) throw error;

      setQrToken(data);
      toast.success('QR-код обновлен');
    } catch (error) {
      console.error('Error regenerating QR token:', error);
      toast.error('Ошибка обновления QR-кода');
    } finally {
      setRegenerating(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('user-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      
      const link = document.createElement('a');
      link.download = `qr-code-${userName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyQRData = async () => {
    const qrData = generateQRData();
    try {
      await navigator.clipboard.writeText(qrData);
      toast.success('Данные QR-кода скопированы');
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
          title: `QR-код ${userName}`,
          text: `QR-код для отметки посещений`,
          url: qrData
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyQRData();
    }
  };

  const generateQRData = () => {
    return JSON.stringify({
      type: 'user_attendance',
      userId: userId,
      qrToken: qrToken,
      userName: userName,
      userEmail: userEmail,
      timestamp: Date.now()
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Загрузка QR-кода...</p>
      </div>
    );
  }

  const qrData = generateQRData();

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Мой QR-код</h3>
        </div>
        <p className="text-primary-100 text-sm mt-1">
          Покажите этот код админу для отметки посещения
        </p>
      </div>

      <div className="p-6">
        <div className="text-center mb-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg shadow-sm inline-block mb-4">
            <QRCode
              id="user-qr-code"
              value={qrData}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox="0 0 256 256"
            />
          </div>

          {/* User Info */}
          <div className="text-center">
            <p className="font-medium text-gray-900 dark:text-white">{userName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ID: {qrToken.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={downloadQR}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">Скачать</span>
          </button>

          <button
            onClick={shareQR}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-sm">Поделиться</span>
          </button>
        </div>

        {/* Regenerate Button */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-600">
          <button
            onClick={regenerateQRToken}
            disabled={regenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Обновление...' : 'Обновить QR-код'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Обновите код, если считаете, что он скомпрометирован
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserQRCode;
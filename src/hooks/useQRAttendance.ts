// src/hooks/useQRAttendance.ts
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface QRAttendanceData {
  type: string;
  userId: string;
  qrToken: string;
  userName: string;
  userEmail: string;
  timestamp: number;
}

interface UseQRAttendanceReturn {
  isScanning: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  processQRCode: (qrData: string) => Promise<QRAttendanceData | null>;
  recordAttendance: (
    userId: string,
    scannedBy: string,
    eventId?: string,
    location?: string,
    notes?: string
  ) => Promise<boolean>;
  validateQRToken: (userId: string, qrToken: string) => Promise<boolean>;
  regenerateUserQRToken: (userId: string) => Promise<string | null>;
}

export const useQRAttendance = (): UseQRAttendanceReturn => {
  const [isScanning, setIsScanning] = useState(false);

  const startScanning = useCallback(() => {
    setIsScanning(true);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const processQRCode = useCallback(async (qrData: string): Promise<QRAttendanceData | null> => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type !== 'user_attendance' || !parsed.userId || !parsed.qrToken) {
        throw new Error('Неверный формат QR-кода');
      }

      // Проверяем, что токен не слишком старый (например, не старше 24 часов)
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
      if (parsed.timestamp && Date.now() - parsed.timestamp > maxAge) {
        throw new Error('QR-код устарел, попросите пользователя обновить его');
      }

      return parsed as QRAttendanceData;
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка обработки QR-кода');
      return null;
    }
  }, []);

  const validateQRToken = useCallback(async (userId: string, qrToken: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('qr_token')
        .eq('id', userId)
        .eq('qr_token', qrToken)
        .single();

      if (error || !data) {
        throw new Error('QR-код недействителен или устарел');
      }

      return true;
    } catch (error) {
      console.error('Error validating QR token:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка проверки QR-кода');
      return false;
    }
  }, []);

  const recordAttendance = useCallback(async (
    userId: string,
    scannedBy: string,
    eventId?: string,
    location?: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const attendanceData = {
        user_id: userId,
        scanned_by: scannedBy,
        event_id: eventId || null,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        attendance_type: eventId ? 'event' : 'general'
      };

      const { error } = await supabase
        .from('user_attendance')
        .insert([attendanceData]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error('Ошибка при записи посещения');
      return false;
    }
  }, []);

  const regenerateUserQRToken = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('regenerate_qr_token', {
        profile_id: userId
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error regenerating QR token:', error);
      toast.error('Ошибка обновления QR-кода');
      return null;
    }
  }, []);

  return {
    isScanning,
    startScanning,
    stopScanning,
    processQRCode,
    recordAttendance,
    validateQRToken,
    regenerateUserQRToken
  };
};

// Дополнительный хук для статистики посещений
export const useAttendanceStats = (userId?: string) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    thisYear: 0,
    eventAttendance: 0,
    generalAttendance: 0
  });

  const fetchStats = useCallback(async (targetUserId?: string) => {
    if (!targetUserId && !userId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_attendance')
        .select('scanned_at, attendance_type')
        .eq('user_id', targetUserId || userId);

      if (error) throw error;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const calculatedStats = {
        total: data.length,
        thisMonth: data.filter(record => {
          const recordDate = new Date(record.scanned_at);
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        }).length,
        thisYear: data.filter(record => {
          const recordDate = new Date(record.scanned_at);
          return recordDate.getFullYear() === currentYear;
        }).length,
        eventAttendance: data.filter(record => record.attendance_type === 'event').length,
        generalAttendance: data.filter(record => record.attendance_type === 'general').length
      };

      setStats(calculatedStats);
      return calculatedStats;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    stats,
    loading,
    fetchStats
  };
};
// src/utils/performanceUtils.ts - Утилиты для оптимизации производительности
import { useRef, useCallback } from 'react';

/**
 * Debounce функция для предотвращения частых вызовов
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle функция для ограничения частоты вызовов
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Хук для debounced функций
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Хук для throttled функций
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

/**
 * Проверка валидности токена
 */
export const isTokenValid = (expiresAt: number): boolean => {
  const now = Date.now() / 1000; // Supabase использует секунды
  const buffer = 300; // 5 минут буфер
  return expiresAt > (now + buffer);
};

/**
 * Быстрая проверка сети
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Проверка видимости вкладки
 */
export const isTabVisible = (): boolean => {
  return document.visibilityState === 'visible';
};

/**
 * Получение времени неактивности вкладки
 */
export const getTabInactiveTime = (lastActiveTime: number): number => {
  return Date.now() - lastActiveTime;
};

/**
 * Создание таймаута с Promise
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
};

/**
 * Promise с таймаутом
 */
export const withTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    createTimeout(timeoutMs)
  ]);
};

/**
 * Безопасный JSON.parse
 */
export const safeJsonParse = <T = any>(str: string | null, fallback: T): T => {
  if (!str) return fallback;
  
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Логирование производительности
 */
export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`⚡ Performance [${name}]: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

/**
 * Создание уникального ID для предотвращения дублирования операций
 */
export const createOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Менеджер операций для предотвращения дублирования
 */
export class OperationManager {
  private operations = new Set<string>();
  
  isRunning(operationId: string): boolean {
    return this.operations.has(operationId);
  }
  
  start(operationId: string): boolean {
    if (this.operations.has(operationId)) {
      return false; // Операция уже выполняется
    }
    
    this.operations.add(operationId);
    return true;
  }
  
  end(operationId: string): void {
    this.operations.delete(operationId);
  }
  
  clear(): void {
    this.operations.clear();
  }
}

// Глобальный менеджер операций
export const globalOperationManager = new OperationManager();
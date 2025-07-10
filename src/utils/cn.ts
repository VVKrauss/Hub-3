// src/utils/cn.ts - Утилита для объединения CSS классов
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Если clsx и tailwind-merge не установлены, используйте эту простую версию:
// export function cn(...classes: (string | undefined | null | false)[]): string {
//   return classes.filter(Boolean).join(' ');
// }
// src/utils/cn.ts - Простая утилита для объединения CSS классов
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
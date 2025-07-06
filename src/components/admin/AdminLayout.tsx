// src/components/layout/AdminLayout.tsx
// ИСПРАВЛЕНО: используем единственный экземпляр Supabase

import { ReactNode } from 'react';
import { supabase } from '../../lib/supabase'; // ← ИСПОЛЬЗУЕМ ЕДИНСТВЕННЫЙ ЭКЗЕМПЛЯР
// НЕ СОЗДАЕМ НОВЫЙ: const supabase = createClient(...)

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  // Остальной код AdminLayout без создания нового Supabase клиента
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-dark-800 shadow-sm">
          {/* Навигация админки */}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

// ВАЖНО: Убедитесь что в AdminLayout.tsx НЕТ строки:
// const supabase = createClient(supabaseUrl, supabaseKey);
// 
// Должен быть только импорт:
// import { supabase } from '../../lib/supabase';
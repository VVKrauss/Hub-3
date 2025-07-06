// src/components/layout/Layout.tsx
// Добавляем отладчик в Layout

import { memo } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingDebugger from '../debug/LoadingDebugger';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Header />
      <main className="relative">
        {children}
      </main>
      <Footer />
      
      {/* Добавляем отладчик только в development режиме */}
      {process.env.NODE_ENV === 'development' && <LoadingDebugger />}
    </div>
  );
});

Layout.displayName = 'Layout';
export default Layout;
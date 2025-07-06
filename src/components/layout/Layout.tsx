// src/components/layout/Layout.tsx
// Добавляем отладчик в существующий Layout

import { ReactNode } from 'react';
import TopBar from './TopBar';
import Footer from './Footer';
import LoadingDebugger from '../debug/LoadingDebugger';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      

      {/* Включаем отладчик */}
      {process.env.NODE_ENV === 'development' && <LoadingDebugger />}
    </div>
  );
};

export default Layout; 
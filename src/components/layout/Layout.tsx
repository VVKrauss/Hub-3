// src/components/layout/Layout.tsx
// ОБНОВЛЕННЫЙ Layout с минимальным TopBar

import { ReactNode } from 'react';
import TopBarMinimal from './TopBarMinimal'; // ← Используем минимальную версию
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* МИНИМАЛЬНЫЙ TOPBAR вместо полного */}
      <TopBarMinimal />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;
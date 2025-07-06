// src/components/layout/Layout.tsx
// ТЕСТИРОВАНИЕ ШАГА 2: TopBar с API навигацией

import { ReactNode } from 'react';
// import TopBarMinimal from './TopBarMinimal'; // ← Шаг 1
import TopBar from './TopBar'; // ← Шаг 2: API навигация
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ШАГ 2: TopBar с API навигацией */}
      <TopBar /> 
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;
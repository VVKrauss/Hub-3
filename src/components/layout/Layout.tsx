// src/components/layout/Layout.tsx
// Использует ЕДИНСТВЕННЫЙ файл TopBar.tsx

import { ReactNode } from 'react';
import TopBar from './TopBar'; // ← ЕДИНСТВЕННЫЙ TopBar файл
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ЕДИНСТВЕННЫЙ TopBar - все изменения делаем в TopBar.tsx */}
      <TopBar />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;
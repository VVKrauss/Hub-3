import { ReactNode } from 'react';
// import TopBar from './TopBar';  // ЗАКОММЕНТИРУЙТЕ
// import Footer from './Footer';  // ЗАКОММЕНТИРУЙТЕ

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ВРЕМЕННО УБИРАЕМ ВСЕ */}
      {/* <TopBar /> */}
      
      <main className="flex-grow">
        {children}
      </main>
      
      {/* <Footer /> */}
      
      <div className="p-4 text-center bg-red-100">
        <h1>ДИАГНОСТИКА: Если это видно без бесконечных рендеров - проблема в TopBar или Footer</h1>
      </div>
    </div>
  );
};

export default Layout;
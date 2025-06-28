import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

const PageHeader = ({ 
  title, 
  subtitle, 
  children, 
  className = "" 
}: PageHeaderProps) => {
  return (
    <section className={`page-header ${className}`}>
      <div className="container flex flex-col justify-center h-full">
        <h1 className="mb-4 animate-slide-up">{title}</h1>
        {subtitle && (
          <p className="text-xl md:text-2xl mb-6 max-w-2xl animate-slide-up animation-delay-100">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};

export default PageHeader;
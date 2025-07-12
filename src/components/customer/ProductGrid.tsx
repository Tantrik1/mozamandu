import { ReactNode } from 'react';

interface ProductGridProps {
  children: ReactNode;
  className?: string;
}

export function ProductGrid({ children, className = '' }: ProductGridProps) {
  return (
    <div className={`
      grid gap-4 
      grid-cols-2 
      sm:grid-cols-2 
      md:grid-cols-3 
      lg:grid-cols-4 
      xl:grid-cols-5
      ${className}
    `}>
      {children}
    </div>
  );
}
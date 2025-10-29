import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Simple pass-through layout without MainLayout sidebar
  return <>{children}</>;
}

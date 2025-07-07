'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PublicLayout } from '@/components/public-layout';

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ['/tournaments', '/rankings'];
  
  const isPublicRoute = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicRoute) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

'use client';

import { ReactNode } from 'react';
import { AppLayout } from '@/components/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

'use client';

import { ReactNode } from 'react';
import { AppLayout } from '@/components/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>
        {children}
        <FirebaseErrorListener />
      </AppLayout>
    </AuthGuard>
  );
}

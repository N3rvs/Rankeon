
'use client';

import { AppLayout } from '@/components/app-layout';
import { ModeratorGuard } from '@/components/auth/moderator-guard';
import { AuthGuard } from '@/contexts/auth-context';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ModeratorGuard>
        <AppLayout>{children}</AppLayout>
      </ModeratorGuard>
    </AuthGuard>
  );
}


'use client';

import { useEffect, type ReactNode } from 'react';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, claims, loading } = useAuth();
  const router = useRouter();

  const isModerator = claims?.role === 'moderator' || claims?.role === 'admin';

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push('/login');
    } else if (!isModerator) {
      router.replace('/dashboard');
    }
  }, [user, claims, isModerator, loading, router]);

  if (loading || !user || !isModerator) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

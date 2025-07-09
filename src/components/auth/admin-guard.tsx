
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Spinner } from '../ui/spinner';

export function AdminGuard({ children }: { children: ReactNode }) {
    const { claims, loading } = useAuth();
    const router = useRouter();

    const isAdmin = claims?.role === 'admin';

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, loading, router]);

    if (loading || !isAdmin) {
        return (
             <div className="flex h-full items-center justify-center p-12">
                <Spinner className="h-12 w-12" />
            </div>
        );
    }

    return <>{children}</>;
}

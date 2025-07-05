'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Users } from 'lucide-react';
import { UserManagementTable } from '@/components/admin/user-management-table';

export default function AdminPage() {
    const { claims, loading } = useAuth();
    const router = useRouter();

    const isAdmin = claims?.role === 'admin';

    useEffect(() => {
        // If loading is finished and the user is not an admin, redirect them.
        if (!loading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, loading, router]);

    // While loading, or if the user is not an admin (before redirect), show a skeleton.
    if (loading || !isAdmin) {
        return (
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // If checks pass, render the actual admin dashboard.
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="font-headline text-3xl">Admin Dashboard</CardTitle>
                            <CardDescription>View, edit, and manage all users and platform settings.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Users className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-2xl">User Management</CardTitle>
                            <CardDescription>Oversee all registered users in the platform.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <UserManagementTable />
                </CardContent>
            </Card>
        </div>
    )
}

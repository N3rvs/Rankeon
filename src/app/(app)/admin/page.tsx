'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users } from "lucide-react";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Skeleton } from '@/components/ui/skeleton';

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

    // While loading, or if the user is not an admin (before redirect), show a loading state.
    // This prevents the `UserManagementTable` from rendering and making a permission-denied query.
    if (loading || !isAdmin) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div>
                                <Skeleton className="h-8 w-64 mb-2" />
                                <Skeleton className="h-4 w-80" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                             <Skeleton className="h-6 w-6 rounded-full" />
                             <div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-72" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-1/3" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // If checks pass, render the actual admin dashboard content.
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="font-headline text-3xl">Admin Dashboard</CardTitle>
                            <CardDescription>Welcome, administrator. This is your command center.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p>This page is only visible to users with the 'admin' role. You can now add admin-specific functionality here.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Users className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-2xl">User Management</CardTitle>
                            <CardDescription>View, edit, and manage all registered users.</CardDescription>
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

'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagementTable } from '@/components/admin/user-management-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
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
            <div className="space-y-6">
               <Skeleton className="h-10 w-64" />
               <Card>
                   <CardHeader>
                       <Skeleton className="h-8 w-64 mb-2" />
                       <Skeleton className="h-4 w-80" />
                   </CardHeader>
                   <CardContent>
                      <Skeleton className="h-96 w-full" />
                   </CardContent>
               </Card>
           </div>
       );
    }
    
    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin Dashboard
                </Link>
            </Button>
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
                    <UserManagementTable currentUserRole="admin" />
                </CardContent>
            </Card>
        </div>
    )
}

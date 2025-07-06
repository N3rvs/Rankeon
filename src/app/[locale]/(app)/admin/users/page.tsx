
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagementTable } from '@/components/admin/user-management-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'next-intl/link';
import { AdminGuard } from '@/components/auth/admin-guard';

export default function AdminUsersPage() {
    return (
        <AdminGuard>
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
        </AdminGuard>
    )
}

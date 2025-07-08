'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagementTable } from '@/components/admin/user-management-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';

export default function AdminUsersPage() {
    const { t } = useI18n();
    
    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('AdminPanel.back_button')}
                </Link>
            </Button>
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Users className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-2xl">{t('AdminPanel.user_management_page_title')}</CardTitle>
                            <CardDescription>{t('AdminPanel.user_management_page_desc')}</CardDescription>
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

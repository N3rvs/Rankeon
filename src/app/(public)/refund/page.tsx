// src/app/(public)/refund/page.tsx
'use client';

import { PublicLayout } from "@/components/public-layout";
import { useI18n } from "@/contexts/i18n-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, LifeBuoy } from 'lucide-react';
import { useState } from "react";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";

export default function RefundPolicyPage() {
    const { t } = useI18n();
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

    return (
        <PublicLayout>
            <CreateTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} />
            <div className="container mx-auto max-w-3xl px-4 py-12">
                <Card>
                    <CardHeader className="text-center">
                        <RefreshCcw className="h-12 w-12 text-primary mx-auto mb-4" />
                        <CardTitle className="text-3xl font-bold font-headline">{t('RefundPage.title')}</CardTitle>
                        <CardDescription>{t('RefundPage.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold">{t('RefundPage.eligibility_title')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('RefundPage.eligibility_desc')}
                            </p>
                        </div>
                         <div className="space-y-2">
                            <h3 className="font-semibold">{t('RefundPage.process_title')}</h3>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                <li>{t('RefundPage.process_step1')}</li>
                                <li>{t('RefundPage.process_step2')}</li>
                                <li>{t('RefundPage.process_step3')}</li>
                            </ol>
                        </div>
                        <div className="text-center pt-4">
                            <Button onClick={() => setIsTicketDialogOpen(true)}>
                                <LifeBuoy className="mr-2 h-4 w-4" />
                                {t('RefundPage.cta')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PublicLayout>
    );
}

// src/app/(public)/support/page.tsx
'use client';

import { useI18n } from "@/contexts/i18n-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, BookOpen, CircleHelp, RefreshCcw, Bot } from 'lucide-react';
import Link from "next/link";
import { useState } from "react";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";

export default function SupportPage() {
    const { t } = useI18n();
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

    const faqItems = [
        {
            q: t('SupportPage.faq_q1'),
            a: t('SupportPage.faq_a1')
        },
        {
            q: t('SupportPage.faq_q2'),
            a: t('SupportPage.faq_a2')
        },
         {
            q: t('SupportPage.faq_q3'),
            a: t('SupportPage.faq_a3')
        }
    ];

    return (
        <>
            <CreateTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} />
            <div className="container mx-auto max-w-6xl px-4 py-12">
                <div className="text-center mb-12">
                    <LifeBuoy className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h1 className="text-4xl font-bold font-headline mb-2">{t('SupportPage.title')}</h1>
                    <p className="text-lg text-muted-foreground">{t('SupportPage.subtitle')}</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <Card>
                        <CardHeader className="flex-row items-center gap-4">
                            <Bot className="h-8 w-8 text-primary shrink-0" />
                            <div>
                                <CardTitle className="font-headline">{t('SupportPage.ai_title')}</CardTitle>
                                <CardDescription>{t('SupportPage.ai_desc')}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Button className="w-full" disabled>{t('SupportPage.ai_cta')}</Button>
                             <p className="text-xs text-center mt-2 text-muted-foreground">{t('SupportPage.ai_note')}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center gap-4">
                            <CircleHelp className="h-8 w-8 text-primary shrink-0" />
                            <div>
                                <CardTitle className="font-headline">{t('SupportPage.faq_title')}</CardTitle>
                                <CardDescription>{t('SupportPage.faq_desc')}</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex-row items-center gap-4">
                            <RefreshCcw className="h-8 w-8 text-primary shrink-0" />
                            <div>
                                <CardTitle className="font-headline">{t('SupportPage.refund_title')}</CardTitle>
                                <CardDescription>{t('SupportPage.refund_desc')}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="secondary" asChild><Link href="/refund">{t('SupportPage.refund_cta')}</Link></Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-16">
                    <h2 className="text-2xl font-bold font-headline mb-6 text-center">{t('SupportPage.faq_title')}</h2>
                    <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                        {faqItems.map((item, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>{item.q}</AccordionTrigger>
                                <AccordionContent>
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
                 <div className="mt-16 text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold font-headline">{t('SupportPage.contact_title')}</h2>
                    <p className="text-muted-foreground mt-2 mb-4">{t('SupportPage.contact_desc')}</p>
                    <Button onClick={() => setIsTicketDialogOpen(true)}>{t('SupportPage.contact_cta')}</Button>
                </div>
            </div>
        </>
    );
}

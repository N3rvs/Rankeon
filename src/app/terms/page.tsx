'use client';

import { PublicLayout } from "@/components/public-layout";
import { useI18n } from "@/contexts/i18n-context";

export default function TermsOfServicePage() {
    const { t } = useI18n();
    
    const renderList = (key: string) => (
        <ul className="list-disc space-y-2 pl-6">
            {t(key).split('|').map((item: string, index: number) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );

    return (
        <PublicLayout>
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <h1 className="text-4xl font-bold font-headline mb-2">{t('TermsPage.title')}</h1>
                <p className="text-sm text-muted-foreground mb-8">{t('TermsPage.last_updated')}</p>

                <div className="space-y-8 text-foreground/90">
                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.agreement_title')}</h2>
                        <p>{t('TermsPage.agreement_text')}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.service_desc_title')}</h2>
                        <p>{t('TermsPage.service_desc_text')}</p>
                    </section>

                     <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.user_responsibilities_title')}</h2>
                        {renderList('TermsPage.user_responsibilities_list')}
                    </section>

                     <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.disclaimer_title')}</h2>
                        <p>{t('TermsPage.disclaimer_text')}</p>
                    </section>

                     <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.limitation_liability_title')}</h2>
                        <p>{t('TermsPage.limitation_liability_text')}</p>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.changes_terms_title')}</h2>
                        <p>{t('TermsPage.changes_terms_text')}</p>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('TermsPage.contact_title')}</h2>
                        <p>{t('TermsPage.contact_text')}</p>
                    </section>
                </div>
            </div>
        </PublicLayout>
    );
}

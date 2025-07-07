'use client';

import { PublicLayout } from "@/components/public-layout";
import { useI18n } from "@/contexts/i18n-context";

export default function PrivacyPolicyPage() {
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
                <h1 className="text-4xl font-bold font-headline mb-2">{t('PrivacyPage.title')}</h1>
                <p className="text-sm text-muted-foreground mb-8">{t('PrivacyPage.last_updated')}</p>

                <div className="space-y-8 text-foreground/90">
                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.introduction_title')}</h2>
                        <p>{t('PrivacyPage.introduction_text')}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.data_collected_title')}</h2>
                        {renderList('PrivacyPage.data_collected_list')}
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.how_data_is_used_title')}</h2>
                        {renderList('PrivacyPage.how_data_is_used_list')}
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.data_sharing_title')}</h2>
                        <p>{t('PrivacyPage.data_sharing_text')}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.data_security_title')}</h2>
                        <p>{t('PrivacyPage.data_security_text')}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.your_rights_title')}</h2>
                        <p>{t('PrivacyPage.your_rights_text')}</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.cookies_title')}</h2>
                        <p className="mb-4">{t('PrivacyPage.cookies_text_intro')}</p>
                        {renderList('PrivacyPage.cookies_list')}
                    </section>

                    <section>
                        <h2 className="text-2xl font-headline font-semibold mb-4">{t('PrivacyPage.contact_title')}</h2>
                        <p>{t('PrivacyPage.contact_text')}</p>
                    </section>
                </div>
            </div>
        </PublicLayout>
    );
}

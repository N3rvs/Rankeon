'use client';

import { useI18n } from "@/contexts/i18n-context";
import { Users, Target, Shield } from "lucide-react";

export default function AboutPage() {
    const { t } = useI18n();

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <h1 className="text-4xl font-bold font-headline mb-4 text-center">{t('AboutPage.title')}</h1>
            <p className="text-xl text-muted-foreground text-center mb-12">{t('AboutPage.subtitle')}</p>

            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                    <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Users className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('AboutPage.community_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('AboutPage.community_desc')}</p>
                </div>
                 <div>
                    <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Target className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('AboutPage.mission_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('AboutPage.mission_desc')}</p>
                </div>
                 <div>
                    <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Shield className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('AboutPage.values_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('AboutPage.values_desc')}</p>
                </div>
            </div>

             <div className="mt-16 text-center">
                 <h2 className="text-3xl font-bold font-headline">{t('AboutPage.join_us_title')}</h2>
                 <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('AboutPage.join_us_desc')}</p>
            </div>
        </div>
    );
}

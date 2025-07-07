// src/components/tournaments/tournament-guide-dialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { BookOpen, Shield, ShieldCheck, Recycle, Shuffle } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export function TournamentGuideDialog() {
  const { t } = useI18n();

  const formats = [
    {
      id: "single_elim",
      title: t('TournamentGuideDialog.single_elim_title'),
      description: t('TournamentGuideDialog.single_elim_desc'),
      icon: <Shield className="h-5 w-5 mr-3 text-destructive" />
    },
    {
      id: "double_elim",
      title: t('TournamentGuideDialog.double_elim_title'),
      description: t('TournamentGuideDialog.double_elim_desc'),
      icon: <ShieldCheck className="h-5 w-5 mr-3 text-primary" />
    },
    {
      id: "round_robin",
      title: t('TournamentGuideDialog.round_robin_title'),
      description: t('TournamentGuideDialog.round_robin_desc'),
      icon: <Recycle className="h-5 w-5 mr-3 text-yellow-500" />
    },
    {
      id: "swiss_system",
      title: t('TournamentGuideDialog.swiss_system_title'),
      description: t('TournamentGuideDialog.swiss_system_desc'),
      icon: <Shuffle className="h-5 w-5 mr-3 text-purple-500" />
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          {t('TournamentsPage.tournament_guide')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('TournamentGuideDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('TournamentGuideDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          {formats.map((format) => (
            <AccordionItem key={format.id} value={format.id}>
              <AccordionTrigger>
                <div className="flex items-center font-semibold">
                  {format.icon}
                  {format.title}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {format.description}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    {t('TournamentGuideDialog.close_button')}
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// src/components/tournaments/propose-tournament-dialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, PlusCircle, Shield, Star } from 'lucide-react';
import { ProposeTournamentSchema, ProposeTournamentData, proposeTournament } from '@/lib/actions/tournaments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { useI18n } from '@/contexts/i18n-context';

const tournamentFormats = [
    { value: 'single-elim', label: 'Single Elimination' },
    { value: 'double-elim', label: 'Double Elimination' },
    { value: 'round-robin', label: 'Round Robin' },
    { value: 'swiss', label: 'Swiss System' },
];

const teamCountOptions = [4, 8, 16, 32, 64];

const valorantRanks = [
    { value: 'Plata', label: 'Plata' },
    { value: 'Oro', label: 'Oro' },
    { value: 'Platino', label: 'Platino' },
    { value: 'Ascendente', label: 'Ascendente' },
    { value: 'Inmortal', label: 'Inmortal' },
];

export function ProposeTournamentDialog() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProposeTournamentData>({
    resolver: zodResolver(ProposeTournamentSchema),
    defaultValues: {
      name: '',
      game: 'Valorant',
      description: '',
      format: '',
      maxTeams: 8,
      prize: '',
      rankMin: '',
      rankMax: '',
    },
  });

  async function onSubmit(values: ProposeTournamentData) {
    startTransition(async () => {
      const result = await proposeTournament(values);
      if (result.success) {
        toast({
          title: 'Proposal Submitted!',
          description: "Your tournament proposal has been sent to the admins for review.",
        });
        setIsOpen(false);
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('TournamentsPage.propose_tournament')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ProposeTournamentDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('ProposeTournamentDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ProposeTournamentDialog.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('ProposeTournamentDialog.name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="prize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ProposeTournamentDialog.prize')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('ProposeTournamentDialog.prize_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ProposeTournamentDialog.game')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('ProposeTournamentDialog.game_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ProposeTournamentDialog.format')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('ProposeTournamentDialog.select_format')} /></SelectTrigger></FormControl>
                        <SelectContent>
                            {tournamentFormats.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxTeams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Teams</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} defaultValue={String(field.value)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select max teams..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            {teamCountOptions.map(count => <SelectItem key={count} value={String(count)}>{count} Teams</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="rankMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ProposeTournamentDialog.min_rank')}</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('ProposeTournamentDialog.no_restriction')} /></SelectTrigger></FormControl>
                        <SelectContent>
                            {valorantRanks.map(rank => <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="rankMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ProposeTournamentDialog.max_rank')}</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('ProposeTournamentDialog.no_restriction')} /></SelectTrigger></FormControl>
                        <SelectContent>
                            {valorantRanks.map(rank => <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="proposedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('ProposeTournamentDialog.date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('ProposeTournamentDialog.pick_date')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ProposeTournamentDialog.desc_rules')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('ProposeTournamentDialog.desc_rules_placeholder')} className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('ProposeTournamentDialog.submitting') : t('ProposeTournamentDialog.submit')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

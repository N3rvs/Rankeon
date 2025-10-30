
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Trophy } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { TournamentGuideDialog } from '@/components/tournaments/tournament-guide-dialog';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getFlagEmoji } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

export default function TournamentsPage() {
  const { claims } = useAuth();
  const { t } = useI18n();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const [rankFilter, setRankFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  const canPropose =
    claims?.role === 'admin' ||
    claims?.role === 'moderator' ||
    claims?.isCertifiedStreamer === true;

  const rankOrder: { [key: string]: number } = {
    'Hierro': 1, 'Iron': 1,
    'Bronce': 2, 'Bronze': 2,
    'Plata': 3, 'Silver': 3,
    'Oro': 4, 'Gold': 4,
    'Platino': 5, 'Platinum': 5,
    'Diamante': 6, 'Diamond': 6,
    'Ascendente': 7, 'Ascendant': 7,
    'Inmortal': 8, 'Immortal': 8,
    'Radiante': 9, 'Radiant': 9,
  };

  const valorantRanks = [
    { value: 'all', label: t('Market.all_ranks') },
    { value: 'Hierro', label: t('Ranks.iron') },
    { value: 'Bronce', label: t('Ranks.bronze') },
    { value: 'Plata', label: t('Ranks.silver') },
    { value: 'Oro', label: t('Ranks.gold') },
    { value: 'Platino', label: t('Ranks.platinum') },
    { value: 'Diamante', label: t('Ranks.diamond') },
    { value: 'Ascendente', label: t('Ranks.ascendant') },
    { value: 'Inmortal', label: t('Ranks.immortal') },
    { value: 'Radiante', label: t('Ranks.radiant') },
  ];

  const europeanCountries = [
    { value: 'all', label: t('Market.all_countries') },
    { value: 'Albania', label: `${getFlagEmoji('Albania')} ${t('Countries.albania')}` },
    { value: 'Andorra', label: `${getFlagEmoji('Andorra')} ${t('Countries.andorra')}` },
    { value: 'Austria', label: `${getFlagEmoji('Austria')} ${t('Countries.austria')}` },
    { value: 'Belarus', label: `${getFlagEmoji('Belarus')} ${t('Countries.belarus')}` },
    { value: 'Belgium', label: `${getFlagEmoji('Belgium')} ${t('Countries.belgium')}` },
    { value: 'Bosnia and Herzegovina', label: `${getFlagEmoji('Bosnia and Herzegovina')} ${t('Countries.bosnia_and_herzegovina')}` },
    { value: 'Bulgaria', label: `${getFlagEmoji('Bulgaria')} ${t('Countries.bulgaria')}` },
    { value: 'Croatia', label: `${getFlagEmoji('Croatia')} ${t('Countries.croatia')}` },
    { value: 'Cyprus', label: `${getFlagEmoji('Cyprus')} ${t('Countries.cyprus')}` },
    { value: 'Czech Republic', label: `${getFlagEmoji('Czech Republic')} ${t('Countries.czech_republic')}` },
    { value: 'Denmark', label: `${getFlagEmoji('Denmark')} ${t('Countries.denmark')}` },
    { value: 'Estonia', label: `${getFlagEmoji('Estonia')} ${t('Countries.estonia')}` },
    { value: 'Finland', label: `${getFlagEmoji('Finland')} ${t('Countries.finland')}` },
    { value: 'France', label: `${getFlagEmoji('France')} ${t('Countries.france')}` },
    { value: 'Germany', label: `${getFlagEmoji('Germany')} ${t('Countries.germany')}` },
    { value: 'Greece', label: `${getFlagEmoji('Greece')} ${t('Countries.greece')}` },
    { value: 'Hungary', label: `${getFlagEmoji('Hungary')} ${t('Countries.hungary')}` },
    { value: 'Iceland', label: `${getFlagEmoji('Iceland')} ${t('Countries.iceland')}` },
    { value: 'Ireland', label: `${getFlagEmoji('Ireland')} ${t('Countries.ireland')}` },
    { value: 'Italy', label: `${getFlagEmoji('Italy')} ${t('Countries.italy')}` },
    { value: 'Latvia', label: `${getFlagEmoji('Latvia')} ${t('Countries.latvia')}` },
    { value: 'Liechtenstein', label: `${getFlagEmoji('Liechtenstein')} ${t('Countries.liechtenstein')}` },
    { value: 'Lithuania', label: `${getFlagEmoji('Lithuania')} ${t('Countries.lithuania')}` },
    { value: 'Luxembourg', label: `${getFlagEmoji('Luxembourg')} ${t('Countries.luxembourg')}` },
    { value: 'Malta', label: `${getFlagEmoji('Malta')} ${t('Countries.malta')}` },
    { value: 'Moldova', label: `${getFlagEmoji('Moldova')} ${t('Countries.moldova')}` },
    { value: 'Monaco', label: `${getFlagEmoji('Monaco')} ${t('Countries.monaco')}` },
    { value: 'Montenegro', label: `${getFlagEmoji('Montenegro')} ${t('Countries.montenegro')}` },
    { value: 'Netherlands', label: `${getFlagEmoji('Netherlands')} ${t('Countries.netherlands')}` },
    { value: 'North Macedonia', label: `${getFlagEmoji('North Macedonia')} ${t('Countries.north_macedonia')}` },
    { value: 'Norway', label: `${getFlagEmoji('Norway')} ${t('Countries.norway')}` },
    { value: 'Poland', label: `${getFlagEmoji('Poland')} ${t('Countries.poland')}` },
    { value: 'Portugal', label: `${getFlagEmoji('Portugal')} ${t('Countries.portugal')}` },
    { value: 'Romania', label: `${getFlagEmoji('Romania')} ${t('Countries.romania')}` },
    { value: 'Russia', label: `${getFlagEmoji('Russia')} ${t('Countries.russia')}` },
    { value: 'San Marino', label: `${getFlagEmoji('San Marino')} ${t('Countries.san_marino')}` },
    { value: 'Serbia', label: `${getFlagEmoji('Serbia')} ${t('Countries.serbia')}` },
    { value: 'Slovakia', label: `${getFlagEmoji('Slovakia')} ${t('Countries.slovakia')}` },
    { value: 'Slovenia', label: `${getFlagEmoji('Slovenia')} ${t('Countries.slovenia')}` },
    { value: 'Spain', label: `${getFlagEmoji('Spain')} ${t('Countries.spain')}` },
    { value: 'Sweden', label: `${getFlagEmoji('Sweden')} ${t('Countries.sweden')}` },
    { value: 'Switzerland', label: `${getFlagEmoji('Switzerland')} ${t('Countries.switzerland')}` },
    { value: 'Ukraine', label: `${getFlagEmoji('Ukraine')} ${t('Countries.ukraine')}` },
    { value: 'United Kingdom', label: `${getFlagEmoji('United Kingdom')} ${t('Countries.united_kingdom')}` },
    { value: 'Vatican City', label: `${getFlagEmoji('Vatican City')} ${t('Countries.vatican_city')}` }
  ];

  useEffect(() => {
    setLoading(true);
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(
      tournamentsRef,
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: tournamentsRef.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResetFilters = () => {
    setRankFilter('all');
    setCountryFilter('all');
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const countryMatch = countryFilter === 'all' || t.country === countryFilter;
      const rankMatch = rankFilter === 'all' ||
        (!t.rankMin && !t.rankMax) ||
        (t.rankMin && t.rankMax && rankOrder[rankFilter] >= rankOrder[t.rankMin] && rankOrder[rankFilter] <= rankOrder[t.rankMax]);
      return countryMatch && rankMatch;
    });
  }, [tournaments, rankFilter, countryFilter]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            {t('TournamentsPage.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('TournamentsPage.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TournamentGuideDialog />
          {canPropose && <ProposeTournamentDialog />}
        </div>
      </div>
      
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="rank-filter">{t('Market.rank_filter_label')}</Label>
            <Select value={rankFilter} onValueChange={setRankFilter}>
              <SelectTrigger id="rank-filter" className="mt-1">
                <SelectValue placeholder={t('Market.all_ranks')} />
              </SelectTrigger>
              <SelectContent>
                {valorantRanks.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="country-filter">{t('Market.country_filter_label')}</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger id="country-filter" className="mt-1">
                <SelectValue placeholder={t('Market.all_countries')} />
              </SelectTrigger>
              <SelectContent>
                {europeanCountries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
             <Button variant="ghost" onClick={handleResetFilters} className="w-full md:w-auto">{t('Market.reset_button')}</Button>
             <Button className="w-full md:w-auto flex-1">{t('Market.search_button')}</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-12 w-12" />
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTournaments.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">{t('TournamentsPage.no_tournaments_title')}</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t('TournamentsPage.no_tournaments_subtitle')}
          </p>
        </div>
      )}
    </div>
  );
}

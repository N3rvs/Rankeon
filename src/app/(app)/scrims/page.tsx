
// src/app/(app)/scrims/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { db } from '@/lib/firebase/client';
import type { Scrim } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, CalendarSearch, BookOpen, ShieldCheck } from 'lucide-react';
import { CreateScrimDialog } from '@/components/scrims/create-scrim-dialog';
import { ScrimCard } from '@/components/scrims/scrim-card';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getFlagEmoji } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

function ScrimList({ scrims, loading }: { scrims: Scrim[], loading: boolean }) {
    const { t } = useI18n();
    if (loading) {
        return (
            <div className="flex h-80 items-center justify-center">
                <Spinner className="h-12 w-12" />
            </div>
        );
    }

    if (scrims.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
                <Flame className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">{t('ScrimsPage.no_scrims_title')}</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {t('ScrimsPage.no_scrims_subtitle')}
                </p>
            </div>
        );
    }

    // Convierte Timestamps de Firestore a objetos Date de JS antes de pasarlos a ScrimCard
    // Esto es importante porque los Server Components/Client Components a veces no manejan bien los Timestamps
    const scrimsWithDates = scrims.map(s => ({
        ...s,
        // Comprueba si 'date' es un Timestamp antes de convertir
        date: s.date instanceof Timestamp ? s.date.toDate() : s.date,
        // Comprueba si 'createdAt' es un Timestamp antes de convertir
        createdAt: s.createdAt instanceof Timestamp ? s.createdAt.toDate() : s.createdAt,
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {scrimsWithDates.map(scrim => (
                // Asegúrate que ScrimCard espera objetos Date, no Timestamps
                <ScrimCard key={scrim.id} scrim={scrim} />
            ))}
        </div>
    );
}

export default function ScrimsPage() {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const [availableScrims, setAvailableScrims] = useState<Scrim[]>([]);
  const [myScrims, setMyScrims] = useState<Scrim[]>([]);
  const [confirmedScrims, setConfirmedScrims] = useState<Scrim[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingMyScrims, setLoadingMyScrims] = useState(true);
  const [loadingConfirmed, setLoadingConfirmed] = useState(true);

  const [rankFilter, setRankFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  const canCreate = userProfile?.teamId && (userProfile.role === 'founder' || userProfile.role === 'coach');

  const rankOrder: { [key: string]: number } = useMemo(() => ({ // Usar useMemo si `t` puede cambiar
    [t('Ranks.iron')]: 1, 'Hierro': 1, 'Iron': 1,
    [t('Ranks.bronze')]: 2, 'Bronce': 2, 'Bronze': 2,
    [t('Ranks.silver')]: 3, 'Plata': 3, 'Silver': 3,
    [t('Ranks.gold')]: 4, 'Oro': 4, 'Gold': 4,
    [t('Ranks.platinum')]: 5, 'Platino': 5, 'Platinum': 5,
    [t('Ranks.diamond')]: 6, 'Diamante': 6, 'Diamond': 6, // Asegúrate que 'Diamante' existe en tus traducciones si lo usas
    [t('Ranks.ascendant')]: 7, 'Ascendente': 7, 'Ascendant': 7,
    [t('Ranks.immortal')]: 8, 'Inmortal': 8, 'Immortal': 8,
    [t('Ranks.radiant')]: 9, 'Radiante': 9, 'Radiant': 9, // Asegúrate que 'Radiante' existe si lo usas
  }), [t]);

  const valorantRanks = useMemo(() => [ // Usar useMemo
    { value: 'all', label: t('Market.all_ranks') },
    { value: t('Ranks.iron'), label: t('Ranks.iron') },
    { value: t('Ranks.bronze'), label: t('Ranks.bronze') },
    { value: t('Ranks.silver'), label: t('Ranks.silver') },
    { value: t('Ranks.gold'), label: t('Ranks.gold') },
    { value: t('Ranks.platinum'), label: t('Ranks.platinum') },
    { value: t('Ranks.diamond'), label: t('Ranks.diamond') }, // Asegúrate que existe t('Ranks.diamond')
    { value: t('Ranks.ascendant'), label: t('Ranks.ascendant') },
    { value: t('Ranks.immortal'), label: t('Ranks.immortal') },
    { value: t('Ranks.radiant'), label: t('Ranks.radiant') }, // Asegúrate que existe t('Ranks.radiant')
  ], [t]);

  const europeanCountries = useMemo(() => [ // Usar useMemo
    { value: 'all', label: t('Market.all_countries') },
    // ... (lista completa de países usando `t`)
    { value: 'Spain', label: `${getFlagEmoji('Spain')} ${t('Countries.spain')}` },
    // Añade el resto de países aquí usando t('Countries.country_name')
  ], [t]);

  // --- Fetch Available Scrims (status: pending) ---
  useEffect(() => {
    const q = query(
      collection(db, 'scrims'),
      where('status', '==', 'pending'), // Buscamos las que esperan rival
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim));
      setAvailableScrims(data);
      setLoadingAvailable(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: 'scrims',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setLoadingAvailable(false);
    });

    return () => unsubscribe();
  }, []);

   // --- Fetch User's Scrims (Mis Scrims - CORREGIDO) ---
   useEffect(() => {
    if (!userProfile?.teamId) {
        setLoadingMyScrims(false);
        setMyScrims([]);
        return; // Sale temprano si no hay teamId
    }
    setLoadingMyScrims(true);
    const teamId = userProfile.teamId;

    // *** CONSULTA ÚNICA USANDO participantIds ***
    const q = query(
        collection(db, 'scrims'),
        where('participantIds', 'array-contains', teamId), // Busca si el teamId está en el array
        orderBy('date', 'desc') // Ordena por fecha más reciente primero
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim));
        // Filtra estados si es necesario (ej. no mostrar 'cancelled')
        const filteredData = data.filter(scrim => scrim.status !== 'cancelled');
        setMyScrims(filteredData);
        setLoadingMyScrims(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: 'scrims',
            operation: 'list',
          });
        errorEmitter.emit('permission-error', permissionError);
        setLoadingMyScrims(false);
    });

    // Limpia el listener cuando el componente se desmonta o teamId cambia
    return () => unsubscribe();

   }, [userProfile?.teamId]); // Dependencia correcta

  // --- Fetch Confirmed Scrims (sin cambios) ---
  useEffect(() => {
    const q = query(
      collection(db, 'scrims'),
      where('status', '==', 'confirmed'),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim));
      setConfirmedScrims(data);
      setLoadingConfirmed(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: 'scrims',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setLoadingConfirmed(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Lógica de Filtros ---
  const handleResetFilters = () => {
    setRankFilter('all');
    setCountryFilter('all');
  };

  // Función de filtrado mejorada
  const applyFilters = (scrims: Scrim[]) => {
     return scrims.filter(scrim => {
        // Filtro de País
        const countryMatch = countryFilter === 'all' || scrim.country === countryFilter;
        if (!countryMatch) return false;

        // Filtro de Rango
        if (rankFilter === 'all') return true; // Si no hay filtro de rango, pasa

        const filterRankValue = rankOrder[rankFilter];
        if (!filterRankValue) return true; // Si el filtro no es un rango válido, pasa

        // Si la scrim NO tiene rangos definidos, se muestra (o decide si ocultarla)
        if (!scrim.rankMin && !scrim.rankMax) return true;

        // Si la scrim SÍ tiene rangos
        const scrimMinRankValue = scrim.rankMin ? rankOrder[scrim.rankMin] : -Infinity;
        const scrimMaxRankValue = scrim.rankMax ? rankOrder[scrim.rankMax] : Infinity;

        // Comprueba si el rango filtrado cae DENTRO del rango de la scrim
        return filterRankValue >= scrimMinRankValue && filterRankValue <= scrimMaxRankValue;
     });
  }

  // Memoriza los resultados filtrados
  const filteredAvailableScrims = useMemo(() => applyFilters(availableScrims), [availableScrims, rankFilter, countryFilter, rankOrder]); // Añadido rankOrder
  const filteredConfirmedScrims = useMemo(() => applyFilters(confirmedScrims), [confirmedScrims, rankFilter, countryFilter, rankOrder]); // Añadido rankOrder


  // --- JSX (Renderizado) ---
  const filterCard = (
    <Card className="p-4 mb-6">
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
            </div>
        </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">{t('ScrimsPage.title')}</h1>
          <p className="text-muted-foreground">{t('ScrimsPage.subtitle')}</p>
        </div>
        {/* Asegúrate que CreateScrimDialog recibe los ranks/countries si necesita pasarlos */}
        {canCreate && userProfile?.teamId && <CreateScrimDialog teamId={userProfile.teamId} teamCountry={userProfile.country} />}
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available"><CalendarSearch className="mr-2 h-4 w-4" /> {t('ScrimsPage.available_scrims_tab')}</TabsTrigger>
            <TabsTrigger value="my-scrims"><BookOpen className="mr-2 h-4 w-4" /> {t('ScrimsPage.my_scrims_tab')}</TabsTrigger>
            <TabsTrigger value="confirmed"><ShieldCheck className="mr-2 h-4 w-4" /> {t('ScrimsPage.confirmed_matches_tab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="available" className="mt-6">
          {filterCard}
          <ScrimList scrims={filteredAvailableScrims} loading={loadingAvailable} />
        </TabsContent>
        <TabsContent value="my-scrims" className="mt-6">
          {/* No mostramos filtros en "Mis Scrims" */}
          <ScrimList scrims={myScrims} loading={loadingMyScrims} />
        </TabsContent>
         <TabsContent value="confirmed" className="mt-6">
          {filterCard}
          <ScrimList scrims={filteredConfirmedScrims} loading={loadingConfirmed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

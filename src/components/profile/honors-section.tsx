// src/components/profile/honors-section.tsx
'use client';

import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Shield, MessageCircle, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { giveHonorToUser } from '@/lib/actions/honors';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';

interface HonorsSectionProps {
  targetUser: UserProfile;
}

export function HonorsSection({ targetUser }: HonorsSectionProps) {
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [givenHonors, setGivenHonors] = useState<string[]>([]);
  const [loadingGiven, setLoadingGiven] = useState(true);
  
  const isOwnProfile = currentUser?.uid === targetUser.id;

  const honorsConfig = useMemo(() => [
    { id: 'great_teammate', icon: Heart, label: t('Honors.great_teammate') },
    { id: 'leader', icon: Shield, label: t('Honors.leader') },
    { id: 'good_communicator', icon: MessageCircle, label: t('Honors.good_communicator') },
    { id: 'positive_attitude', icon: Smile, label: t('Honors.positive_attitude') },
  ], [t]);


  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (currentUser && !isOwnProfile) {
      setLoadingGiven(true);
      const honorDocId = `${currentUser.uid}_${targetUser.id}`;
      const honorDocRef = doc(db, 'honorsGiven', honorDocId);
      
      unsubscribe = onSnapshot(honorDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setGivenHonors(docSnap.data().honors || []);
        } else {
          setGivenHonors([]);
        }
        setLoadingGiven(false);
      });

    } else {
      setLoadingGiven(false);
    }

    return () => unsubscribe?.();
  }, [currentUser, targetUser.id, isOwnProfile]);

  const handleGiveHonor = (honorType: string) => {
    if (isOwnProfile || givenHonors.length > 0) return;

    startTransition(async () => {
      const result = await giveHonorToUser(targetUser.id, honorType);
      if (result.success) {
        toast({ title: t('Honors.honor_awarded'), description: t('Honors.honor_awarded_desc', { name: targetUser.name }) });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const honorCounts = useMemo(() => targetUser.honorCounts || {}, [targetUser.honorCounts]);

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="font-headline flex items-center gap-2 text-base">
          <span className="text-primary">✩</span>
          {t('ProfilePage.honors')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-3 p-4 pt-0">
        {honorsConfig.map(honor => {
          const anyHonorGiven = givenHonors.length > 0;
          const isThisHonorGiven = givenHonors.includes(honor.id);
          const count = honorCounts[honor.id] || 0;
          const isDisabled = isOwnProfile || anyHonorGiven || isPending || loadingGiven;

          return (
             <TooltipProvider key={honor.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGiveHonor(honor.id)}
                      disabled={isDisabled}
                      className={cn(
                        "relative h-12 w-12 rounded-lg border-primary/10 bg-primary/5 text-primary hover:bg-primary/20",
                        isThisHonorGiven && "ring-2 ring-primary/50 border-primary/30 bg-primary/20"
                      )}
                    >
                      <honor.icon className="h-5 w-5" />
                    </Button>
                    <span className="text-center text-xs font-semibold">{count}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{honor.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </CardContent>
    </Card>
  );
}

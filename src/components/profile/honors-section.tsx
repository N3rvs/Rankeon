// src/components/profile/honors-section.tsx
'use client';

import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Shield, MessageCircle, Smile, ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { giveHonorToUser, revokeHonorFromUser } from '@/lib/actions/honors';
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
    { id: 'great_teammate', icon: Heart, label: t('Honors.great_teammate'), color: 'text-green-500' },
    { id: 'leader', icon: Shield, label: t('Honors.leader'), color: 'text-blue-500' },
    { id: 'good_communicator', icon: MessageCircle, label: t('Honors.good_communicator'), color: 'text-sky-500' },
    { id: 'positive_attitude', icon: Smile, label: t('Honors.positive_attitude'), color: 'text-yellow-500' },
    { id: 'bad_behavior', icon: ShieldX, label: t('Honors.bad_behavior'), color: 'text-destructive' },
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
    startTransition(async () => {
      const result = await giveHonorToUser(targetUser.id, honorType);
      if (result.success) {
        toast({ title: t('Honors.honor_awarded'), description: t('Honors.honor_awarded_desc', { name: targetUser.name }) });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleRevokeHonor = () => {
    startTransition(async () => {
        const result = await revokeHonorFromUser(targetUser.id);
        if (result.success) {
            toast({ title: t('Honors.honor_revoked_title'), description: t('Honors.honor_revoked_desc', { name: targetUser.name }) });
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
      <CardContent className="grid grid-cols-5 gap-3 p-4 pt-0">
        {honorsConfig.map(honor => {
          const count = honorCounts[honor.id] || 0;
          const isHonorGivenByMe = givenHonors.includes(honor.id);
          const hasGivenAnyHonor = givenHonors.length > 0;

          const canInteract = !isOwnProfile && !isPending && !loadingGiven;
          const isDisabled = !canInteract || (hasGivenAnyHonor && !isHonorGivenByMe);

          const handleClick = () => {
            if (isDisabled) return;

            if (isHonorGivenByMe) {
                handleRevokeHonor();
            } else {
                handleGiveHonor(honor.id);
            }
          };

          return (
             <TooltipProvider key={honor.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClick}
                      disabled={isDisabled}
                      className={cn(
                        "relative h-12 w-12 rounded-lg border-primary/10 bg-primary/5 hover:bg-primary/20",
                        isHonorGivenByMe && "ring-2 ring-primary/50 border-primary/30 bg-primary/20",
                        honor.color
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

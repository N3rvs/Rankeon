// src/components/profile/honors-section.tsx
'use client';

import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Shield, MessageCircle, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { giveHonorToUser } from '@/lib/actions/honors';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const honorsConfig = [
  { id: 'great_teammate', icon: Heart, label: 'Great Teammate' },
  { id: 'leader', icon: Shield, label: 'Leader' },
  { id: 'good_communicator', icon: MessageCircle, label: 'Good Communicator' },
  { id: 'positive_attitude', icon: Smile, label: 'Positive Attitude' },
];

interface HonorsSectionProps {
  targetUser: UserProfile;
}

export function HonorsSection({ targetUser }: HonorsSectionProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [givenHonors, setGivenHonors] = useState<string[]>([]);
  const [loadingGiven, setLoadingGiven] = useState(true);
  
  const isOwnProfile = currentUser?.uid === targetUser.id;

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
    if (isOwnProfile) return;
    if (givenHonors.includes(honorType)) return;

    startTransition(async () => {
      const result = await giveHonorToUser(targetUser.id, honorType);
      if (result.success) {
        toast({ title: 'Honor Awarded!', description: `You've recognized ${targetUser.name} for their skill.` });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const honorCounts = useMemo(() => targetUser.honorCounts || {}, [targetUser.honorCounts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-lg">
          <span className="text-primary">✩</span>
          Honors
        </CardTitle>
        <CardDescription>
          Recognize players for their positive contributions.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {honorsConfig.map(honor => {
          const hasGiven = givenHonors.includes(honor.id);
          const count = honorCounts[honor.id] || 0;
          const isDisabled = isOwnProfile || hasGiven || isPending || loadingGiven;

          return (
             <TooltipProvider key={honor.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGiveHonor(honor.id)}
                      disabled={isDisabled}
                      className={cn(
                        "h-14 w-14 rounded-lg bg-primary/5 border-primary/10 text-primary hover:bg-primary/20 relative",
                        hasGiven && "bg-primary/20 border-primary/30 ring-2 ring-primary/50"
                      )}
                    >
                      <honor.icon className="h-6 w-6" />
                    </Button>
                    <span className="text-sm font-semibold text-center">{count}</span>
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

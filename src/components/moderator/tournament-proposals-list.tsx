
'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TournamentProposal } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Check, Gavel, X } from 'lucide-react';
import { reviewTournamentProposal } from '@/lib/actions/tournaments';
import { Spinner } from '../ui/spinner';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

function ProposalCard({ proposal }: { proposal: TournamentProposal }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleReview = (status: 'approved' | 'rejected') => {
        startTransition(async () => {
            const result = await reviewTournamentProposal({ proposalId: proposal.id, status });
             if (result.success) {
                toast({
                    title: 'Success',
                    description: `Proposal has been ${status}.`,
                });
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
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{proposal.tournamentName}</CardTitle>
                <CardDescription>Proposed by {proposal.proposerName} for {proposal.game}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-sm">Proposed Date</h4>
                    <p className="text-muted-foreground text-sm">{format(proposal.proposedDate.toDate(), "PPP")}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm">Format</h4>
                    <p className="text-muted-foreground text-sm capitalize">{proposal.format}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Description</h4>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap break-words">{proposal.description}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleReview('rejected')} disabled={isPending}>
                    <X className="mr-2 h-4 w-4" />
                    Reject
                </Button>
                <Button size="sm" onClick={() => handleReview('approved')} disabled={isPending}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                </Button>
            </CardFooter>
        </Card>
    );
}

export function TournamentProposalsList() {
  const [proposals, setProposals] = useState<TournamentProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    setLoading(true);
    const proposalsRef = collection(db, 'tournamentProposals');
    const q = query(
      proposalsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const proposalsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate'}) } as TournamentProposal)
        );
        setProposals(proposalsData);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: proposalsRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, []);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-[300px]">
        <Gavel className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">All Clear!</h3>
        <p className="mt-2 text-muted-foreground">
          There are no pending tournament proposals to review.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {proposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
    </div>
  );
}

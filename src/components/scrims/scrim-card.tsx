// src/components/scrims/scrim-card.tsx
'use client';

import { useState, useTransition } from 'react';
import type { Scrim, Team } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Clock, Info, ShieldCheck, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { acceptScrim, cancelScrim } from '@/lib/actions/scrims';
import { useAuth } from '@/contexts/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ScrimCardProps {
  scrim: Scrim;
  userStaffTeams: Team[];
}

export function ScrimCard({ scrim, userStaffTeams }: ScrimCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isAccepting, startAccepting] = useTransition();
    const [isCancelling, startCancelling] = useTransition();
    const [acceptingTeamId, setAcceptingTeamId] = useState('');
    
    const isUserStaffOfPostingTeam = userStaffTeams.some(team => team.id === scrim.teamAId);
    
    // Teams the user is staff of, excluding the team that posted the scrim
    const eligibleAcceptingTeams = userStaffTeams.filter(team => team.id !== scrim.teamAId);
    
    const handleAcceptScrim = () => {
        if (!acceptingTeamId) {
            toast({ title: 'Error', description: 'Please select a team to accept the scrim.', variant: 'destructive'});
            return;
        }
        startAccepting(async () => {
            const result = await acceptScrim(scrim.id, acceptingTeamId);
            if(result.success) {
                toast({ title: 'Scrim Accepted!', description: `Your match against ${scrim.teamAName} is confirmed.`});
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    const handleCancelScrim = () => {
        startCancelling(async () => {
             const result = await cancelScrim(scrim.id);
            if(result.success) {
                toast({ title: 'Scrim Cancelled', description: 'The scrim has been removed from the list.'});
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
             <Avatar className="h-12 w-12 border">
                <AvatarImage src={scrim.teamAAvatarUrl} alt={scrim.teamAName} data-ai-hint="team logo" />
                <AvatarFallback>{scrim.teamAName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="font-headline">{scrim.teamAName}</CardTitle>
                <CardDescription>
                    Posted {formatDistanceToNow(scrim.createdAt.toDate(), { addSuffix: true })}
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
         <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize"><Info className="h-3 w-3 mr-1.5" />{scrim.type}</Badge>
            <Badge variant="outline" className="uppercase"><ShieldCheck className="h-3 w-3 mr-1.5" />{scrim.format}</Badge>
        </div>
        <div>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(scrim.date.toDate(), 'E, MMM d, yyyy')}</span>
            </div>
             <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Clock className="h-4 w-4" />
                <span>{format(scrim.date.toDate(), 'p')}</span>
            </div>
        </div>
        {scrim.notes && <p className="text-sm text-muted-foreground border-l-2 pl-3 italic">{scrim.notes}</p>}
      </CardContent>
      <CardFooter>
        {isUserStaffOfPostingTeam ? (
            <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isCancelling}>
                        <X className="mr-2 h-4 w-4" /> Cancel Scrim
                    </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently cancel your scrim listing. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelScrim} disabled={isCancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                           {isCancelling ? "Cancelling..." : "Yes, Cancel Scrim"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        ) : (
             <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={eligibleAcceptingTeams.length === 0}>
                        <Check className="mr-2 h-4 w-4" /> Accept Scrim
                    </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept Scrim vs {scrim.teamAName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Select your team to challenge them. This will confirm the match and notify the other team captain.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Select onValueChange={setAcceptingTeamId} value={acceptingTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your team..." />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleAcceptingTeams.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAcceptScrim} disabled={isAccepting || !acceptingTeamId}>
                            {isAccepting ? "Accepting..." : "Confirm Scrim"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam } from '@/lib/actions/teams';
import type { Team, TeamMember } from '@/lib/types';

interface TeamSettingsProps {
  team: Team;
  currentMemberRole?: TeamMember['role'];
}

export function TeamSettings({ team, currentMemberRole }: TeamSettingsProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const isFounder = currentMemberRole === 'founder';

    const handleDeleteTeam = () => {
        startTransition(async () => {
            const result = await deleteTeam(team.id);
            if (result.success) {
                toast({
                    title: 'Team Deleted',
                    description: `The team "${team.name}" has been permanently deleted.`,
                });
                router.push('/teams');
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
            setIsAlertOpen(false);
        });
    };

    return (
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            <span className="font-bold"> {team.name} </span>
                            team, including all its members and data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTeam}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? 'Deleting...' : 'Yes, delete team'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle>Team Settings</CardTitle>
                    <CardDescription>
                        Edit your team's details, banner, and recruitment status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">General settings will be available in a future update.</p>
                </CardContent>
            </Card>

            {isFounder && (
                <Card className="mt-6 border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle />
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        </div>
                         <CardDescription className="text-destructive/80">
                            Be careful, these actions are permanent.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                            <div>
                                <h4 className="font-semibold">Delete this team</h4>
                                <p className="text-sm text-muted-foreground">Once you delete a team, there is no going back.</p>
                            </div>
                            <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Team
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    )
}

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
                    title: 'Equipo Eliminado',
                    description: `El equipo "${team.name}" ha sido eliminado permanentemente.`,
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
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el equipo
                            <span className="font-bold"> {team.name} </span>
                            , incluyendo todos sus miembros y datos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTeam}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? 'Eliminando...' : 'Sí, eliminar equipo'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle>Ajustes del Equipo</CardTitle>
                    <CardDescription>
                        Edita los detalles de tu equipo, el banner y el estado de reclutamiento.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Los ajustes generales estarán disponibles en una futura actualización.</p>
                </CardContent>
            </Card>

            {isFounder && (
                <Card className="mt-6 border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle />
                            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                        </div>
                         <CardDescription className="text-destructive/80">
                            Ten cuidado, estas acciones son permanentes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                            <div>
                                <h4 className="font-semibold">Eliminar este equipo</h4>
                                <p className="text-sm text-muted-foreground">Una vez que eliminas un equipo, no hay vuelta atrás.</p>
                            </div>
                            <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Equipo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    )
}

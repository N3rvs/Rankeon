import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUserTeams } from "@/lib/mock-data";
import { PlusCircle, Settings } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeamsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">My Teams</h1>
                    <p className="text-muted-foreground">Manage your teams or create a new one.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Team
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mockUserTeams.map((team) => (
                    <Card key={team.id} className="overflow-hidden">
                        <div className="relative h-32 w-full">
                            <Image src="https://placehold.co/600x200.png" alt={`${team.name} banner`} fill style={{ objectFit: 'cover' }} data-ai-hint="gaming banner" />
                            <div className="absolute bottom-[-2rem] left-4">
                                <Avatar className="h-16 w-16 border-4 border-card">
                                    <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
                                    <AvatarFallback>{team.name.slice(0,2)}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <CardHeader className="pt-10">
                            <CardTitle className="font-headline">{team.name}</CardTitle>
                            <CardDescription>{team.game}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex -space-x-2 overflow-hidden">
                                {team.members.map(member => (
                                     <Avatar key={member.id} className="inline-block h-8 w-8 ring-2 ring-card">
                                        <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="player avatar" />
                                        <AvatarFallback>{member.name.slice(0,2)}</AvatarFallback>
                                     </Avatar>
                                ))}
                                {team.members.length > 5 && <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-2 ring-card">+{team.members.length - 5}</div>}
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">{team.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">
                                <Settings className="mr-2 h-4 w-4" /> Manage Team
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}

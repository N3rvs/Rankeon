import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCurrentUser } from "@/lib/mock-data";
import { Edit } from "lucide-react";

export default function ProfilePage() {
    const user = mockCurrentUser;
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-24 w-24 border-4 border-primary">
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="male avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-3xl font-headline">{user.name}</CardTitle>
                        <CardDescription className="flex items-center justify-center gap-2 mt-1">
                            <Badge variant="default" className="capitalize">{user.role}</Badge>
                            <span className="text-muted-foreground">{user.email}</span>
                        </CardDescription>
                    </div>
                    <Button>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                </CardHeader>
                <CardContent className="mt-4 border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="font-semibold font-headline mb-2">About Me</h3>
                            <p className="text-muted-foreground text-sm">{user.bio}</p>
                        </div>
                        <div className="md:col-span-1">
                            <h3 className="font-semibold font-headline mb-2">Primary Games</h3>
                            <div className="flex flex-wrap gap-2">
                                {user.games.map(game => (
                                    <Badge key={game} variant="secondary">{game}</Badge>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <h3 className="font-semibold font-headline mb-2">Skills / Roles</h3>
                            <div className="flex flex-wrap gap-2">
                                {user.skills.map(skill => (
                                    <Badge key={skill} variant="outline">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

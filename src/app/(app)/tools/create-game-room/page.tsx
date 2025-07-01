import { CreateGameRoomForm } from "@/components/tools/create-game-room-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function CreateGameRoomPage() {
    return (
        <div className="space-y-6">
            <Card className="bg-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-start gap-4">
                    <div className="bg-primary/20 p-3 rounded-full">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-primary">Game Room & Discord Integration</CardTitle>
                        <CardDescription className="text-primary/80">
                           Automate your pre-game setup. This tool creates a game room in our database and instantly provisions a dedicated voice channel on Discord for your team.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
            <CreateGameRoomForm />
        </div>
    )
}

import { TeamNameGeneratorForm } from "@/components/tools/team-name-generator-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function TeamNameGeneratorPage() {
    return (
        <div className="space-y-6">
            <Card className="bg-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-start gap-4">
                    <div className="bg-primary/20 p-3 rounded-full">
                        <Lightbulb className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-primary">AI Team Name Generator</CardTitle>
                        <CardDescription className="text-primary/80">
                            Stuck on a name for your new squad? Let our AI generate some creative and catchy team names for you.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
            <TeamNameGeneratorForm />
        </div>
    )
}

'use client';

import { generateTeamName } from "@/ai/flows/team-name-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  gameType: z.string().min(1, { message: "Please select a game type." }),
  style: z.string().min(1, { message: "Please select a style." }),
  keywords: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TeamNameGeneratorForm() {
    const { toast } = useToast();
    const [generatedName, setGeneratedName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            gameType: "FPS",
            style: "Aggressive",
            keywords: ""
        }
    });

    const onSubmit = async (values: FormValues) => {
        setIsLoading(true);
        setGeneratedName(null);
        try {
            const result = await generateTeamName(values);
            if (result.teamName) {
                setGeneratedName(result.teamName);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Failed to generate team name. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = () => {
        if (generatedName) {
            navigator.clipboard.writeText(generatedName);
            toast({
                title: 'Copied!',
                description: `"${generatedName}" copied to clipboard.`,
            });
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Generator Settings</CardTitle>
                    <CardDescription>Configure the AI to generate the perfect name.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="gameType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Game Type / Genre</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a game genre" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="FPS">FPS (e.g., Valorant, CS:GO)</SelectItem>
                                                <SelectItem value="MOBA">MOBA (e.g., LoL, Dota 2)</SelectItem>
                                                <SelectItem value="Battle Royale">Battle Royale (e.g., Apex, Fortnite)</SelectItem>
                                                <SelectItem value="Strategy">Strategy (e.g., StarCraft)</SelectItem>
                                                <SelectItem value="Fantasy">Fantasy</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="style"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name Style</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a name style" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Aggressive">Aggressive</SelectItem>
                                                <SelectItem value="Mythical">Mythical</SelectItem>
                                                <SelectItem value="Funny">Funny</SelectItem>
                                                <SelectItem value="Professional">Professional</SelectItem>
                                                <SelectItem value="Futuristic">Futuristic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="keywords"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Optional Keywords</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Dragon, Phantom, Cosmic" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    'Generating...'
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Name
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline">Generated Name</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    {isLoading && (
                        <div className="w-full space-y-2">
                             <Skeleton className="h-8 w-3/4 mx-auto" />
                             <Skeleton className="h-4 w-1/2 mx-auto" />
                        </div>
                    )}
                    {!isLoading && generatedName && (
                        <div className="text-center group">
                            <p className="text-4xl font-bold font-headline text-primary">{generatedName}</p>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy className="mr-2 h-4 w-4" /> Copy
                            </Button>
                        </div>
                    )}
                     {!isLoading && !generatedName && (
                        <div className="text-center text-muted-foreground">
                            <p>Your generated team name will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}

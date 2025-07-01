
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { createGameRoom } from '@/lib/actions/game-rooms';
import { Sparkles, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  name: z.string().min(3, 'Room name must be at least 3 characters.').max(50, 'Room name must be less than 50 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateGameRoomForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ channelId: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        }
    });

    const onSubmit = async (values: FormValues) => {
        setIsLoading(true);
        setResult(null);
        setError(null);
        try {
            const response = await createGameRoom(values.name);
            if (response.success && response.discordChannelId) {
                setResult({ channelId: response.discordChannelId });
                toast({
                    title: 'Room Created!',
                    description: `Discord voice channel created for "${values.name}".`,
                });
                form.reset();
            } else {
                setError(response.message);
                toast({
                    title: 'Error',
                    description: response.message,
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.message || 'Failed to create game room. Please try again.';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Create Game Room</CardTitle>
                <CardDescription>Enter a name to create a game room in Firestore and a voice channel in Discord.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Room Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Weekend Scrims" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                'Creating...'
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Create Room & Discord Channel
                                </>
                            )}
                        </Button>
                    </form>
                </Form>

                {error && (
                    <Alert variant="destructive" className="mt-6">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Function Error</AlertTitle>
                        <AlertDescription>
                            <p>The server returned an error. This is often a configuration issue.</p>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold mt-2 block">
                                {error}
                            </code>
                        </AlertDescription>
                    </Alert>
                )}

                {result && !error && (
                    <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                        <h4 className="font-semibold text-green-300">Success!</h4>
                        <p className="text-sm text-green-400/80">
                            Discord Voice Channel ID: <code className="bg-background/50 px-1 py-0.5 rounded">{result.channelId}</code>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

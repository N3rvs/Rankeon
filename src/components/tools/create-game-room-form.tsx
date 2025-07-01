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
import { Sparkles, Bot } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'Room name must be at least 3 characters.').max(50, 'Room name must be less than 50 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateGameRoomForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ channelId: string } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        }
    });

    const onSubmit = async (values: FormValues) => {
        setIsLoading(true);
        setResult(null);
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
                throw new Error(response.message);
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create game room. Please try again.',
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
                {result && (
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

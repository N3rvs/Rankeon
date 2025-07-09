'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askAssistant } from '@/ai/flows/assistant-flow';
import { useI18n } from '@/contexts/i18n-context';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  role: 'user' | 'model';
  content: { text: string }[];
}

export default function AssistantPage() {
  const { t } = useI18n();
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = { role: 'user', content: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    startTransition(async () => {
      try {
        const assistantResponse = await askAssistant({ 
          query: currentInput,
          history: messages 
        });
        const modelMessage: Message = { role: 'model', content: [{ text: assistantResponse.response }] };
        setMessages(prev => [...prev, modelMessage]);
      } catch (error) {
        const errorMessage: Message = { role: 'model', content: [{ text: "Lo siento, he encontrado un error. Por favor, inténtalo de nuevo." }] };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
        <header className="mb-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                {t('Assistant.title')}
            </h1>
        </header>

        <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                    <div className="space-y-6">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full pt-10">
                                <Bot className="mx-auto h-16 w-16 mb-4" />
                                <p className="text-lg">{t('Assistant.placeholder')}</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                        <div key={index} className={cn('flex items-start gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {msg.role === 'model' && (
                                <Avatar className="h-9 w-9 border bg-primary text-primary-foreground">
                                    <div className="flex items-center justify-center h-full w-full">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                </Avatar>
                            )}
                            <div className={cn(
                                "rounded-lg px-4 py-3 text-sm max-w-xl shadow-sm",
                                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}>
                               {msg.content[0].text}
                            </div>
                             {msg.role === 'user' && userProfile && (
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={userProfile.avatarUrl} data-ai-hint="person avatar" />
                                    <AvatarFallback>{userProfile.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                        ))}
                        {isPending && (
                        <div className="flex items-start gap-4 justify-start">
                             <Avatar className="h-9 w-9 border bg-primary text-primary-foreground">
                                <div className="flex items-center justify-center h-full w-full">
                                    <Bot className="h-5 w-5" />
                                </div>
                            </Avatar>
                            <div className="rounded-lg px-4 py-3 text-sm max-w-xl bg-muted flex items-center gap-2 shadow-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t">
                    <form onSubmit={handleSubmit} className="relative">
                        <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('Assistant.placeholder')}
                        className="pr-12 h-12 text-base"
                        autoFocus
                        />
                        <Button
                        type="submit"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        disabled={!input.trim() || isPending}
                        >
                        <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

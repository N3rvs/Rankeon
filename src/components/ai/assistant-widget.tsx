// src/components/ai/assistant-widget.tsx
'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askAssistant } from '@/ai/flows/assistant-flow';
import { useI18n } from '@/contexts/i18n-context';

interface Message {
  role: 'user' | 'model';
  content: { text: string }[];
}

export function AssistantWidget() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = { role: 'user', content: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    startTransition(async () => {
      const assistantResponse = await askAssistant({ 
        query: input,
        history: messages 
      });
      const modelMessage: Message = { role: 'model', content: [{ text: assistantResponse.response }] };
      setMessages(prev => [...prev, modelMessage]);
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                 <Button size="icon" className="rounded-full w-14 h-14 shadow-lg">
                    <Bot className="h-7 w-7" />
                    <span className="sr-only">Open Assistant</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[90vw] max-w-sm h-[60vh] flex flex-col shadow-2xl p-0 mb-2" 
                align="end"
                side="top"
            >
               <div className="flex items-center justify-between p-4 border-b bg-primary/10">
                    <div className="flex items-center gap-2 font-headline text-primary">
                        <Bot className="h-6 w-6" />
                        <h3 className="text-lg font-semibold">{t('Assistant.title')}</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7">
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
                <div className="flex-1 p-0 flex flex-col min-h-0">
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground pt-10">
                                <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                                <h3 className="font-semibold">{t('Assistant.title')}</h3>
                                <p className="text-sm">{t('Assistant.placeholder')}</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                        <div key={index} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                                "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}>
                            {msg.content[0].text}
                            </div>
                        </div>
                        ))}
                        {isPending && (
                        <div className="flex justify-start">
                            <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-muted flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking...</span>
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
                        className="pr-12"
                        />
                        <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        disabled={!input.trim() || isPending}
                        >
                        <Send className="h-4 w-4" />
                        </Button>
                    </form>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}

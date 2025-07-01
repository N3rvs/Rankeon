'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockConversations } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Search, Send } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function MessagesPage() {
    const { userProfile } = useAuth();

    return (
        <div className="h-[calc(100vh-theme(spacing.24))]">
            <Card className="h-full flex">
                <div className="w-full md:w-1/3 border-r flex-col hidden md:flex">
                    <div className="p-4 border-b">
                        <h2 className="text-2xl font-bold font-headline">Messages</h2>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search messages..." className="pl-9" />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        {mockConversations.map(convo => (
                            <div key={convo.id} className="flex items-center gap-4 p-4 hover:bg-accent cursor-pointer border-b">
                                <Avatar>
                                    <AvatarImage src={convo.participant.avatarUrl} data-ai-hint="person avatar" />
                                    <AvatarFallback>{convo.participant.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold truncate">{convo.participant.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{convo.lastMessage.text}</p>
                                </div>
                                <p className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(convo.lastMessage.timestamp, { addSuffix: true })}</p>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                <div className="w-full md:w-2/3 flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={mockConversations[0].participant.avatarUrl} data-ai-hint="person avatar"/>
                                <AvatarFallback>{mockConversations[0].participant.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{mockConversations[0].participant.name}</p>
                                <p className="text-sm text-muted-foreground">Online</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon">
                            <MoreVertical />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            <ChatMessage sender="other" text="Hey, saw your profile. Are you still looking for a team?" timestamp={Date.now() - 1000 * 60 * 5} />
                            <ChatMessage sender="me" text="Yeah, I am! Your team looks interesting. What role are you looking to fill?" timestamp={Date.now() - 1000 * 60 * 3} userAvatar={userProfile?.avatarUrl} userName={userProfile?.name} />
                            <ChatMessage sender="other" text="We're looking for a duelist, your Jett stats are impressive." timestamp={Date.now() - 1000 * 60 * 1} />
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t mt-auto">
                        <div className="relative">
                            <Input placeholder="Type a message..." className="pr-12" />
                            <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

function ChatMessage({ sender, text, userAvatar, userName }: { sender: 'me' | 'other', text: string, timestamp: number, userAvatar?: string, userName?: string }) {
    const isMe = sender === 'me';
    return (
        <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
            {!isMe && <Avatar className="h-8 w-8"><AvatarImage src={mockConversations[0].participant.avatarUrl} data-ai-hint="person avatar" /><AvatarFallback>{mockConversations[0].participant.name.slice(0, 2)}</AvatarFallback></Avatar>}
            <div className={cn(
                "max-w-xs md:max-w-md rounded-lg p-3",
                isMe ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p className="text-sm">{text}</p>
            </div>
            {isMe && userAvatar && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} data-ai-hint="male avatar"/>
                    <AvatarFallback>{userName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}

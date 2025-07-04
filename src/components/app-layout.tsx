
// src/components/app-layout.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  UserCircle,
  Wrench,
  LogOut,
  Search,
  Users2,
  Shield,
  Lightbulb,
  ChevronRight,
  Dices,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase/client';
import { Skeleton } from './ui/skeleton';
import { InboxIcon } from './inbox/inbox-icon';
import { collection, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isToolsOpen, setIsToolsOpen] = useState(pathname.startsWith('/tools'));


  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      const q = query(
        collection(db, 'inbox', user.uid, 'notifications'),
        where('read', '==', false),
        where('type', '==', 'new_message')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadMessages(snapshot.size);
      });
    } else {
      setUnreadMessages(0);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">SquadUp</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/dashboard')}
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/teams')}
                tooltip="My Teams"
              >
                <Link href="/teams">
                  <Users2 />
                  <span>My Teams</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/rooms')}
                tooltip="Salas de Juego"
              >
                <Link href="/rooms">
                  <Dices />
                  <span>Salas de Juego</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/messages')}
                tooltip="Messages"
              >
                <Link href="/messages">
                  <MessageSquare />
                  <span>Messages</span>
                </Link>
              </SidebarMenuButton>
              {unreadMessages > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuItem>
            {userProfile?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/admin')}
                  tooltip="Admin"
                >
                  <Link href="/admin">
                    <Shield />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <Collapsible asChild onOpenChange={setIsToolsOpen} open={isToolsOpen}>
              <SidebarMenuItem className="flex flex-col items-start !gap-0">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full" isActive={pathname.startsWith('/tools')} tooltip="Tools">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wrench />
                            <span>Tools</span>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isToolsOpen && "rotate-90")} />
                      </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent asChild>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild size="sm" isActive={pathname === '/tools/team-name-generator'}>
                        <Link href="/tools/team-name-generator">
                          <Lightbulb />
                          <span>Name Generator</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/profile')}
                tooltip="Profile"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div className="relative hidden md:block w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players, teams, or games..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <InboxIcon />
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <Avatar>
                <AvatarImage
                  src={userProfile?.avatarUrl}
                  alt={userProfile?.name}
                  data-ai-hint="male avatar"
                />
                <AvatarFallback>
                  {userProfile?.name?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

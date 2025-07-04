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
} from '@/components/ui/sidebar';
import {
  Gamepad2,
  UserCircle,
  LogOut,
  Search,
  Dices,
  Users,
  Store,
  Swords,
  Trophy,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase/client';
import { Skeleton } from './ui/skeleton';
import { InboxIcon } from './inbox/inbox-icon';
import { collection, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();
  const [unreadFriendActivity, setUnreadFriendActivity] = useState(0);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      // The "Friends" tab notification should reflect all friend-related activity.
      const relevantNotificationTypes = ['new_message', 'friend_request', 'friend_accepted'];
      const q = query(
        collection(db, 'inbox', user.uid, 'notifications'),
        where('read', '==', false),
        where('type', 'in', relevantNotificationTypes)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadFriendActivity(snapshot.size);
      });
    } else {
      setUnreadFriendActivity(0);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    // Using window.location.assign forces a full page reload, which is a robust
    // way to ensure all real-time listeners are disconnected, preventing
    // the "insufficient permissions" error after logout.
    window.location.assign('/login');
  };

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 pt-6 mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">SquadUp</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="gap-4">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/profile')}
                tooltip="Profile"
                size="lg"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/dashboard')}
                tooltip="Market"
                size="lg"
              >
                <Link href="/dashboard">
                  <Store />
                  <span>Market</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/rooms')}
                tooltip="Game Rooms"
                size="lg"
              >
                <Link href="/rooms">
                  <Dices />
                  <span>Game Rooms</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/tournaments')}
                tooltip="Tournaments"
                size="lg"
              >
                <Link href="/tournaments">
                  <Trophy />
                  <span>Tournaments</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/teams')}
                tooltip="Mi Equipo"
                size="lg"
              >
                <Link href="/teams">
                  <Swords />
                  <span>Mi Equipo</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/messages')}
                tooltip="Friends"
                 size="lg"
              >
                <Link href="/messages">
                  <Users />
                  <span>Friends</span>
                </Link>
              </SidebarMenuButton>
              {unreadFriendActivity > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuItem>
            
            {userProfile?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/admin')}
                  tooltip="Admin"
                   size="lg"
                >
                  <Link href="/admin">
                    <Shield />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout" size="lg">
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

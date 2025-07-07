'use client';

import { useState, useEffect, useTransition } from 'react';
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
  UserCircle,
  LogOut,
  Dices,
  Users,
  Store,
  Swords,
  Trophy,
  Shield,
  Gavel,
  Circle,
  Flame,
  Medal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase/client';
import { Skeleton } from './ui/skeleton';
import { InboxIcon } from './inbox/inbox-icon';
import { collection, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';
import { LanguageSwitcher } from './i18n/language-switcher';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { UserStatus } from '@/lib/types';
import { updateUserPresence } from '@/lib/actions/users';
import Image from 'next/image';
import ScrimlyLogo from '@/assets/logo.png';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, loading, claims } = useAuth();
  const [unreadFriendActivity, setUnreadFriendActivity] = useState(0);
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user) {
      const q = query(
        collection(db, 'inbox', user.uid, 'notifications'),
        where('read', '==', false),
        where('type', 'in', ['new_message', 'friend_request'])
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
    window.location.assign('/login');
  };

  const handleStatusChange = (status: UserStatus) => {
    startTransition(async () => {
      await updateUserPresence(status);
    });
  };

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };
  
  const isModOrAdmin = claims?.role === 'moderator' || claims?.role === 'admin';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 pt-6 mb-4">
          <Link href="/dashboard" className="flex justify-center">
            <Image src={ScrimlyLogo} alt="Scrimly Logo" width={40} height={40} />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="gap-4">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/profile')}
                tooltip={t('Sidebar.profile')}
                size="lg"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>{t('Sidebar.profile')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {userProfile?.teamId && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/teams')}
                  tooltip={t('Sidebar.my_team')}
                  size="lg"
                >
                  <Link href="/teams">
                    <Swords />
                    <span>{t('Sidebar.my_team')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/dashboard')}
                tooltip={t('Sidebar.market')}
                size="lg"
              >
                <Link href="/dashboard">
                  <Store />
                  <span>{t('Sidebar.market')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/rooms')}
                tooltip={t('Sidebar.rooms')}
                size="lg"
              >
                <Link href="/rooms">
                  <Dices />
                  <span>{t('Sidebar.rooms')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/scrims')}
                tooltip={t('Sidebar.scrims')}
                size="lg"
              >
                <Link href="/scrims">
                  <Flame />
                  <span>{t('Sidebar.scrims')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/tournaments')}
                tooltip={t('Sidebar.tournaments')}
                size="lg"
              >
                <Link href="/tournaments">
                  <Trophy />
                  <span>{t('Sidebar.tournaments')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/messages')}
                tooltip={t('Sidebar.friends')}
                 size="lg"
              >
                <Link href="/messages">
                  <Users />
                  <span>{t('Sidebar.friends')}</span>
                </Link>
              </SidebarMenuButton>
              {unreadFriendActivity > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuItem>
            
            {claims?.role === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/admin')}
                  tooltip={t('Sidebar.admin_panel')}
                   size="lg"
                >
                  <Link href="/admin">
                    <Shield />
                    <span>{t('Sidebar.admin_panel')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {isModOrAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/moderator')}
                  tooltip={t('Sidebar.mod_panel')}
                   size="lg"
                >
                  <Link href="/moderator">
                    <Gavel />
                    <span>{t('Sidebar.mod_panel')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip={t('Sidebar.logout')} size="lg">
                <LogOut />
                <span>{t('Sidebar.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="relative flex h-16 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <Button variant="secondary" asChild>
                <Link href="/rankings">
                    <Medal className="mr-2 h-4 w-4" />
                    {t('Sidebar.rankings')}
                </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <InboxIcon />
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={userProfile?.avatarUrl}
                        alt={userProfile?.name}
                        data-ai-hint="male avatar"
                      />
                      <AvatarFallback>
                        {userProfile?.name?.charAt(0) || user?.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                     <span className={cn(
                        "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background",
                        userProfile?.status === 'available' && 'bg-green-500',
                        userProfile?.status === 'busy' && 'bg-red-500',
                        userProfile?.status === 'away' && 'bg-yellow-400',
                        !userProfile?.status && 'bg-gray-400'
                    )} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{userProfile?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t('Status.title')}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handleStatusChange('available')} disabled={isPending}>
                        <Circle className="mr-2 h-4 w-4 text-green-500 fill-green-500" />
                        <span>{t('Status.available')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleStatusChange('busy')} disabled={isPending}>
                        <Circle className="mr-2 h-4 w-4 text-red-500 fill-red-500" />
                        <span>{t('Status.busy')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleStatusChange('away')} disabled={isPending}>
                        <Circle className="mr-2 h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{t('Status.away')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('Sidebar.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

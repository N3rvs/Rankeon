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
  Dices,
  Users,
  Store,
  Swords,
  Trophy,
  Shield,
  Gavel,
} from 'lucide-react';
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, loading, claims } = useAuth();
  const [unreadFriendActivity, setUnreadFriendActivity] = useState(0);
  const { t } = useI18n();

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

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };
  
  const isModOrAdmin = claims?.role === 'moderator' || claims?.role === 'admin';

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
                tooltip={t('Sidebar.profile')}
                size="lg"
              >
                <Link href="/profile">
                  <UserCircle />
                  <span>{t('Sidebar.profile')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
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
        <header className="flex h-16 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
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

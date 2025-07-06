import {
  createLocalizedPathnamesNavigation,
  Pathnames
} from 'next-intl/navigation';
import { locales } from './i18n';

// The re-export is no longer necessary here and was causing issues.
// We import `locales` directly from i18n.ts where needed.

export const pathnames = {
  '/': '/',
  '/login': '/login',
  '/register': '/register',
  '/dashboard': '/dashboard',
  '/profile': '/profile',
  '/teams': '/teams',
  '/teams/[id]': '/teams/[id]',
  '/users/[id]': '/users/[id]',
  '/messages': '/messages',
  '/messages/[chatId]': '/messages/[chatId]',
  '/rooms': '/rooms',
  '/rooms/[id]': '/rooms/[id]',
  '/tournaments': '/tournaments',
  '/tournaments/[id]': '/tournaments/[id]',
  '/admin': '/admin',
  '/admin/users': '/admin/users',
  '/admin/teams': '/admin/teams',
  '/admin/dashboard': '/admin/dashboard',
  '/admin/settings': '/admin/settings',
  '/moderator': '/moderator',
  '/moderator/users': '/moderator/users',
  '/moderator/tournaments': '/moderator/tournaments',
  '/moderator/tickets': '/moderator/tickets',
  '/moderator/chats': '/moderator/chats',
} satisfies Pathnames<typeof locales>;

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({
    locales,
    pathnames
  });

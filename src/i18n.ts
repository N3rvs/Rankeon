import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type {Pathnames} from 'next-intl/navigation';

export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export const defaultLocale = 'es' as const;

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


export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
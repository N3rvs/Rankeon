import NextLink from 'next/link';
import { redirect, usePathname, useRouter } from 'next/navigation';

// Re-export the standard Next.js navigation hooks to replace the next-intl versions.
// This avoids having to refactor all the imports throughout the application after removing next-intl.
export const Link = NextLink;
export { redirect, usePathname, useRouter };

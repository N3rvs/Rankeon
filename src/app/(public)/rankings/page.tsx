// This page is intentionally deactivated to resolve a routing conflict.
// The active route is handled by the corresponding page in the /app/(app) directory.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deactivated',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

// Intentionally not exporting a default component
// to prevent Next.js from rendering this as a page.

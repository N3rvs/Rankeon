import type { Metadata } from 'next';
import { SupportPageClient } from './support-page-client';

export const metadata: Metadata = {
  title: 'Support',
};

export default function SupportPage() {
  return <SupportPageClient />;
}

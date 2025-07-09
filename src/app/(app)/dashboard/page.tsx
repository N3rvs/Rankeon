import type { Metadata } from 'next';
import { DashboardPageClient } from './dashboard-client';

export const metadata: Metadata = {
  title: 'Market',
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}

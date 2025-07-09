import { LandingPage } from '@/components/marketing/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
};

export default function Home() {
  return <LandingPage />;
}

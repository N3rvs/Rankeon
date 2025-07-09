import type { Metadata } from 'next';
import { ProfilePageClient } from './profile-client';

export const metadata: Metadata = {
  title: 'My Profile',
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}

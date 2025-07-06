
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { HonorsSection } from '@/components/profile/honors-section';
import { UserProfileCard } from '@/components/profile/user-profile-card';
import { PerformanceAnalysisCard } from '@/components/profile/performance-analysis-card';
import { RecentMatchesCard } from '@/components/profile/recent-matches-card';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <UserProfileCard userProfile={userProfile} />
        <HonorsSection targetUser={userProfile} />
      </div>
      {/* Right Column */}
      <div className="lg:col-span-3 space-y-6">
        <PerformanceAnalysisCard />
        <RecentMatchesCard />
      </div>
    </div>
  );
}

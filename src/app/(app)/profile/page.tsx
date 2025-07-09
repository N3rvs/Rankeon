'use client';

import { useAuth } from '@/contexts/auth-context';
import { HonorsSection } from '@/components/profile/honors-section';
import { UserProfileCard } from '@/components/profile/user-profile-card';
import { TeamInfoCard } from '@/components/profile/team-info-card';
import { PerformanceAnalysisCard } from '@/components/profile/performance-analysis-card';
import { RecentMatchesCard } from '@/components/profile/recent-matches-card';
import { Spinner } from '@/components/ui/spinner';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <UserProfileCard userProfile={userProfile} />
        {userProfile.teamId && <TeamInfoCard teamId={userProfile.teamId} />}
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

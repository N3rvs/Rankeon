'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, TeamMember } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { MemberActions } from './member-actions';

interface EnrichedTeamMember extends UserProfile {
  role: TeamMember['role'];
  joinedAt: any;
}

interface TeamMembersTableProps {
  members: EnrichedTeamMember[];
  currentMemberRole?: TeamMember['role'];
  teamId: string;
}

export function TeamMembersTable({ members, currentMemberRole, teamId }: TeamMembersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length > 0 ? (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="player avatar" />
                      <AvatarFallback>{member.name?.slice(0, 2) || member.email?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === 'founder' ? 'default' : 'secondary'} className="capitalize">{member.role}</Badge>
                </TableCell>
                <TableCell>
                  {member.joinedAt ? formatDistanceToNow(member.joinedAt.toDate(), { addSuffix: true }) : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  {currentMemberRole && <MemberActions member={member} currentMemberRole={currentMemberRole} teamId={teamId} />}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                This team has no members yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

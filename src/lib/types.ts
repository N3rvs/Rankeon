// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  role: UserRole;
  games: string[];
  skills: string[];
  bio: string;
  lookingForTeam: boolean;
  country?: string;
  disabled?: boolean;
  createdAt?: Timestamp;
  blocked?: string[]; // Array of user IDs
  friends?: string[]; // Array of friend UIDs
  isCertifiedStreamer?: boolean;
  teamId?: string | null;
  banUntil?: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  game: string;
  avatarUrl: string;
  bannerUrl: string;
  videoUrl?: string;
  discordUrl?: string;
  twitchUrl?: string;
  twitterUrl?: string;
  founder: string; // UID of the founder
  memberIds: string[]; // UIDs of all members
  lookingForPlayers: boolean;
  recruitingRoles?: string[];
  description: string;
  createdAt: Timestamp;
}

export interface TeamMember {
  role: 'founder' | 'coach' | 'member';
  joinedAt: Timestamp;
  name: string;
  avatarUrl: string;
  id: string;
  isIGL?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: Timestamp;
}

export interface Chat {
  id:string;
  members: string[]; // [uid1, uid2] sorted
  lastMessageAt?: Timestamp | null;
  lastMessage?: {
    content: string;
    sender: string;
  };
}

export type NotificationType =
  | 'new_message'
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_removed';

export interface Notification {
  id: string;
  type: NotificationType;
  from: string; // UID of the user who sent it
  read: boolean;
  timestamp: Timestamp;
  content?: string; // For new_message, etc.
  extraData?: { [key: string]: any }; // For IDs like requestId, teamId, chatId
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

export interface GameRoom {
  id:string;
  name: string;
  game: string;
  server?: string;
  createdBy: string; // UID of creator
  createdAt: Timestamp;
  discordChannelId?: string | null;
  rank?: string;
  partySize?: string;
  participants: string[]; // Array of UIDs of participants
  lastMessageAt?: Timestamp;
}

export interface TournamentProposal {
  id: string;
  proposerUid: string;
  proposerName: string;
  tournamentName: string;
  game: string;
  description: string;
  proposedDate: Timestamp;
  format: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  reviewedBy?: string; // UID of admin/mod who reviewed
  reviewedAt?: Timestamp;
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  description: string;
  startDate: Timestamp;
  format: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  organizer: {
    uid: string;
    name: string;
  };
  createdAt: Timestamp;
  proposalId: string;
  bracket?: Bracket | null;
}

// Types for Tournament Bracket
export interface MatchTeam {
  id: string;
  name: string;
  avatarUrl?: string;
  score?: number;
}

export interface Match {
  id: string;
  team1: MatchTeam;
  team2: MatchTeam;
  winnerId?: string | null;
}

export interface Round {
  id: string;
  name: string;
  matches: Match[];
}

export interface Bracket {
  rounds: Round[];
}

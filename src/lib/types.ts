// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'moderator' | 'founder' | 'coach' | 'player';

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
}

export interface Team {
  id:string;
  name: string;
  avatarUrl: string;
  bannerUrl: string;
  game: string;
  founder: string;
  memberIds: string[];
  lookingForPlayers: boolean;
  recruitingRoles: string[];
  description: string;
  createdAt?: Timestamp;
}

export interface TeamMember {
  role: 'founder' | 'coach' | 'member';
  joinedAt: Timestamp;
}

export interface Scrim {
  id: string;
  teamAId: string;
  teamBId?: string;
  teamAName: string; // Denormalized for easy display
  teamAAvatarUrl: string; // Denormalized for easy display
  date: Timestamp;
  format: 'bo1' | 'bo3' | 'bo5';
  type: 'scrim' | 'tryout';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Timestamp;
  winnerTeamId?: string;
  chatId?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
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
  | 'friend_removed'
  | 'team_invite_received'
  | 'team_joined'
  | 'team_left'
  | 'team_kicked';

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
  id: string;
  name: string;
  game: string;
  server?: string;
  createdBy: string; // UID of creator
  createdAt: Timestamp;
  discordChannelId?: string | null;
  rank?: string;
  partySize?: string;
  participants: string[]; // Array of UIDs of participants
}

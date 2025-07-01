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
  friends?: string[]; // Array of user IDs
}

export interface Team {
  id:string;
  name: string;
  avatarUrl: string;
  game: string;
  ownerId: string;
  members: UserProfile[];
  lookingForPlayers: boolean;
  recruitingRoles: string[];
  description: string;
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
  createdAt: Timestamp;
  lastMessage?: {
    content: string;
    createdAt: Timestamp;
    sender: string;
  }
}

export type NotificationType =
  | 'new_message'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'friend_removed'
  | 'team_invite_received'
  | 'team_joined'
  | 'team_left'
  | 'team_kicked';

export interface Notification {
  id: string;
  userId: string; // The user who this notification is for
  type: NotificationType;
  message: string;
  fromUser?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  relatedRequestId?: string; // e.g., friend_request id
  read: boolean;
  createdAt: Timestamp;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

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

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: {
    [uid: string]: {
      name: string;
      avatarUrl: string;
    };
  };
  lastMessage: {
    id: string;
    text: string;
    timestamp: Timestamp;
    senderId: string;
  } | null;
}

export type NotificationType =
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
  fromId: string;
  fromName: string;
  fromAvatarUrl: string;
  toId: string;
  participantIds: string[]; // [fromId, toId] sorted
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

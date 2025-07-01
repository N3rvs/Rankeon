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
}

export interface Team {
  id: string;
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
        }
    };
    lastMessage: {
        text: string;
        timestamp: Timestamp;
        senderId: string;
    } | null;
}
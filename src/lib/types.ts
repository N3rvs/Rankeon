import { Timestamp } from 'firebase/firestore';

// Base Document Types from Firestore

export interface UserDoc {
  uid: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  avatarUrl?: string;
  country?: string;
  region?: string;
  rank?: number;
  gameRoles?: string[];
  role?: 'player'|'founder'|'coach'|'moderator'|'admin';
  isCertifiedStreamer?: boolean;
  disabled?: boolean;
  banUntil?: Timestamp | null;
  createdAt: Timestamp;
  _claimsRefreshedAt?: Timestamp;
  isLookingForTeam?: boolean;
  status?: 'available' | 'busy' | 'away' | 'offline';
  lastSeen?: Timestamp;
  teamId?: string | null;
  honorCounts?: { [key: string]: number };
  blocked?: string[];
  friends?: string[];
  skills?: string[]; // Added from edit-profile-form
}

export interface NotificationDoc {
  id?: string;
  to: string;
  from: string;
  type: string;
  extraData?: Record<string, string>;
  read: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
  timestamp?: Timestamp; // From old inbox component
  // This is a client-side addition for rendering, not in DB schema
  fromUser?: {
    name: string;
    avatarUrl: string;
  }
}

export interface RoomDoc {
  id?: string;
  name: string;
  game: string;
  server: string;
  rank: string;
  capacity: number;
  ownerId: string;
  members: string[];
  closed: boolean;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // From room card
}

export interface RoomMessageDoc {
  id?: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
  sender?: string; // From room chat
}

export interface TicketDoc {
  id?: string;
  ownerId: string;
  subject: string;
  description: string;
  status: 'open'|'resolved';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessageBy: string;
  // Client-side additions
  userName?: string;
  userEmail?: string;
}

export interface TicketMessageDoc {
  id?: string;
  authorId: string;
  authorRole: 'user'|'staff';
  content: string;
  createdAt: Timestamp;
  // Client-side additions
  senderName: string;
  senderId: string;
}

export interface TaskDoc {
  id?: string;
  owner: string;
  title: string;
  status: 'todo'|'doing'|'done'|'archived';
  priority: 'low'|'normal'|'high';
  tags: string[];
  due?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubtaskDoc {
  id?: string;
  title: string;
  done: boolean;
  createdAt: Timestamp;
}

export interface ScrimDoc {
  id?: string;
  teamId: string; // The creating team (Team A)
  teamName: string;
  teamAAvatarUrl?: string;
  game: string;
  rank?: string;
  server?: string;
  status: 'open'|'challenged'|'accepted'|'cancelled' | 'confirmed' | 'completed';
  challengerTeamId?: string | null;
  challengerTeamName?: string | null;
  challengerAvatarUrl?: string | null;
  winnerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  date: Timestamp;
  format: 'bo1' | 'bo3' | 'bo5';
  type: 'scrim' | 'tryout';
  notes?: string;
  rankMin?: string;
  rankMax?: string;
  country?: string;
  teamAId?: string; // Should be same as teamId
  teamBId?: string | null;
  teamBName?: string | null;
  teamBAvatarUrl?: string | null;
  challengerId?: string; // user who challenged
  participantIds?: string[];
}


export interface TournamentDoc {
  id: string;
  name: string;
  game: string;
  description: string;
  format: 'single-elimination'|'round-robin' | 'double-elim' | 'swiss';
  maxTeams: number;
  registeredTeamsCount: number;
  rankMin?: string | null;
  rankMax?: string | null;
  startsAt: Timestamp;
  winnerId?: string | null;
  status: 'upcoming'|'ongoing'|'completed';
  createdAt: Timestamp;
  proposalId?: string;
  organizer: { uid: string, name: string };
  participants?: MatchTeam[];
  prize?: number;
  currency?: string;
  country?: string;
  startDate: Timestamp;
  bracket?: Bracket;
}

export interface RegisteredTeam {
  teamId: string;
  teamName: string;
  teamAvatarUrl?: string | null;
  registeredAt: Timestamp;
}

export type MatchStatus = 'pending'|'awaiting_opponent'|'locked'|'completed';

export interface BracketMatch {
  id: string;
  round: number;
  team1: MatchTeam | null;
  team2: MatchTeam | null;
  teamA?: MatchTeam | null; // Alias for team1
  teamB?: MatchTeam | null; // Alias for team2
  nextMatchId?: string | null;
  status: MatchStatus;
  winnerId?: string | null;
}

export interface RRSchedule {
  id?: string;
  teamA: { id: string; name: string; avatarUrl?: string | null };
  teamB: { id: string; name: string; avatarUrl?: string | null };
  status: 'pending'|'completed';
  winnerId?: string | null;
}

export interface RRStanding {
  id?: string;
  teamId: string;
  teamName: string;
  teamAvatarUrl?: string | null;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}


export interface TeamDoc {
  id: string;
  name: string;
  game?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ownerId: string; // founder/coach
  isRecruiting?: boolean;
  lookingForPlayers?: boolean;
  recruitingRoles?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  description?: string;
  rankMin?: string;
  rankMax?: string;
  country?: string;
  videoUrl?: string;
  discordUrl?: string;
  twitchUrl?: string;
  twitterUrl?: string;
  stats?: {
    scrimsPlayed: number;
    scrimsWon: number;
  };
  members: Record<string, Omit<TeamMemberDoc, 'uid'>>;
  primaryGame?: string;
}

export interface TeamMemberDoc {
  uid: string;
  id: string;
  role: 'founder'|'coach'|'player'|'member';
  gameRoles?: string[];
  joinedAt: Timestamp;
  isIGL?: boolean;
  // Denormalized from user doc for easy access
  name: string;
  avatarUrl: string;
  isCertifiedStreamer?: boolean;
  skills?: string[];
}

export interface FriendRequestDoc {
  id?: string;
  from: string;
  to: string;
  status: 'PENDING'|'ACCEPTED'|'REJECTED'|'CANCELLED'|'REMOVED';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface FriendshipDoc {
  id?: string;
  users: [string, string];
  since: Timestamp;
}

export interface BlockDoc {
  by: string;
  target: string;
  createdAt: Timestamp;
}

export interface ChatDoc {
  id?: string;
  type: 'dm'|'group';
  members: string[];
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessageText?: string | null;
  unread?: Record<string, number>;
  lastReadAt?: Record<string, Timestamp>;
}

export interface ChatMessageDoc {
  id?: string;
  from: string;
  sender?: string;
  to?: string;
  text: string;
  content: string;
  createdAt: Timestamp;
  senderId?: string;
}

export interface HonorDoc {
  id?: string;
  from: string;
  to: string;
  type: string;
  reason?: string | null;
  createdAt: Timestamp;
}

export interface HonorStatsDoc {
  uid: string;
  total: number;
  updatedAt: Timestamp;
}

export interface TournamentProposal {
    id: string;
    tournamentName: string;
    proposerName: string;
    game: string;
    format: 'single-elim' | 'double-elim' | 'round-robin' | 'swiss';
    description: string;
    proposedDate: Timestamp;
}

// UI Types (using UserDoc as the base for UserProfile)
export type UserProfile = UserDoc;
export type Team = TeamDoc;
export type TeamMember = TeamMemberDoc;
export type Scrim = ScrimDoc;
export type Tournament = TournamentDoc;
export type Notification = NotificationDoc;
export type Chat = ChatDoc;
export type ChatMessage = ChatMessageDoc;
export type SupportTicket = TicketDoc;
export type TicketMessage = TicketMessageDoc;

// Types for Tournament Bracket
export interface MatchTeam {
  id: string;
  name: string;
  avatarUrl?: string;
  score?: number;
}

export interface Match extends BracketMatch {}

export interface Round {
  id: string;
  name: string;
  matches: Match[];
}

export interface Bracket {
  rounds: Round[];
}

// Re-export for compatibility where needed
export type GameRoom = RoomDoc;
export type Task = TaskDoc;
export type Subtask = SubtaskDoc;
export type FriendRequest = FriendRequestDoc;
export type TeamApplication = {
    id: string;
    teamId: string;
    applicantId: string;
    applicantName: string;
    applicantAvatarUrl: string;
    message?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    createdAt: Timestamp;
};


// To keep old code working temporarily
export type UserStatus = 'available' | 'busy' | 'away' | 'offline';
export type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';

export type ScrimUI = ReplaceTimestampsWithDates<Scrim>;
export type TournamentUI = ReplaceTimestampsWithDates<Tournament>;


// src/lib/time-types.ts
import { Timestamp as FirestoreTimestamp } from 'firebase/firestore';

/** Reemplaza recursivamente Firestore Timestamp -> JS Date */
export type ReplaceTimestampsWithDates<T> =
  T extends FirestoreTimestamp ? Date
  : T extends (infer U)[] ? ReplaceTimestampsWithDates<U>[]
  : T extends object ? { [K in keyof T]: ReplaceTimestampsWithDates<T[K]> }
  : T;

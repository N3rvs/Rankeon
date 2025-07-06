import type { UserProfile, Team, Conversation, Bracket } from './types';

export const mockCurrentUser: UserProfile = {
  id: 'user-0',
  name: 'CyberRonin',
  avatarUrl: 'https://placehold.co/100x100.png',
  email: 'ronin@squadup.com',
  role: 'founder',
  primaryGame: 'Valorant',
  skills: ['Duelist', 'IGL'],
  bio: 'Seasoned FPS player looking for a competitive Valorant team. I main Jett and can also IGL. Let\'s climb the ranks!',
  lookingForTeam: true,
};

export const mockUsers: UserProfile[] = [
  mockCurrentUser,
  {
    id: 'user-1',
    name: 'GlitchQueen',
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'player',
    primaryGame: 'Valorant',
    skills: ['Support', 'Tank'],
    bio: 'Flex support player, can play Ana, Kiriko, and Mercy. Looking for a consistent team for competitive play.',
    lookingForTeam: true,
    email: 'glitch@squadup.com',
  },
  {
    id: 'user-2',
    name: 'ShadowStrike',
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'player',
    primaryGame: 'Valorant',
    skills: ['Jungle', 'Mid Lane'],
    bio: 'Diamond jungler looking for a serious team to compete in local tournaments. Large champion pool.',
    lookingForTeam: true,
    email: 'shadow@squadup.com',
  },
];

export const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Atomic Esports',
    avatarUrl: 'https://placehold.co/100x100.png',
    game: 'Valorant',
    founder: 'user-3',
    memberIds: [],
    lookingForPlayers: true,
    recruitingRoles: ['Controller', 'Sentinel'],
    description: 'Atomic Esports is a new org looking to build a top-tier Valorant roster. We provide coaching and a structured practice schedule. Looking for dedicated players in the Ascendant+ range.',
    bannerUrl: 'https://placehold.co/1200x400.png',
    createdAt: new Date() as any,
  },
  {
    id: 'team-2',
    name: 'Mythic Gaming',
    avatarUrl: 'https://placehold.co/100x100.png',
    game: 'Apex Legends',
    founder: 'user-4',
    memberIds: [],
    lookingForPlayers: true,
    recruitingRoles: ['Fragger', 'Support'],
    description: 'Competitive Apex Legends team looking for one more to complete our roster for ALGS qualifiers. Must be Master/Pred ranked.',
    bannerUrl: 'https://placehold.co/1200x400.png',
    createdAt: new Date() as any,
  },
];

export const mockUserTeams: Team[] = [
    {
        id: 'team-3',
        name: 'Ronin\'s Rascals',
        avatarUrl: 'https://placehold.co/100x100.png',
        game: 'Valorant',
        founder: 'user-0',
        memberIds: ['user-0', 'user-1', 'user-2'],
        lookingForPlayers: false,
        recruitingRoles: [],
        description: 'My personal team for climbing the ranks.',
        bannerUrl: 'https://placehold.co/1200x400.png',
        createdAt: new Date() as any,
    }
]

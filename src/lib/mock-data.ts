import type { UserProfile, Team, Conversation, Bracket } from './types';

export const mockCurrentUser: UserProfile = {
  id: 'user-0',
  name: 'CyberRonin',
  avatarUrl: 'https://placehold.co/100x100.png',
  email: 'ronin@squadup.com',
  role: 'founder',
  games: ['Valorant', 'Apex Legends'],
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
    games: ['Overwatch 2', 'Apex Legends'],
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
    games: ['League of Legends'],
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

const bracketTeams = [
    { id: 't1', name: 'Cosmic Rays', avatarUrl: 'https://placehold.co/40x40.png?text=CR' },
    { id: 't2', name: 'Nebula Nova', avatarUrl: 'https://placehold.co/40x40.png?text=NN' },
    { id: 't3', name: 'Vortex Vipers', avatarUrl: 'https://placehold.co/40x40.png?text=VV' },
    { id: 't4', name: 'Solar Phoenix', avatarUrl: 'https://placehold.co/40x40.png?text=SP' },
    { id: 't5', name: 'Galaxy Gliders', avatarUrl: 'https://placehold.co/40x40.png?text=GG' },
    { id: 't6', name: 'Orion Order', avatarUrl: 'https://placehold.co/40x40.png?text=OO' },
    { id: 't7', name: 'Pulsar Power', avatarUrl: 'https://placehold.co/40x40.png?text=PP' },
    { id: 't8', name: 'Quasar Quest', avatarUrl: 'https://placehold.co/40x40.png?text=QQ' },
];

export const mockBracket: Bracket = {
  rounds: [
    {
      id: 'round-1',
      name: 'Quarterfinals',
      matches: [
        { id: 'qf-1', team1: { ...bracketTeams[0], score: 2 }, team2: { ...bracketTeams[1], score: 1 }, winnerId: 't1' },
        { id: 'qf-2', team1: { ...bracketTeams[2], score: 0 }, team2: { ...bracketTeams[3], score: 2 }, winnerId: 't4' },
        { id: 'qf-3', team1: { ...bracketTeams[4], score: 2 }, team2: { ...bracketTeams[5], score: 0 }, winnerId: 't5' },
        { id: 'qf-4', team1: { ...bracketTeams[6], score: 1 }, team2: { ...bracketTeams[7], score: 2 }, winnerId: 't8' },
      ],
    },
    {
      id: 'round-2',
      name: 'Semifinals',
      matches: [
        { id: 'sf-1', team1: { ...bracketTeams[0], score: 2 }, team2: { ...bracketTeams[3], score: 1 }, winnerId: 't1' },
        { id: 'sf-2', team1: { ...bracketTeams[4], score: 2 }, team2: { ...bracketTeams[7], score: 0 }, winnerId: 't5' },
      ],
    },
    {
      id: 'round-3',
      name: 'Finals',
      matches: [
        { id: 'f-1', team1: { ...bracketTeams[0], score: 1 }, team2: { ...bracketTeams[4], score: 3 }, winnerId: 't5' },
      ],
    },
     {
      id: 'round-4',
      name: 'Winner',
      matches: [
        { id: 'w-1', team1: { ...bracketTeams[4], score: 0 }, team2: { name: 'Winner!', id: 'winner-id', score: 0 }, winnerId: 't5' },
      ],
    },
  ],
};

import type { UserProfile, Team, Conversation } from './types';

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
    ownerId: 'user-3',
    members: [],
    lookingForPlayers: true,
    recruitingRoles: ['Controller', 'Sentinel'],
    description: 'Atomic Esports is a new org looking to build a top-tier Valorant roster. We provide coaching and a structured practice schedule. Looking for dedicated players in the Ascendant+ range.',
  },
  {
    id: 'team-2',
    name: 'Mythic Gaming',
    avatarUrl: 'https://placehold.co/100x100.png',
    game: 'Apex Legends',
    ownerId: 'user-4',
    members: [],
    lookingForPlayers: true,
    recruitingRoles: ['Fragger', 'Support'],
    description: 'Competitive Apex Legends team looking for one more to complete our roster for ALGS qualifiers. Must be Master/Pred ranked.',
  },
];

export const mockUserTeams: Team[] = [
    {
        id: 'team-3',
        name: 'Ronin\'s Rascals',
        avatarUrl: 'https://placehold.co/100x100.png',
        game: 'Valorant',
        ownerId: 'user-0',
        members: mockUsers.slice(0, 2),
        lookingForPlayers: false,
        recruitingRoles: [],
        description: 'My personal team for climbing the ranks.'
    }
]

export const mockConversations: Conversation[] = [
    {
        id: 'convo-1',
        participant: {
            id: 'user-1',
            name: 'GlitchQueen',
            avatarUrl: 'https://placehold.co/100x100.png',
            email: 'glitch@squadup.com',
            role: 'player',
            games: [],
            skills: [],
            bio: '',
            lookingForTeam: false,
        },
        lastMessage: {
            id: 'msg-1',
            senderId: 'user-1',
            text: 'Hey, saw your profile. Are you still looking for a team?',
            timestamp: Date.now() - 1000 * 60 * 5,
        }
    },
    {
        id: 'convo-2',
        participant: {
            id: 'team-1-rep',
            name: 'Atomic Esports Manager',
            avatarUrl: 'https://placehold.co/100x100.png',
            email: 'manager@atomic.com',
            role: 'coach',
            games: [],
            skills: [],
            bio: '',
            lookingForTeam: false,
        },
        lastMessage: {
            id: 'msg-2',
            senderId: 'user-0',
            text: 'I\'m interested in the Controller role you have open.',
            timestamp: Date.now() - 1000 * 60 * 60 * 2,
        }
    }
]

// src/lib/actions/public.ts
'use client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, Team, Tournament } from '../types';

const functions = getFunctions(app);

// Market Data
type PlayerDataResponse = { success: boolean; data?: UserProfile[]; message: string; }
type TeamDataResponse = { success: boolean; data?: Team[]; message: string; }

export async function getMarketPlayers(): Promise<PlayerDataResponse> {
  try {
    const getPlayersFunc = httpsCallable<void, UserProfile[]>(functions, 'getMarketPlayers');
    const result = await getPlayersFunc();
    return { success: true, data: result.data, message: 'Players fetched.' };
  } catch (error: any) {
    console.error('Error fetching market players:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getMarketTeams(): Promise<TeamDataResponse> {
  try {
    const getTeamsFunc = httpsCallable<void, any[]>(functions, 'getMarketTeams');
    const result = await getTeamsFunc();
    // Re-hydrate Firestore Timestamps
    const teams = result.data.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt),
    }))
    return { success: true, data: teams, message: 'Teams fetched.' };
  } catch (error: any) {
    console.error('Error fetching market teams:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

// Rankings Data
type HonorRankingPlayer = Pick<UserProfile, 'id' | 'name' | 'avatarUrl'> & { totalHonors: number };
type HonorRankingResponse = { success: boolean; data?: HonorRankingPlayer[]; message: string; }
type ScrimRankingTeam = Team & { winRate: number; played: number; };
type ScrimRankingResponse = { success: boolean; data?: ScrimRankingTeam[]; message: string; }
type TournamentRankingResponse = { success: boolean; data?: Tournament[]; message: string; }

export async function getHonorRankings(): Promise<HonorRankingResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, HonorRankingPlayer[]>(functions, 'getHonorRankings');
    const result = await getRankingsFunc();
    return { success: true, data: result.data, message: 'Rankings fetched.' };
  } catch (error: any) {
    console.error('Error fetching honor rankings:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getScrimRankings(): Promise<ScrimRankingResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, any[]>(functions, 'getScrimRankings');
    const result = await getRankingsFunc();
    const teams = result.data.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt),
    }))
    return { success: true, data: teams, message: 'Rankings fetched.' };
  } catch (error: any) {
    console.error('Error fetching scrim rankings:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getTournamentRankings(): Promise<TournamentRankingResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, any[]>(functions, 'getTournamentRankings');
    const result = await getRankingsFunc();
     const tournaments = result.data.map(t => ({
        ...t,
        startDate: new Date(t.startDate),
        createdAt: new Date(t.createdAt),
    }))
    return { success: true, data: tournaments, message: 'Rankings fetched.' };
  } catch (error: any) {
    console.error('Error fetching tournament rankings:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

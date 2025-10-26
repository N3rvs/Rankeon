
'use client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, Team, Tournament, Scrim } from '../types';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';
import { Timestamp } from 'firebase/firestore';

const functions = getFunctions(app, "europe-west1");

// --- TIPOS DE RESPUESTA PAGINADA ---
type PaginatedResponse<T> = {
    items: T[];
    nextLastId: string | null;
};

// --- Tipos específicos ---
type PlayersResponse = {
    players: UserProfile[];
    nextLastId: string | null;
}
type TeamsResponse = {
    teams: Team[];
    nextLastId: string | null;
}

type PaginatedScrimsResponse = { success: boolean; data?: Scrim[]; message: string; } 
type PaginatedHonorRankingsResponse = { success: boolean; data?: HonorRankingPlayer[]; message: string; };
type PaginatedScrimRankingsResponse = { success: boolean; data?: ScrimRankingTeam[]; message: string; };
type PaginatedTournamentRankingsResponse = { success: boolean; data?: Tournament[]; message: string; };

// --- Tipos de datos para Rankings ---
type HonorRankingPlayer = Pick<UserProfile, 'id' | 'name' | 'avatarUrl' | 'isCertifiedStreamer'> & { totalHonors: number };
type ScrimRankingTeam = Team & { winRate: number; played: number; won: number };

// --- ACCIONES ACTUALIZADAS ---

export async function getMarketPlayers(): Promise<{ success: boolean; data?: UserProfile[]; message: string }> {
  try {
    const getPlayersFunc = httpsCallable<void, { players: any[], nextLastId: string | null }>(functions, 'getMarketPlayers');
    const result = await getPlayersFunc();
    const players = result.data.players.map(p => ({ ...p, createdAt: p.createdAt ? Timestamp.fromDate(new Date(p.createdAt)) : undefined }))
    return { success: true, data: players as UserProfile[], message: 'Players fetched.' };
  } catch (error: any) {
    console.error('Error fetching market players:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/users', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getMarketTeams(): Promise<{ success: boolean; data?: Team[]; message: string }> {
  try {
    const getTeamsFunc = httpsCallable<void, { teams: any[], nextLastId: string | null }>(functions, 'getMarketTeams');
    const result = await getTeamsFunc();

    const teams = result.data.teams.map(t => ({
        ...t,
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined,
    }));

    return {
        success: true,
        data: teams as Team[],
        message: 'Equipos obtenidos.'
    };
  } catch (error: any) {
    console.error('Error fetching market teams:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/teams', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}


export async function getFeaturedScrims(): Promise<PaginatedScrimsResponse> {
  try {
    const getScrimsFunc = httpsCallable<void, any[]>(functions, 'getFeaturedScrims');
    const result = await getScrimsFunc();
    const scrims = result.data.map(s => ({
        ...s,
        date: s.date ? Timestamp.fromDate(new Date(s.date)) : undefined,
        createdAt: s.createdAt ? Timestamp.fromDate(new Date(s.createdAt)) : undefined,
    }));
    return { success: true, data: scrims as Scrim[], message: 'Scrims obtenidas.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getHonorRankings(): Promise<PaginatedHonorRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, { rankings: HonorRankingPlayer[], nextLastId: string | null }>(functions, 'getHonorRankings');
    const result = await getRankingsFunc();

    return {
        success: true,
        data: result.data.rankings,
        message: 'Rankings de honor obtenidos.'
    };
  } catch (error: any) {
    console.error('Error fetching honor rankings:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/users', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getScrimRankings(): Promise<PaginatedScrimRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, { rankings: any[], nextLastId: string | null }>(functions, 'getScrimRankings');
    const result = await getRankingsFunc();

    const teams = result.data.rankings.map(t => ({
        ...t,
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined,
    }));

    return {
        success: true,
        data: teams as ScrimRankingTeam[],
        message: 'Rankings de scrims obtenidos.'
    };
  } catch (error: any) {
    console.error('Error fetching scrim rankings:', error);
     if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/teams', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getTournamentRankings(): Promise<PaginatedTournamentRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<void, { tournaments: any[], nextLastId: string | null }>(functions, 'getTournamentRankings');
    const result = await getRankingsFunc();

     const tournaments = result.data.tournaments.map(t => ({
        ...t,
        startDate: t.startDate ? Timestamp.fromDate(new Date(t.startDate)) : undefined,
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined,
    }));

    return {
        success: true,
        data: tournaments as Tournament[],
        message: 'Rankings de torneos obtenidos.'
    };
  } catch (error: any) {
    console.error('Error fetching tournament rankings:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/tournaments', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getManagedUsers(): Promise<{ success: boolean; data?: UserProfile[]; message: string }> {
    try {
        const getManagedUsersFunc = httpsCallable<void, { users: any[] }>(functions, 'getManagedUsers');
        const result = await getManagedUsersFunc();
        const users = result.data.users.map(u => ({
            ...u,
            createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : undefined,
            banUntil: u.banUntil ? Timestamp.fromDate(new Date(u.banUntil)) : undefined,
            _claimsRefreshedAt: u._claimsRefreshedAt ? Timestamp.fromDate(new Date(u._claimsRefreshedAt)) : undefined,
        }));
        return { success: true, data: users as UserProfile[], message: 'Users fetched.' };
    } catch (error: any) {
        console.error('Error getting managed users:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

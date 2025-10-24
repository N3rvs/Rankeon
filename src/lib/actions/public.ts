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
    success: boolean;
    data?: {
        items: T[];
        nextLastId: string | null;
    };
    message: string;
}

// --- Tipos específicos ---
type PaginatedPlayersResponse = PaginatedResponse<UserProfile>;
type PaginatedTeamsResponse = PaginatedResponse<Team>;
type PaginatedScrimsResponse = { success: boolean; data?: Scrim[]; message: string; } // getFeaturedScrims no es paginada
type PaginatedHonorRankingsResponse = PaginatedResponse<HonorRankingPlayer>;
type PaginatedScrimRankingsResponse = PaginatedResponse<ScrimRankingTeam>;
type PaginatedTournamentRankingsResponse = PaginatedResponse<Tournament>;

// --- Tipos de datos para Rankings ---
type HonorRankingPlayer = Pick<UserProfile, 'id' | 'name' | 'avatarUrl' | 'isCertifiedStreamer'> & { totalHonors: number };
type ScrimRankingTeam = Team & { winRate: number; played: number; won: number }; // Añadido 'won'

// --- ACCIONES ACTUALIZADAS ---

/**
 * Obtiene jugadores del mercado de forma paginada.
 * @param lastId El ID del último jugador del lote anterior, o null para la primera página.
 */
export async function getMarketPlayers(lastId: string | null): Promise<PaginatedPlayersResponse> {
  try {
    const getPlayersFunc = httpsCallable<void, any[]>(functions, 'getMarketPlayers');
    const result = await getPlayersFunc();
    const players = result.data.map(p => ({ ...p, createdAt: Timestamp.fromDate(new Date(p.createdAt)) }))
    return { success: true, data: players, message: 'Players fetched.' };
  } catch (error: any) {
    console.error('Error fetching market players:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({ path: '/users', operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

/**
 * Obtiene equipos del mercado de forma paginada.
 * @param lastId El ID del último equipo del lote anterior, o null para la primera página.
 */
export async function getMarketTeams(lastId: string | null): Promise<PaginatedTeamsResponse> {
  try {
    const getTeamsFunc = httpsCallable<{ lastId: string | null }, { teams: any[], nextLastId: string | null }>(functions, 'getMarketTeams');
    const result = await getTeamsFunc({ lastId });

    // Rehidrata Timestamps
    const teams = result.data.teams.map(t => ({
        ...t,
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined, // Usa Timestamp
    }));

    return {
        success: true,
        data: {
            items: teams as Team[],
            nextLastId: result.data.nextLastId
        },
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

// getFeaturedScrims no necesita paginación porque ya usa limit(10) en el backend
export async function getFeaturedScrims(): Promise<PaginatedScrimsResponse> {
  try {
    const getScrimsFunc = httpsCallable<void, any[]>(functions, 'getFeaturedScrims');
    const result = await getScrimsFunc();
    // Rehidrata Timestamps
    const scrims = result.data.map(s => ({
        ...s,
        date: s.date ? Timestamp.fromDate(new Date(s.date)) : undefined, // Usa Timestamp
        createdAt: s.createdAt ? Timestamp.fromDate(new Date(s.createdAt)) : undefined, // Usa Timestamp
    }));
    return { success: true, data: scrims as Scrim[], message: 'Scrims obtenidas.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Obtiene rankings de honor de forma paginada.
 * @param lastId El ID del último jugador del lote anterior, o null para la primera página.
 */
export async function getHonorRankings(lastId: string | null): Promise<PaginatedHonorRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<{ lastId: string | null }, { rankings: HonorRankingPlayer[], nextLastId: string | null }>(functions, 'getHonorRankings');
    const result = await getRankingsFunc({ lastId });

    return {
        success: true,
        data: {
            items: result.data.rankings,
            nextLastId: result.data.nextLastId
        },
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

/**
 * Obtiene rankings de scrims de forma paginada.
 * @param lastId El ID del último equipo del lote anterior, o null para la primera página.
 */
export async function getScrimRankings(lastId: string | null): Promise<PaginatedScrimRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<{ lastId: string | null }, { rankings: any[], nextLastId: string | null }>(functions, 'getScrimRankings');
    const result = await getRankingsFunc({ lastId });

    const teams = result.data.rankings.map(t => ({
        ...t,
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined, // Usa Timestamp
    }));

    return {
        success: true,
        data: {
            items: teams as ScrimRankingTeam[],
            nextLastId: result.data.nextLastId
        },
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

/**
 * Obtiene rankings de torneos (torneos completados) de forma paginada.
 * @param lastId El ID del último torneo del lote anterior, o null para la primera página.
 */
export async function getTournamentRankings(lastId: string | null): Promise<PaginatedTournamentRankingsResponse> {
  try {
    const getRankingsFunc = httpsCallable<{ lastId: string | null }, { tournaments: any[], nextLastId: string | null }>(functions, 'getTournamentRankings');
    const result = await getRankingsFunc({ lastId });

     const tournaments = result.data.tournaments.map(t => ({
        ...t,
        startDate: t.startDate ? Timestamp.fromDate(new Date(t.startDate)) : undefined, // Usa Timestamp
        createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined, // Usa Timestamp
    }));

    return {
        success: true,
        data: {
            items: tournaments as Tournament[],
            nextLastId: result.data.nextLastId
        },
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
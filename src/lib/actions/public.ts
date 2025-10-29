// src/lib/actions/market-and-rankings.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, Team /*, Tournament, Scrim */ } from '../types';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';
import { Timestamp } from 'firebase/firestore';

const functions = getFunctions(app, 'europe-west1');

// Tipos “paginados” que usa tu UI
type HonorRankingPlayer = Pick<
  UserProfile,
  'id' | 'name' | 'avatarUrl' | 'isCertifiedStreamer'
> & { totalHonors: number };

type ApiPage<T> = { items: T[]; nextCursor: string | null };

// =======================
// EXISTENTES EN BACKEND
// =======================

export async function getMarketPlayers(): Promise<{
  success: boolean;
  data?: UserProfile[];
  nextCursor?: string | null;
  message: string;
}> {
  try {
    const fn = httpsCallable<void, ApiPage<any>>(functions, 'getMarketPlayers');
    const { data } = await fn();

    const players = data.items.map((p) => ({
      ...p,
      createdAt: p.createdAt ? Timestamp.fromDate(new Date(p.createdAt)) : undefined,
      banUntil: p.banUntil ? Timestamp.fromDate(new Date(p.banUntil)) : undefined,
      _claimsRefreshedAt: p._claimsRefreshedAt
        ? Timestamp.fromDate(new Date(p._claimsRefreshedAt))
        : undefined,
    }));

    return { success: true, data: players as UserProfile[], nextCursor: data.nextCursor, message: 'Players fetched.' };
  } catch (error: any) {
    console.error('Error fetching market players:', error);
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({ path: '/marketPlayers', operation: 'list' })
      );
    }
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getMarketTeams(): Promise<{
  success: boolean;
  data?: Team[];
  nextCursor?: string | null;
  message: string;
}> {
  try {
    const fn = httpsCallable<void, ApiPage<any>>(functions, 'getMarketTeams');
    const { data } = await fn();

    const teams = data.items.map((t) => ({
      ...t,
      createdAt: t.createdAt ? Timestamp.fromDate(new Date(t.createdAt)) : undefined,
    }));

    return { success: true, data: teams as Team[], nextCursor: data.nextCursor, message: 'Teams fetched.' };
  } catch (error: any) {
    console.error('Error fetching market teams:', error);
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({ path: '/marketTeams', operation: 'list' })
      );
    }
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getHonorRankings(): Promise<{
  success: boolean;
  data?: HonorRankingPlayer[];
  nextCursor?: string | null;
  message: string;
}> {
  try {
    const fn = httpsCallable<void, ApiPage<HonorRankingPlayer>>(functions, 'getHonorRankings');
    const { data } = await fn();
    return { success: true, data: data.items, nextCursor: data.nextCursor, message: 'Honor rankings fetched.' };
  } catch (error: any) {
    console.error('Error fetching honor rankings:', error);
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({ path: '/honorsAgg', operation: 'list' })
      );
    }
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

// ===================================
// ENDPOINTS ELIMINADOS EN EL BACKEND
// ===================================
// Si siguen referenciados en la UI, reemplázalos por llamadas reales existentes,
// o muestra una pantalla vacía con CTA. Mientras tanto devolvemos un mensaje claro.

export async function getFeaturedScrims() {
  return { success: false, message: 'getFeaturedScrims is not available on the server.' };
}

export async function getScrimRankings() {
  return { success: false, message: 'getScrimRankings is not available on the server.' };
}

export async function getTournamentRankings() {
  return { success: false, message: 'getTournamentRankings is not available on the server.' };
}

export async function getManagedUsers(/* lastId?: string | null */) {
  return { success: false, message: 'getManagedUsers is not available on the server.' };
}

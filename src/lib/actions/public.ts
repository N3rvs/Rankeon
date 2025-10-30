
// src/lib/actions/public.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, Team, Tournament, Scrim } from '../types';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';
import { Timestamp } from 'firebase/firestore';

const functions = getFunctions(app, 'europe-west1');

type ApiPage<T> = { items: T[]; nextCursor: string | null };

type PaginatedResponse<T> = {
  success: boolean;
  data?: T[];
  nextCursor?: string | null;
  message: string;
};

// Generic fetcher to reduce repetition
async function fetchPaginatedData<T>(functionName: string, dataKey: string): Promise<PaginatedResponse<T>> {
  try {
    const func = httpsCallable<void, ApiPage<any>>(functions, functionName);
    const { data } = await func();
    
    const items = (data.items || []).map((item: any) => ({
      ...item,
      // Handle potential date fields if they exist
      ...(item.createdAt && { createdAt: Timestamp.fromDate(new Date(item.createdAt)) }),
      ...(item.updatedAt && { updatedAt: Timestamp.fromDate(new Date(item.updatedAt)) }),
      ...(item.startDate && { startDate: Timestamp.fromDate(new Date(item.startDate)) }),
      ...(item.date && { date: Timestamp.fromDate(new Date(item.date)) }),
    }));

    return { 
      success: true, 
      data: items as T[], 
      nextCursor: data.nextCursor, 
      message: `${dataKey} fetched.` 
    };
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        const permissionError = new FirestorePermissionError({
            path: `public data for ${dataKey}`,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error(`Error fetching ${dataKey}:`, error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}


export async function getMarketPlayers(): Promise<PaginatedResponse<UserProfile>> {
  return fetchPaginatedData<UserProfile>('getMarketPlayers', 'players');
}

export async function getMarketTeams(): Promise<PaginatedResponse<Team>> {
  return fetchPaginatedData<Team>('getMarketTeams', 'teams');
}

export async function getHonorRankings(): Promise<PaginatedResponse<HonorRankingPlayer>> {
  return fetchPaginatedData<HonorRankingPlayer>('getHonorRankings', 'honor rankings');
}

export async function getScrimRankings(): Promise<PaginatedResponse<any>> {
    return fetchPaginatedData<any>('getScrimRankings', 'scrim rankings');
}

export async function getTournamentRankings(): Promise<PaginatedResponse<Tournament>> {
    return fetchPaginatedData<Tournament>('getTournamentRankings', 'tournament rankings');
}

export async function getFeaturedScrims(): Promise<PaginatedResponse<Scrim>> {
    return fetchPaginatedData<Scrim>('getFeaturedScrims', 'featured scrims');
}

export async function getManagedUsers(): Promise<{ success: boolean; data?: UserProfile[]; message: string }> {
  try {
    const fn = httpsCallable<void, { users: any[] }>(functions, 'getManagedUsers');
    const { data } = await fn();
    const users = data.users.map((u: any) => ({
      ...u,
      createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : undefined,
      banUntil: u.banUntil ? Timestamp.fromDate(new Date(u.banUntil)) : undefined,
      _claimsRefreshedAt: u._claimsRefreshedAt ? Timestamp.fromDate(new Date(u._claimsRefreshedAt)) : undefined,
    }));
    return { success: true, data: users as UserProfile[], message: 'Users fetched.' };
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        const permissionError = new FirestorePermissionError({
            path: 'users',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error getting managed users:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

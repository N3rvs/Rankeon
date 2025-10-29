'use client';

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = { success: boolean; message: string };

// Enum local (ajústalo si en backend hay más tipos)
export type HonorType = 'MVP' | 'FAIR_PLAY' | 'LEADERSHIP';
const HONOR_TYPES: readonly HonorType[] = ['MVP', 'FAIR_PLAY', 'LEADERSHIP'] as const;

const functions = getFunctions(app, 'europe-west1');

// ---- Adapters de payload: recipientId -> to, honorType -> type ----
type GiveHonorPayloadServer = { to: string; type: HonorType };
type RevokeHonorPayloadServer = { to: string; type?: HonorType }; // si backend exige type, hazlo obligatorio

function normalizeHonorType(h: string): HonorType {
  const up = h.trim().toUpperCase();
  if ((HONOR_TYPES as readonly string[]).includes(up)) return up as HonorType;
  throw new Error(`Invalid honorType "${h}". Valid: ${HONOR_TYPES.join(', ')}`);
}

export async function giveHonorToUser(
  recipientId: string,
  honorType: string
): Promise<ActionResponse> {
  try {
    const type = normalizeHonorType(honorType);
    const giveHonor = httpsCallable<GiveHonorPayloadServer, ActionResponse>(functions, 'giveHonor');
    const { data } = await giveHonor({ to: recipientId, type });
    return data ?? { success: true, message: 'Honor granted.' };
  } catch (error: any) {
    console.error('Error giving honor:', error);
    // Mensajes más claros según código
    if (error?.code === 'permission-denied') {
      return { success: false, message: 'No tienes permisos para otorgar honores.' };
    }
    if (error?.code === 'unauthenticated') {
      return { success: false, message: 'Debes iniciar sesión.' };
    }
    return { success: false, message: error?.message || 'Ha ocurrido un error inesperado.' };
  }
}

export async function revokeHonorFromUser(
  recipientId: string,
  honorType?: string // si tu backend lo pide, ponlo como obligatorio y normalízalo
): Promise<ActionResponse> {
  try {
    const payload: RevokeHonorPayloadServer = { to: recipientId };
    if (honorType) payload.type = normalizeHonorType(honorType);

    const revokeHonor = httpsCallable<RevokeHonorPayloadServer, ActionResponse>(functions, 'revokeHonor');
    const { data } = await revokeHonor(payload);
    return data ?? { success: true, message: 'Honor revoked.' };
  } catch (error: any) {
    console.error('Error revoking honor:', error);
    if (error?.code === 'permission-denied') {
      return { success: false, message: 'No tienes permisos para revocar honores.' };
    }
    if (error?.code === 'unauthenticated') {
      return { success: false, message: 'Debes iniciar sesión.' };
    }
    return { success: false, message: error?.message || 'Ha ocurrido un error inesperado.' };
  }
}

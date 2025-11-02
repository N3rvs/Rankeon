
// src/lib/actions/messages.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { Chat } from '../types';
import { Timestamp } from 'firebase/firestore';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

// Si no usas ya un uuid en el proyecto, un mini-id es suficiente:
const randId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type ActionResponse = {
  success: boolean;
  message: string;
};

type GetChatsServer = {
  items: any[];            // viene del backend
  nextCursor: string|null; // viene del backend
};

const functions = getFunctions(app, 'europe-west1');

// Helper para convertir fechas (ISO/string/Firestore Timestamp) a Timestamp de cliente
function toTimestamp(value: any): Timestamp | null {
  if (!value) return null;
  // Firestore Timestamp (ya serializado por SDK)
  if (value.seconds !== undefined && value.nanoseconds !== undefined) {
    return new Timestamp(value.seconds, value.nanoseconds);
  }
  // ISO string / Date-string
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

/** Obtener lista de chats (paginada) */
export async function getChats(cursor?: string): Promise<{
  success: boolean;
  data?: { items: Chat[]; nextCursor: string | null };
  message: string;
}> {
  try {
    const getChatsFunc = httpsCallable<{ cursor?: string }, GetChatsServer>(functions, 'getChats');
    const { data } = await getChatsFunc(cursor ? { cursor } : undefined);

    const chats = (data.items || []).map((c: any) => ({
      ...c,
      lastMessageAt: toTimestamp(c.lastMessageAt),
      createdAt: toTimestamp(c.createdAt),
    })) as Chat[];

    return { success: true, data: { items: chats, nextCursor: data.nextCursor ?? null }, message: 'Chats obtenidos.' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'chats',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error al obtener chats:', error);
    return { success: false, message: error?.message || 'Ocurrió un error inesperado.' };
  }
}

/** Borrar historial de mensajes de un chat (soft reset) */
export async function deleteChatHistory({ chatId }: { chatId: string }): Promise<ActionResponse> {
  try {
    const fn = httpsCallable<{ chatId: string }, ActionResponse>(functions, 'deleteChatHistory');
    const { data } = await fn({ chatId });
    return data;
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `chats/${chatId}/messages`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error al borrar el historial del chat:', error);
    return { success: false, message: error?.message || 'Ocurrió un error inesperado.' };
  }
}

export async function sendMessageToFriend({
  to,
  content,
  clientId,
}: {
  to: string;
  content: string;
  clientId?: string; // opcional: si no lo pasas, lo generamos
}): Promise<ActionResponse & { chatId?: string }> {
  try {
    const fn = httpsCallable<{ to: string; text: string; clientId: string }, ActionResponse & { chatId?: string }>(
      functions,
      'sendMessageToFriend'
    );

    const payload = { to, text: content, clientId: clientId ?? randId() };
    const { data } = await fn(payload);
    return data;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'chats/{chatId}/messages',
            operation: 'create',
            requestResourceData: { to, content }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error al enviar mensaje:', error);
    return { success: false, message: error?.message || 'Ocurrió un error inesperado.' };
  }
}

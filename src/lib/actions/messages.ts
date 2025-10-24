// src/lib/actions/messages.ts
// Acciones del lado del cliente que llaman a Firebase Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { Chat } from '../types';
import { Timestamp } from 'firebase/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, "europe-west1");

export async function getChats(): Promise<{ success: boolean; data?: Chat[]; message: string; }> {
  try {
    const getChatsFunc = httpsCallable<void, any[]>(functions, 'getChats');
    const result = await getChatsFunc();
    // Rehidrata Timestamps de Firestore a partir de los ISO strings del backend
    const chats = result.data.map(c => ({
      ...c,
      lastMessageAt: c.lastMessageAt ? Timestamp.fromDate(new Date(c.lastMessageAt)) : null,
      createdAt: c.createdAt ? Timestamp.fromDate(new Date(c.createdAt)) : null,
    }));
    
    return {
        success: true,
        data: chats as Chat[],
        message: 'Chats obtenidos.'
    };
  } catch (error: any) {
    console.error('Error al obtener chats:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function deleteChatHistory({
  chatId,
}: {
  chatId: string;
}): Promise<ActionResponse> {
  try {
    const deleteFunc = httpsCallable<{chatId: string}, ActionResponse>(functions, 'deleteChatHistory');
    const result = await deleteFunc({ chatId });
    return result.data; // Devuelve la respuesta del backend
  } catch (error: any) {
    console.error('Error al borrar el historial del chat:', error);
    return {
      success: false,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }
}

export async function sendMessageToFriend({
  to,
  content,
}: {
  to: string;
  content: string;
}): Promise<ActionResponse & {chatId?: string}> {
  try {
    const sendFunc = httpsCallable<{to: string; content: string}, ActionResponse & {chatId?: string}>(functions, 'sendMessageToFriend');
    const result = await sendFunc({ to, content });

    return result.data;
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error);
    return {
      success: false,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }
}

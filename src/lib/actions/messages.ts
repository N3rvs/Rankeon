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
    // Especifica los tipos de entrada y salida para httpsCallable
    const getChatsFunc = httpsCallable<
        { lastTimestamp: string | null }, // Tipo de entrada
        { chats: any[], nextLastTimestamp: string | null } // Tipo de salida (estructura de datos del backend)
    >(functions, 'getChats');

    // Envía lastTimestamp al backend
    const result = await getChatsFunc({ lastTimestamp });

    // Rehidrata Timestamps de Firestore a partir de los ISO strings del backend
    const chats = result.data.chats.map(c => ({
      ...c,
      lastMessageAt: c.lastMessageAt ? Timestamp.fromDate(new Date(c.lastMessageAt)) : null,
      createdAt: c.createdAt ? Timestamp.fromDate(new Date(c.createdAt)) : null,
    }));

    // Devuelve la estructura paginada completa
    return {
        success: true,
        data: {
            chats: chats as Chat[],
            nextLastTimestamp: result.data.nextLastTimestamp // Pasa el timestamp para la siguiente página
        },
        message: 'Chats obtenidos.'
    };
  } catch (error: any) {
    console.error('Error al obtener chats:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}
// *** FIN CORRECCIÓN #2 ***

// *** INICIO CORRECCIÓN #1 (Función Inexistente) ***
// Comentada porque la Cloud Function 'deleteMessage' no existe en chat.ts
/*
export async function deleteMessage({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}): Promise<ActionResponse> {
  try {
    const deleteFunc = httpsCallable(functions, 'deleteMessage');
    await deleteFunc({ chatId, messageId });
    return { success: true, message: 'Message deleted.' };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
*/
// *** FIN CORRECCIÓN #1 ***


// Esta función estaba bien
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

// Esta función estaba bien
export async function sendMessageToFriend({
  to,
  content,
}: {
  to: string;
  content: string;
}): Promise<ActionResponse & {chatId?: string}> { // Añadido chatId opcional a la respuesta
  try {
    const sendFunc = httpsCallable<{to: string; content: string}, ActionResponse & {chatId?: string}>(functions, 'sendMessageToFriend');
    const result = await sendFunc({ to, content });

    return result.data; // Devuelve la respuesta del backend ({ success: true, chatId: '...' })
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error);
    return {
      success: false,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }
}
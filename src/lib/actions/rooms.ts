'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app, "europe-west1");

const CreateRoomSchema = z.object({
  name: z.string().min(3).max(50),
  game: z.string().min(1),
  server: z.string().min(1),
  rank: z.string().min(1),
  partySize: z.string().min(1),
});

type CreateRoomData = z.infer<typeof CreateRoomSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  roomId?: string;
};

export async function createRoom(
  values: CreateRoomData
): Promise<ActionResponse> {
  try {
    const validatedFields = CreateRoomSchema.safeParse(values);

    if (!validatedFields.success) {
      return { success: false, message: 'Datos de formulario no válidos.' };
    }

    const createRoomFunc = httpsCallable<CreateRoomData, ActionResponse>(
      functions,
      'createGameRoom'
    );
    const result = await createRoomFunc(validatedFields.data);

    const responseData = result.data;

    if (responseData.success) {
      return {
        success: true,
        message: 'Sala creada con éxito.',
        roomId: responseData.roomId,
      };
    } else {
      return {
        success: false,
        message: responseData.message || 'Ocurrió un error desconocido en el servidor.',
      };
    }
  } catch (error: any) {
    console.error('Error al llamar a la función createRoom:', error);
    return {
      success: false,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }
}

export async function joinRoom(roomId: string): Promise<{ success: boolean; message: string }> {
  try {
    const joinRoomFunc = httpsCallable(functions, 'joinRoom');
    await joinRoomFunc({ roomId });
    return { success: true, message: 'Joined room successfully' };
  } catch (error: any) {
    console.error('Error joining room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function leaveRoom(roomId: string): Promise<{ success: boolean; message: string }> {
  try {
    const leaveRoomFunc = httpsCallable(functions, 'leaveRoom');
    await leaveRoomFunc({ roomId });
    return { success: true, message: 'Left room successfully' };
  } catch (error: any) {
    console.error('Error leaving room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function sendMessageToRoom({
  roomId,
  content,
}: {
  roomId: string;
  content: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const sendMessageFunc = httpsCallable(functions, 'sendMessageToRoom');
    await sendMessageFunc({ roomId, content });
    return { success: true, message: 'Message sent.' };
  } catch (error: any) {
    console.error('Error sending message to room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

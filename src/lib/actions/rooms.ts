'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

const functions = getFunctions(app, "europe-west1");

export const CreateRoomSchema = z.object({
  name: z.string().min(3).max(50),
  game: z.string().min(1),
  server: z.string().min(1),
  rank: z.string().min(1),
  partySize: z.string().min(1),
});

export type CreateRoomData = z.infer<typeof CreateRoomSchema>;

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
      return { success: false, message: 'Invalid form data.' };
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
        message: 'Room created successfully.',
        roomId: responseData.roomId,
      };
    } else {
      return {
        success: false,
        message: responseData.message || 'An unknown server error occurred.',
      };
    }
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        const permissionError = new FirestorePermissionError({
            path: 'rooms',
            operation: 'create',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error calling createRoom function:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function joinRoom(roomId: string): Promise<{ success: boolean; message: string }> {
  try {
    const joinRoomFunc = httpsCallable(functions, 'joinRoom');
    const result = await joinRoomFunc({ roomId });
    return (result.data as ActionResponse);
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}`,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error joining room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function leaveRoom(roomId: string): Promise<{ success: boolean; message: string }> {
  try {
    const leaveRoomFunc = httpsCallable(functions, 'leaveRoom');
    const result = await leaveRoomFunc({ roomId });
    return (result.data as ActionResponse);
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}`,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
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
    const result = await sendMessageFunc({ roomId, content });
    return (result.data as ActionResponse);
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
        const permissionError = new FirestorePermissionError({
            path: `rooms/${roomId}/messages`,
            operation: 'create',
            requestResourceData: { content },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error sending message to room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

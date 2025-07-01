// src/lib/actions/game-rooms.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
  discordChannelId?: string;
};

const functions = getFunctions(app, 'europe-west1');

export async function createGameRoom(
  name: string
): Promise<ActionResponse> {
  try {
    const createRoomFunc = httpsCallable(functions, 'createGameRoomWithDiscord');
    const result = await createRoomFunc({ name });
    const data = result.data as { success: boolean; discordChannelId: string };
    
    if (data.success) {
      return { success: true, message: 'Game room created successfully!', discordChannelId: data.discordChannelId };
    } else {
      // This case might not happen if the function throws an error instead
      return { success: false, message: 'An unknown error occurred on the server.' };
    }
  } catch (error: any) {
    console.error('Error creating game room:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

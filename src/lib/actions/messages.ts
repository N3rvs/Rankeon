// src/lib/actions/messages.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

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
    
    revalidatePath(`/messages`);
    return { success: true, message: 'Message deleted.' };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function sendMessageToFriend({
  to,
  content,
}: {
  to: string;
  content: string;
}): Promise<ActionResponse> {
  try {
    const sendFunc = httpsCallable(functions, 'sendMessageToFriend');
    await sendFunc({ to, content });

    return { success: true, message: 'Message sent.' };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

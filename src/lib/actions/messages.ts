// src/lib/actions/messages.ts
// Client-side actions that call Firebase Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { Chat } from '../types';
import { Timestamp } from 'firebase/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app);

export async function getChats(): Promise<{ success: boolean; data?: Chat[]; message: string; }> {
  try {
    const getChatsFunc = httpsCallable<void, any[]>(functions, 'getChats');
    const result = await getChatsFunc();
    const chats = result.data.map(c => ({
      ...c,
      lastMessageAt: c.lastMessageAt ? Timestamp.fromDate(new Date(c.lastMessageAt)) : null,
      createdAt: c.createdAt ? Timestamp.fromDate(new Date(c.createdAt)) : null,
    }));
    return { success: true, data: chats as Chat[], message: 'Chats fetched.' };
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

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

export async function deleteChatHistory({
  chatId,
}: {
  chatId: string;
}): Promise<ActionResponse> {
  try {
    const deleteFunc = httpsCallable(functions, 'deleteChatHistory');
    await deleteFunc({ chatId });
    return { success: true, message: 'Chat history deleted.' };
  } catch (error: any) {
    console.error('Error deleting chat history:', error);
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

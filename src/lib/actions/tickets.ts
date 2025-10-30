'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

const functions = getFunctions(app, "europe-west1");

export const CreateTicketSchema = z.object({
  subject: z.string().min(1, 'Please select a subject.'),
  description: z.string().min(10, 'Please provide a detailed description.').max(2000),
});
export type CreateTicketData = z.infer<typeof CreateTicketSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function createSupportTicket(values: CreateTicketData): Promise<ActionResponse> {
  try {
    const validatedFields = CreateTicketSchema.safeParse(values);
    if (!validatedFields.success) {
      return { success: false, message: 'Invalid form data.' };
    }
    
    const createTicketFunc = httpsCallable(functions, 'createSupportTicket');
    const result = await createTicketFunc(validatedFields.data);
    
    return (result.data as ActionResponse);
  } catch (error: any) {
     if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
      const permissionError = new FirestorePermissionError({
        path: 'tickets',
        operation: 'create',
        requestResourceData: values,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error creating support ticket:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function respondToTicket(ticketId: string, content: string): Promise<ActionResponse> {
  try {
    const respondFunc = httpsCallable(functions, 'respondToTicket');
    const result = await respondFunc({ ticketId, content });
    return (result.data as ActionResponse);
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
      const permissionError = new FirestorePermissionError({
        path: `tickets/${ticketId}/messages`,
        operation: 'create',
        requestResourceData: { content },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error responding to ticket:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function resolveTicket(ticketId: string): Promise<ActionResponse> {
  try {
    const resolveFunc = httpsCallable(functions, 'resolveTicket');
    const result = await resolveFunc({ ticketId });
    return (result.data as ActionResponse);
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
      const permissionError = new FirestorePermissionError({
        path: `tickets/${ticketId}`,
        operation: 'update',
        requestResourceData: { status: 'resolved' },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error resolving ticket:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

// src/lib/actions/tournaments.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

export const ProposeTournamentSchema = z.object({
  name: z.string().min(5, 'Tournament name must be at least 5 characters.').max(100),
  game: z.string().min(1, 'Game is required.'),
  description: z.string().min(20, 'Please provide a detailed description.').max(1000),
  proposedDate: z.date({ required_error: "Please select a date." }),
  format: z.string().min(1, 'Please select a format.'),
});

export type ProposeTournamentData = z.infer<typeof ProposeTournamentSchema>;

export const ReviewTournamentSchema = z.object({
    proposalId: z.string().min(1),
    status: z.enum(['approved', 'rejected']),
});
export type ReviewTournamentData = z.infer<typeof ReviewTournamentSchema>;


type ActionResponse = {
  success: boolean;
  message: string;
};

export async function proposeTournament(values: ProposeTournamentData): Promise<ActionResponse> {
  try {
    const validatedFields = ProposeTournamentSchema.safeParse(values);
    if (!validatedFields.success) {
      return { success: false, message: 'Invalid form data.' };
    }
    
    const dataToSend = {
      ...validatedFields.data,
      proposedDate: validatedFields.data.proposedDate.toISOString(),
    };
    
    const proposeFunc = httpsCallable(functions, 'proposeTournament');
    const result = await proposeFunc(dataToSend);
    
    return (result.data as ActionResponse) || { success: true, message: 'Proposal submitted.'};
  } catch (error: any) {
    console.error('Error proposing tournament:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function reviewTournamentProposal(values: ReviewTournamentData): Promise<ActionResponse> {
    try {
        const validatedFields = ReviewTournamentSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid review data.' };
        }
        
        const reviewFunc = httpsCallable(functions, 'reviewTournamentProposal');
        const result = await reviewFunc(validatedFields.data);
        
        return (result.data as ActionResponse);
    } catch (error: any) {
        console.error('Error reviewing tournament proposal:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

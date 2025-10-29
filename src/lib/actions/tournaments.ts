// src/lib/actions/tournaments.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app, 'europe-west1');

type ActionResponse = {
  success: boolean;
  message: string;
  tournamentId?: string;
};

// Schema for proposing a tournament
export const ProposeTournamentSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters.'),
  game: z.string().min(1, 'Game is required.'),
  description: z.string().min(20, 'Description is too short.').max(1000),
  proposedDate: z.date({ required_error: 'Please select a date.'}),
  format: z.string().min(1, 'Please select a format.'),
  maxTeams: z.number().int(),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  prize: z.number().positive('Prize must be a positive number.').optional(),
  currency: z.string().optional(),
});
export type ProposeTournamentData = z.infer<typeof ProposeTournamentSchema>;

// Schema for reviewing a proposal
const ReviewTournamentSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
});
export type ReviewTournamentData = z.infer<typeof ReviewTournamentSchema>;

// Schema for editing a tournament
export const EditTournamentSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(1000).optional(),
  prize: z.number().positive().optional().nullable(),
  currency: z.string().optional().nullable(),
  rankMin: z.string().optional().nullable(),
  rankMax: z.string().optional().nullable(),
});
export type EditTournamentData = z.infer<typeof EditTournamentSchema>;


export async function proposeTournament(values: ProposeTournamentData): Promise<ActionResponse> {
  try {
    const dataToSend = {
      ...values,
      proposedDate: values.proposedDate.toISOString(),
    };
    const proposeFunc = httpsCallable<typeof dataToSend, ActionResponse>(functions, 'proposeTournament');
    const result = await proposeFunc(dataToSend);
    return result.data;
  } catch (error: any) {
    console.error('Error calling proposeTournament function:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function reviewTournamentProposal(values: ReviewTournamentData): Promise<ActionResponse> {
    try {
        const reviewFunc = httpsCallable<ReviewTournamentData, ActionResponse>(functions, 'reviewTournamentProposal');
        const result = await reviewFunc(values);
        return result.data;
    } catch(error: any) {
        console.error('Error calling reviewTournamentProposal function:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function editTournament(values: EditTournamentData): Promise<ActionResponse> {
    try {
        const editFunc = httpsCallable<EditTournamentData, ActionResponse>(functions, 'editTournament');
        const result = await editFunc(values);
        return result.data;
    } catch(error: any) {
        console.error('Error calling editTournament function:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function deleteTournament(values: { tournamentId: string }): Promise<ActionResponse> {
    try {
        const deleteFunc = httpsCallable<{tournamentId: string}, ActionResponse>(functions, 'deleteTournament');
        const result = await deleteFunc(values);
        return result.data;
    } catch(error: any) {
        console.error('Error calling deleteTournament function:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function generateTournamentStructure(values: { tournamentId: string }): Promise<ActionResponse> {
    try {
        const generateFunc = httpsCallable<{tournamentId: string}, ActionResponse>(functions, 'generateTournamentStructure');
        const result = await generateFunc(values);
        return result.data;
    } catch(error: any) {
        console.error('Error calling generateTournamentStructure function:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function reportBracketMatchResult(values: { tournamentId: string, matchId: string, winnerId: string }): Promise<ActionResponse> {
    try {
        const reportFunc = httpsCallable<{tournamentId: string, matchId: string, winnerId: string}, ActionResponse>(functions, 'reportBracketMatchResult');
        const result = await reportFunc(values);
        return result.data;
    } catch(error: any) {
        console.error('Error calling reportBracketMatchResult function:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

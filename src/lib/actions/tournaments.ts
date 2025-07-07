// src/lib/actions/tournaments.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

const rankOrder: { [key: string]: number } = {
    'Plata': 1,
    'Oro': 2,
    'Platino': 3,
    'Ascendente': 4,
    'Inmortal': 5,
};

export const ProposeTournamentSchema = z.object({
  name: z.string().min(5, 'Tournament name must be at least 5 characters.').max(100),
  game: z.string().min(1, 'Game is required.'),
  description: z.string().min(20, 'Please provide a detailed description.').max(1000),
  proposedDate: z.date({ required_error: "Please select a date." }),
  format: z.string().min(1, 'Please select a format.'),
  maxTeams: z.coerce.number().int().min(2, "Must have at least 2 teams.").max(64, "Cannot exceed 64 teams."),
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  prize: z.string().max(100, "Prize description is too long.").optional(),
}).refine((data) => {
    if (data.rankMin && !data.rankMax) {
        data.rankMax = data.rankMin;
    }
    if (!data.rankMin && data.rankMax) {
        data.rankMin = data.rankMax;
    }
    return true;
}).refine((data) => {
    if (data.rankMin && data.rankMax) {
        return rankOrder[data.rankMin as keyof typeof rankOrder] <= rankOrder[data.rankMax as keyof typeof rankOrder];
    }
    return true;
}, {
    message: "Minimum rank cannot be higher than maximum rank.",
    path: ["rankMin"],
});

export type ProposeTournamentData = z.infer<typeof ProposeTournamentSchema>;

export const ReviewTournamentSchema = z.object({
    proposalId: z.string().min(1),
    status: z.enum(['approved', 'rejected']),
});
export type ReviewTournamentData = z.infer<typeof ReviewTournamentSchema>;

export const EditTournamentSchema = z.object({
    tournamentId: z.string().min(1),
    name: z.string().min(5, 'Tournament name must be at least 5 characters.').max(100),
    description: z.string().min(20, 'Please provide a detailed description.').max(1000),
    prize: z.string().max(100, "Prize description is too long.").optional(),
});
export type EditTournamentData = z.infer<typeof EditTournamentSchema>;


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

export async function editTournament(values: EditTournamentData): Promise<ActionResponse> {
    try {
        const validatedFields = EditTournamentSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        
        const editFunc = httpsCallable(functions, 'editTournament');
        const result = await editFunc(validatedFields.data);
        
        return (result.data as ActionResponse);
    } catch (error: any) {
        console.error('Error editing tournament:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

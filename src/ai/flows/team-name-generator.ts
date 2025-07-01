// src/ai/flows/team-name-generator.ts
'use server';

/**
 * @fileOverview An AI agent that generates team names based on user preferences.
 *
 * - generateTeamName - A function that generates a team name.
 * - GenerateTeamNameInput - The input type for the generateTeamName function.
 * - GenerateTeamNameOutput - The return type for the generateTeamName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTeamNameInputSchema = z.object({
  gameType: z.string().describe('The type of game the team plays.'),
  style: z.string().describe('The preferred style of the team name (e.g., aggressive, funny, mythical).'),
  keywords: z.string().optional().describe('Optional keywords to include in the team name.'),
});
export type GenerateTeamNameInput = z.infer<typeof GenerateTeamNameInputSchema>;

const GenerateTeamNameOutputSchema = z.object({
  teamName: z.string().describe('A catchy and unique team name suggestion.'),
});
export type GenerateTeamNameOutput = z.infer<typeof GenerateTeamNameOutputSchema>;

export async function generateTeamName(input: GenerateTeamNameInput): Promise<GenerateTeamNameOutput> {
  return generateTeamNameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTeamNamePrompt',
  input: {schema: GenerateTeamNameInputSchema},
  output: {schema: GenerateTeamNameOutputSchema},
  prompt: `You are a creative team name generator.  Generate a team name based on the following preferences:

Game Type: {{{gameType}}}
Style: {{{style}}}
Keywords: {{{keywords}}}

The team name should be catchy, unique, and memorable.
`,
});

const generateTeamNameFlow = ai.defineFlow(
  {
    name: 'generateTeamNameFlow',
    inputSchema: GenerateTeamNameInputSchema,
    outputSchema: GenerateTeamNameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

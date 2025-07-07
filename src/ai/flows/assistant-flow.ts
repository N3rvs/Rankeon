'use server';
/**
 * @fileOverview An AI assistant for the SquadUp platform.
 * - askAssistant - A function that handles user queries about the platform.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AssistantInputSchema = z.object({
  query: z.string().describe('The user\'s question about the SquadUp platform.'),
  history: z.array(z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({text: z.string()}))
    })).optional().describe("The conversation history.")
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.object({
  response: z.string().describe('The helpful and concise answer to the user\'s question.'),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

export async function askAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

// New schema for the prompt itself, where history is a simple string.
const PromptInputSchema = z.object({
  query: z.string(),
  history: z.string().optional(),
});


const prompt = ai.definePrompt({
  name: 'squadUpAssistantPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: AssistantOutputSchema},
  prompt: `You are "SquadUp Assistant", a friendly and helpful AI designed to assist users of the SquadUp application. Your goal is to provide clear, concise, and accurate answers about how to use the platform.

**SquadUp Platform Overview:**

SquadUp is a platform for competitive gamers to find teammates, create teams, and compete in scrims (practice matches) and tournaments.

**Core Features & How-To Guide:**

*   **Teams:**
    *   **Creating a Team:** Any player who isn't already in a team can become a "Founder" by creating one from the "My Team" page. This requires a team name and primary game.
    *   **Managing a Team:** Founders and Coaches can edit team profiles, manage members (promote, demote, kick), and set recruitment status.
    *   **Joining a Team:** Players can search for teams in the "Market" tab and apply to join if the team is recruiting. Founders review these applications. Founders can also send direct invites to players.

*   **Scrims (Practice Matches):**
    *   **Finding a Scrim:** Go to the "Scrims" page. The "Available Scrims" tab shows open matches posted by other teams.
    *   **Posting a Scrim:** Team Founders or Coaches can post a scrim for others to challenge.
    *   **The Flow:**
        1.  Team A posts a scrim. It's now 'open'.
        2.  Team B challenges the scrim. Its status becomes 'challenged'.
        3.  Team A gets a notification and must 'accept' or 'decline' the challenge.
        4.  If accepted, the scrim is 'confirmed'.
        5.  After the match, a staff member of either team reports the winner. The status becomes 'completed'.
    *   **Stats:** Scrim wins and losses are tracked on the team's profile and in the global rankings.

*   **Tournaments:**
    *   **Joining:** Teams can view and register for tournaments from the "Tournaments" page.
    *   **Proposing:** Certified Streamers, Moderators, and Admins can propose new tournaments for approval.

*   **Player Profiles & Social:**
    *   **Profile:** Users can edit their own profile, including their bio, rank, and preferred roles.
    *   **Friends:** Users can add friends, which allows them to send direct messages.
    *   **Honors:** Players can give one honor (e.g., "Great Teammate") to other players.

**Your Task:**

Based on the information above, answer the user's question.

*   Be friendly and conversational.
*   Keep your answers short and to the point.
*   If you don't know the answer or the user's question is about a specific account issue, a bug, or something that requires human intervention, politely guide them to use the "Support" option in their user profile menu to create a support ticket. DO NOT make up answers.

{{#if history}}
**Conversation History:**
{{{history}}}
{{/if}}

User's Question: {{{query}}}
`,
});

const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    // Transform the history array into a simple string for the prompt
    const historyString = input.history?.map(h => {
        const prefix = h.role === 'user' ? 'User:' : 'Assistant:';
        const content = h.content[0]?.text || '';
        return `${prefix} ${content}`;
    }).join('\n');

    const promptInput = {
        query: input.query,
        history: historyString,
    };

    const {output} = await prompt(promptInput);
    return output!;
  }
);

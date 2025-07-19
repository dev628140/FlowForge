
'use server';

/**
 * @fileOverview A specialized, conversational AI flow for brainstorming task suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const SuggesterInputSchema = z.object({
  history: z.array(AssistantMessageSchema).describe("The conversation history for the current tool session."),
});
export type SuggesterInput = z.infer<typeof SuggesterInputSchema>;

const TaskSchema = z.object({
    title: z.string().describe('The title of the suggested task.'),
    description: z.string().optional().nullable().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().nullable().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().nullable().describe('The scheduled time for the task in HH:mm 24-hour format.'),
});

const SuggesterOutputSchema = z.object({
  response: z.string().describe("A concise, friendly, and conversational response to the user's last message. Explain the ideas you've generated or ask for clarification."),
  tasks: z.array(TaskSchema).optional().nullable().describe("A list of new task suggestions. This list should represent the complete, updated set of ideas after the user's latest request."),
});
export type SuggesterOutput = z.infer<typeof SuggesterOutputSchema>;

export async function runSuggester(input: SuggesterInput): Promise<SuggesterOutput> {
  return suggesterFlow(input);
}

const systemPrompt = `You are an empathetic AI Productivity Assistant. Your job is to have a conversation with the user to brainstorm task ideas based on their goal, role, and mood.
- The user will provide an initial goal, their role, and their mood. Generate a list of 3-5 creative and relevant task suggestions to help them get started.
- The user may then provide follow-up messages to get different ideas. Your last response in the history contains the ideas you previously generated. You MUST take those ideas and regenerate a NEW list of suggestions based on their feedback.
- If the user's mood is 'Overwhelmed', 'Stressed', or 'Low Energy', suggest very small, simple, "2-minute win" tasks.
- Keep your conversational response friendly and encouraging.`;


const suggesterPrompt = ai.definePrompt({
    name: 'suggesterPrompt',
    input: { schema: SuggesterInputSchema },
    output: { schema: SuggesterOutputSchema },
    prompt: `${systemPrompt}
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**: {{this.content}}
    {{/each}}
    
    Based on the latest user message and the entire conversation (especially your last generated ideas), generate a conversational response and an updated list of task ideas.
    `,
});

const suggesterFlow = ai.defineFlow(
  {
    name: 'suggesterFlow',
    inputSchema: SuggesterInputSchema,
    outputSchema: SuggesterOutputSchema,
  },
  async (input) => {
    const { output } = await suggesterPrompt(input);
    if (!output) {
      throw new Error("The AI was unable to generate a response. Please try rephrasing your request.");
    }
    return output;
  }
);

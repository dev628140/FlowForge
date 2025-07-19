
'use server';

/**
 * @fileOverview A specialized, conversational AI flow for breaking down tasks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const BreakdownerInputSchema = z.object({
  history: z.array(AssistantMessageSchema).describe("The conversation history for the current tool session."),
});
export type BreakdownerInput = z.infer<typeof BreakdownerInputSchema>;

const TaskSchema = z.object({
    title: z.string().describe('The title of the new subtask.'),
    description: z.string().optional().nullable(),
    scheduledDate: z.string().optional().nullable(),
    scheduledTime: z.string().optional().nullable(),
});

const BreakdownerOutputSchema = z.object({
  response: z.string().describe("A concise, friendly, and conversational response to the user's last message. Explain the subtask list you've generated or ask for clarification."),
  tasks: z.array(TaskSchema).optional().nullable().describe("A list of new subtasks. This list should represent the complete, updated plan after the user's latest request."),
});
export type BreakdownerOutput = z.infer<typeof BreakdownerOutputSchema>;

export async function runBreakdowner(input: BreakdownerInput): Promise<BreakdownerOutput> {
  return breakdownerFlow(input);
}

const systemPrompt = `You are an expert AI Project Manager. Your job is to have a conversation with the user to break down a single, complex task into smaller, actionable subtasks.
- The user will specify a task to break down. Generate a list of concise subtasks. Do not include the parent task in the list.
- The user may then provide follow-up messages to modify the subtask list. Your last response in the history contains the subtask list you previously generated. You MUST take that list and regenerate the ENTIRE subtask list with the requested modifications.
- Your output should ONLY contain the titles for the subtasks, no other fields.
- Keep your conversational response friendly and confirm the changes you've made to the subtask list.`;


const breakdownerPrompt = ai.definePrompt({
    name: 'breakdownerPrompt',
    input: { schema: BreakdownerInputSchema },
    output: { schema: BreakdownerOutputSchema },
    prompt: `${systemPrompt}
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**: {{this.content}}
    {{/each}}
    
    Based on the latest user message and the entire conversation (especially your last generated list), generate a conversational response and an updated list of subtasks.
    `,
});

const breakdownerFlow = ai.defineFlow(
  {
    name: 'breakdownerFlow',
    inputSchema: BreakdownerInputSchema,
    outputSchema: BreakdownerOutputSchema,
  },
  async (input) => {
    const { output } = await breakdownerPrompt(input);
    if (!output) {
      throw new Error("The AI was unable to generate a response. Please try rephrasing your request.");
    }
    // Ensure only title is returned for subtasks
    if (output.tasks) {
      output.tasks = output.tasks.map(t => ({ title: t.title }));
    }
    return output;
  }
);

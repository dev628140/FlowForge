
'use server';

/**
 * @fileOverview A specialized, conversational AI flow for the AI Hub.
 * This flow directs one of three sub-modules (planner, breakdown, suggester)
 * based on the user's selected mode, maintaining a conversational context
 * to allow for iterative refinement of the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export type AssistantMode = 'planner' | 'breakdown' | 'suggester';

const SpecializedAssistantInputSchema = z.object({
  mode: z.enum(['planner', 'breakdown', 'suggester']).describe("The tool the user is currently using."),
  history: z.array(AssistantMessageSchema).describe("The conversation history for the current tool session."),
  tasks: z.array(z.any()).describe("The user's full list of tasks for context, if needed."),
  // This will be added internally in the flow, not passed from the client
  systemPrompt: z.string().optional(),
});
export type SpecializedAssistantInput = z.infer<typeof SpecializedAssistantInputSchema>;

const TaskSchema = z.object({
    title: z.string().describe('The title of the new task.'),
    description: z.string().optional().nullable().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().nullable().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().nullable().describe('The scheduled time for the task in HH:mm 24-hour format.'),
});

const SpecializedAssistantOutputSchema = z.object({
  response: z.string().describe("A concise, friendly, and conversational response to the user's last message. Explain the plan you've generated or ask for clarification."),
  tasks: z.array(TaskSchema).optional().nullable().describe("A list of new tasks or subtasks. This list should represent the complete, updated plan after the user's latest request."),
});
export type SpecializedAssistantOutput = z.infer<typeof SpecializedAssistantOutputSchema>;

export async function runSpecializedAssistant(input: SpecializedAssistantInput): Promise<SpecializedAssistantOutput> {
  return specializedAssistantFlow(input);
}

const plannerPrompt = `You are an expert AI Task Planner. Your job is to have a conversation with the user to break down their high-level goal into a list of actionable tasks.
- The user will provide an initial goal. Generate a comprehensive list of tasks.
- The user may then provide follow-up messages to modify the plan. You MUST regenerate the ENTIRE task list with the requested modifications.
- When scheduling, provide a 'scheduledDate' in 'YYYY-MM-DD' format and optionally a 'scheduledTime' in 'HH:mm' format. Today is ${format(new Date(), 'yyyy-MM-dd')}.
- Keep your conversational response friendly and confirm the changes you've made to the plan.`;

const breakdownPrompt = `You are an expert AI Project Manager. Your job is to have a conversation with the user to break down a single, complex task into smaller, actionable subtasks.
- The user will specify a task to break down. Generate a list of concise subtasks. Do not include the parent task in the list.
- The user may then provide follow-up messages to modify the subtask list. You MUST regenerate the ENTIRE subtask list with the requested modifications.
- Your output should ONLY contain the titles for the subtasks, no other fields.
- Keep your conversational response friendly and confirm the changes you've made to the subtask list.`;

const suggesterPrompt = `You are an empathetic AI Productivity Assistant. Your job is to have a conversation with the user to brainstorm task ideas based on their goal, role, and mood.
- The user will provide an initial goal, their role, and their mood. Generate a list of 3-5 creative and relevant task suggestions to help them get started.
- The user may then provide follow-up messages to get different ideas. You MUST regenerate a NEW list of suggestions based on their feedback.
- If the user's mood is 'Overwhelmed', 'Stressed', or 'Low Energy', suggest very small, simple, "2-minute win" tasks.
- Keep your conversational response friendly and encouraging.`;


const specializedAssistantPrompt = ai.definePrompt({
    name: 'specializedAssistantPrompt',
    input: { schema: SpecializedAssistantInputSchema },
    output: { schema: SpecializedAssistantOutputSchema },
    prompt: `{{{systemPrompt}}}
    
    CONVERSATION HISTORY:
    {{#each history}}
      **{{this.role}}**: {{this.content}}
    {{/each}}
    
    Based on the latest user message and the entire conversation, generate a conversational response and an updated list of tasks/subtasks.
    `,
});

const specializedAssistantFlow = ai.defineFlow(
  {
    name: 'specializedAssistantFlow',
    inputSchema: SpecializedAssistantInputSchema,
    outputSchema: SpecializedAssistantOutputSchema,
  },
  async (input) => {
    let systemPrompt = '';
    switch (input.mode) {
        case 'planner':
            systemPrompt = plannerPrompt;
            break;
        case 'breakdown':
            systemPrompt = breakdownPrompt;
            break;
        case 'suggester':
            systemPrompt = suggesterPrompt;
            break;
    }

    const flowInput = { ...input, systemPrompt };

    const { output } = await specializedAssistantPrompt(flowInput);
    if (!output) {
      throw new Error("The AI was unable to generate a response. Please try rephrasing your request.");
    }
    return output;
  }
);

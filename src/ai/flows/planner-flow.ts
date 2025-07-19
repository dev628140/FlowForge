
'use server';

/**
 * @fileOverview A specialized, conversational AI flow for the AI Task Planner and Task Breakdown features.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const AssistantMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const PlannerInputSchema = z.object({
  history: z.array(AssistantMessageSchema).describe("The conversation history for the current tool session."),
});
export type PlannerInput = z.infer<typeof PlannerInputSchema>;

const TaskSchema = z.object({
    title: z.string().describe('The title of the new task or subtask.'),
    description: z.string().optional().nullable().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().nullable().describe('The scheduled date for the task in YYYY-MM-DD format.'),
    scheduledTime: z.string().optional().nullable().describe('The scheduled time for the task in HH:mm 24-hour format.'),
});

const PlannerOutputSchema = z.object({
  response: z.string().describe("A concise, friendly, and conversational response to the user's last message. Explain the plan you've generated or ask for clarification."),
  tasks: z.array(TaskSchema).optional().nullable().describe("A list of new tasks or subtasks. This list should represent the complete, updated plan after the user's latest request."),
});
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

export async function runPlanner(input: PlannerInput): Promise<PlannerOutput> {
  return plannerFlow(input);
}

const plannerFlow = ai.defineFlow(
  {
    name: 'plannerFlow',
    inputSchema: PlannerInputSchema,
    outputSchema: PlannerOutputSchema,
  },
  async (input) => {
    const systemPrompt = `You are an expert AI assistant. Your job is to have a conversation with the user to help them with their goal.
- The user will provide an initial goal or task. Your primary job is to break this down into a list of actionable tasks or subtasks.
- The user may then provide follow-up messages to modify the plan. Your last response in the history contains the plan you previously generated. You MUST take that plan and regenerate the ENTIRE task list with the requested modifications. Do not just output the changes.
- If the user's request is to "break down" a task, the output \`tasks\` should be treated as subtasks for the original task.
- If the user's request is a more general goal, the output \`tasks\` are new, standalone tasks.
- When scheduling, provide a 'scheduledDate' in 'YYYY-MM-DD' format and optionally a 'scheduledTime' in 'HH:mm' format. Today is ${format(new Date(), 'yyyy-MM-dd')}.
- Keep your conversational response friendly and confirm the changes you've made to the plan. For example, "Here is a draft plan for [GOAL]. How does this look?"`;
    
    const plannerPrompt = ai.definePrompt({
        name: 'plannerPrompt',
        input: { schema: PlannerInputSchema },
        output: { schema: PlannerOutputSchema },
        prompt: `${systemPrompt}
    
        CONVERSATION HISTORY:
        {{#each history}}
          **{{this.role}}**: {{this.content}}
        {{/each}}
        
        Based on the latest user message and the entire conversation (especially your last generated plan), generate a conversational response and an updated list of tasks.
        `,
    });

    const { output } = await plannerPrompt(input);
    if (!output) {
      throw new Error("The AI was unable to generate a response. Please try rephrasing your request.");
    }
    return output;
  }
);


/**
 * @fileOverview Type definitions for the conversational agent.
 */

import { z } from 'genkit';

export const ContentSchema = z.union([
  z.object({ text: z.string() }),
  z.object({ media: z.object({ url: z.string() }) }),
]);
export type Content = z.infer<typeof ContentSchema>;

export const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(ContentSchema),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationalAgentInputSchema = z.object({
  history: z.array(MessageSchema).describe("The conversation history."),
  prompt: z.string().describe("The user's latest prompt."),
  initialContext: z.string().optional().describe("An initial prompt to set the context for the agent (e.g., 'You are a productivity coach')."),
  taskContext: z.any().optional().describe("Additional context about the user's current tasks or state."),
  imageDataUri: z.string().optional().describe("An optional image provided by the user as a data URI."),
});
export type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;


const TaskToAddSchema = z.object({
    title: z.string().describe('The title of the task.'),
    description: z.string().optional().describe('A brief description of the task.'),
    scheduledDate: z.string().optional().describe('The scheduled date for the task in YYYY-MM-DD format if a timeframe is provided.'),
    scheduledTime: z.string().optional().describe('The scheduled time for the task in HH:mm format if provided.'),
});

export const ConversationalAgentOutputSchema = z.object({
  response: z.string().describe("The agent's text response to the user."),
  tasksToAdd: z.array(TaskToAddSchema).optional().describe("A list of tasks to be added to the user's to-do list, based on the conversation. Only populate this if the user explicitly asks to create tasks or a plan."),
});
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;

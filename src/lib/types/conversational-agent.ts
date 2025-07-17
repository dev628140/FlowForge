/**
 * @fileOverview Type definitions for the conversational agent.
 */

import { z } from 'genkit';

export const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationalAgentInputSchema = z.object({
  history: z.array(MessageSchema).describe("The conversation history."),
  prompt: z.string().describe("The user's latest prompt."),
  initialContext: z.string().optional().describe("An initial prompt to set the context for the agent (e.g., 'You are a productivity coach')."),
  taskContext: z.any().optional().describe("Additional context about the user's current tasks or state."),
});
export type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;

export const ConversationalAgentOutputSchema = z.object({
  response: z.string().describe("The agent's text response to the user."),
  tasksToAdd: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    scheduledDate: z.string().optional(),
  })).optional().describe("A list of tasks that the user has asked to be created."),
});
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;

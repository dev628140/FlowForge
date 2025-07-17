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
  // tasksToAdd is removed to prevent the AI from automatically adding tasks.
  // The AI must now be explicitly told to use the task-adding tool.
});
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;

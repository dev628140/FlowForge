'use server';

/**
 * @fileOverview A flow for generating a concise title for a chat conversation.
 *
 * - generateChatTitle - A function that creates a title from a message history.
 * - GenerateChatTitleInput - The input type for the function.
 * - GenerateChatTitleOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { GenerateChatTitleInputSchema, type GenerateChatTitleInput, GenerateChatTitleOutputSchema, type GenerateChatTitleOutput } from '@/lib/types/conversational-agent';

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: { schema: GenerateChatTitleInputSchema },
  output: { schema: GenerateChatTitleOutputSchema },
  prompt: `Based on the following conversation history, create a short, concise title (4-5 words maximum).
The title should capture the main topic or goal of the conversation.

CONVERSATION:
{{#each history}}
  **{{this.role}}**: {{this.content}}
{{/each}}
`,
});

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

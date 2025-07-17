'use server';

/**
 * @fileOverview An AI flow for extracting tasks from an image of handwritten notes.
 *
 * - `visualTaskSnap` - A function that takes an image and returns a list of tasks.
 * - `VisualTaskSnapInput` - The input type for the `visualTaskSnap` function.
 * - `VisualTaskSnapOutput` - The output type for the `visualTaskSnap` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisualTaskSnapInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of handwritten notes or a whiteboard, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VisualTaskSnapInput = z.infer<typeof VisualTaskSnapInputSchema>;

const VisualTaskSnapOutputSchema = z.object({
  tasks: z.array(z.string()).describe('A list of tasks extracted from the image.'),
});
export type VisualTaskSnapOutput = z.infer<typeof VisualTaskSnapOutputSchema>;

export async function visualTaskSnap(input: VisualTaskSnapInput): Promise<VisualTaskSnapOutput> {
  return visualTaskSnapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'visualTaskSnapPrompt',
  input: {schema: VisualTaskSnapInputSchema},
  output: {schema: VisualTaskSnapOutputSchema},
  prompt: `You are an expert at reading handwritten notes and identifying action items. Analyze the following image and extract a list of tasks.

If the image does not appear to contain any text or tasks, return an empty list.

Image: {{media url=imageDataUri}}`,
});

const visualTaskSnapFlow = ai.defineFlow(
  {
    name: 'visualTaskSnapFlow',
    inputSchema: VisualTaskSnapInputSchema,
    outputSchema: VisualTaskSnapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


'use server';

/**
 * @fileOverview An AI flow for generating a user avatar based on a text prompt.
 *
 * - `generateAvatar` - A function that takes a prompt and returns an image data URI.
 * - `GenerateAvatarInput` - The input type for the `generateAvatar` function.
 * - `GenerateAvatarOutput` - The output type for the `generateAvatar` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired avatar.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

const GenerateAvatarOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated avatar image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({prompt}) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media.url) {
        throw new Error('Image generation failed.');
    }

    return { imageDataUri: media.url };
  }
);

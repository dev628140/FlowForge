
'use server';

/**
 * @fileOverview An AI flow for generating a short, Lo-fi focus playlist.
 *
 * - `generateFocusPlaylist` - A function that creates a playlist based on a task title.
 * - `FocusPlaylistInput` - The input type for the `generateFocusPlaylist` function.
 * - `FocusPlaylistOutput` - The output type for the `generateFocusPlaylist` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FocusPlaylistInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task the user is focusing on.'),
});
export type FocusPlaylistInput = z.infer<typeof FocusPlaylistInputSchema>;

const SongSchema = z.object({
    title: z.string().describe('The title of the song.'),
    artist: z.string().describe('The artist of the song.'),
});

const FocusPlaylistOutputSchema = z.object({
  playlist: z.array(SongSchema).describe('A list of 3-5 instrumental lo-fi hip hop tracks suitable for focus.'),
});
export type FocusPlaylistOutput = z.infer<typeof FocusPlaylistOutputSchema>;

export async function generateFocusPlaylist(input: FocusPlaylistInput): Promise<FocusPlaylistOutput> {
  return focusPlaylistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'focusPlaylistPrompt',
  input: {schema: FocusPlaylistInputSchema},
  output: {schema: FocusPlaylistOutputSchema},
  prompt: `You are a music curator specializing in instrumental lo-fi hip hop for focus and concentration.
Based on the user's task, generate a short playlist of 3-5 songs.
The songs should be chill, instrumental, and conducive to deep work. Avoid tracks with prominent vocals.

Task: {{{taskTitle}}}

Generate the playlist now.
`,
});

const focusPlaylistFlow = ai.defineFlow(
  {
    name: 'focusPlaylistFlow',
    inputSchema: FocusPlaylistInputSchema,
    outputSchema: FocusPlaylistOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

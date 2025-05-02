'use server';
/**
 * @fileOverview Analyzes text content for neurodiversity-friendliness using GPT-4o via Puter's AI API.
 *
 * - analyzeTextNeurodiversity - A function that handles the text analysis process.
 * - AnalyzeTextNeurodiversityInput - The input type for the analyzeTextNeurodiversity function.
 * - AnalyzeTextNeurodiversityOutput - The return type for the analyzeTextNeurodiversity function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeTextNeurodiversityInputSchema = z.object({
  text: z.string().describe('The text content to be analyzed.'),
});
export type AnalyzeTextNeurodiversityInput = z.infer<
  typeof AnalyzeTextNeurodiversityInputSchema
>;

const AnalyzeTextNeurodiversityOutputSchema = z.object({
  neurodiversityAnalysis: z.object({
    readability: z.string().describe('Analysis of the text readability.'),
    clarity: z.string().describe('Analysis of the text clarity.'),
    potentialForMisinterpretation: z
      .string()
      .describe('Analysis of the potential for misinterpretation.'),
    overallNeurodiversityFriendliness: z
      .string()
      .describe('Overall assessment of neurodiversity friendliness.'),
  }),
});
export type AnalyzeTextNeurodiversityOutput = z.infer<
  typeof AnalyzeTextNeurodiversityOutputSchema
>;

export async function analyzeTextNeurodiversity(
  input: AnalyzeTextNeurodiversityInput
): Promise<AnalyzeTextNeurodiversityOutput> {
  return analyzeTextNeurodiversityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextNeurodiversityPrompt',
  input: {
    schema: z.object({
      text: z.string().describe('The text content to be analyzed.'),
    }),
  },
  output: {
    schema: z.object({
      neurodiversityAnalysis: z.object({
        readability: z.string().describe('Analysis of the text readability.'),
        clarity: z.string().describe('Analysis of the text clarity.'),
        potentialForMisinterpretation: z
          .string()
          .describe('Analysis of the potential for misinterpretation.'),
        overallNeurodiversityFriendliness: z
          .string()
          .describe('Overall assessment of neurodiversity friendliness.'),
      }),
    }),
  },
  prompt: `Analyze the following text for neurodiversity-friendliness, considering readability, clarity, and potential for misinterpretation. Provide an overall assessment.\n\nText: {{{text}}}`,
});

const analyzeTextNeurodiversityFlow = ai.defineFlow<
  typeof AnalyzeTextNeurodiversityInputSchema,
  typeof AnalyzeTextNeurodiversityOutputSchema
>(
  {
    name: 'analyzeTextNeurodiversityFlow',
    inputSchema: AnalyzeTextNeurodiversityInputSchema,
    outputSchema: AnalyzeTextNeurodiversityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

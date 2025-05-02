'use server';

/**
 * @fileOverview Analyzes an image for neurodiversity-friendliness using GPT-4 Vision.
 *
 * - analyzeImageForNeurodiversity - A function that handles the image analysis process.
 * - AnalyzeImageNeurodiversityInput - The input type for the analyzeImageForNeurodiversity function.
 * - AnalyzeImageNeurodiversityOutput - The return type for the analyzeImageForNeurodiversity function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeImageNeurodiversityInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be analyzed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageNeurodiversityInput = z.infer<typeof AnalyzeImageNeurodiversityInputSchema>;

const AnalyzeImageNeurodiversityOutputSchema = z.object({
  analysisResult: z.string().describe('The analysis of the image for neurodiversity-friendliness.'),
});
export type AnalyzeImageNeurodiversityOutput = z.infer<typeof AnalyzeImageNeurodiversityOutputSchema>;

export async function analyzeImageForNeurodiversity(
  input: AnalyzeImageNeurodiversityInput
): Promise<AnalyzeImageNeurodiversityOutput> {
  return analyzeImageNeurodiversityFlow(input);
}

const analyzeImageNeurodiversityPrompt = ai.definePrompt({
  name: 'analyzeImageNeurodiversityPrompt',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo to be analyzed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
      analysisResult: z.string().describe('The analysis of the image for neurodiversity-friendliness.'),
    }),
  },
  prompt: `You are an AI assistant that analyzes images for neurodiversity-friendliness, considering aspects like color contrast, visual complexity, and pattern density.

  Analyze the following image and provide a detailed assessment of its suitability for individuals with neurodevelopmental conditions. Be specific about the elements that may pose challenges or be beneficial.

  Image: {{media url=photoDataUri}}`,
});

const analyzeImageNeurodiversityFlow = ai.defineFlow<
  typeof AnalyzeImageNeurodiversityInputSchema,
  typeof AnalyzeImageNeurodiversityOutputSchema
>(
  {
    name: 'analyzeImageNeurodiversityFlow',
    inputSchema: AnalyzeImageNeurodiversityInputSchema,
    outputSchema: AnalyzeImageNeurodiversityOutputSchema,
  },
  async input => {
    const {output} = await analyzeImageNeurodiversityPrompt(input);
    return output!;
  }
);

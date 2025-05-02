
'use client';

import React, { useState, useCallback } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { AnalysisResults } from '@/components/analysis-results';
// Removed Genkit imports as Puter.js will be used directly
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Define Puter types globally for TypeScript
declare global {
  interface Window {
    puter: any; // Use 'any' for simplicity, or define a more specific type if needed
  }
}
// Define expected analysis output structure
type AnalysisOutput = {
  analysisResult: string;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File | null, type: 'image' | 'text' | null) => {
    setSelectedFile(file);
    setFileType(type);
    setAnalysisResults(null); // Clear previous results when a new file is selected
  }, []);

 const handleAnalysisRequest = useCallback(async (
    data: { content: string }, // Expect content (Data URL or text)
    type: 'image' | 'text'
  ) => {
    if (!window.puter) {
       toast({
          title: 'Puter SDK Error',
          description: 'Puter.js SDK not loaded. Please refresh the page.',
          variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setAnalysisResults(null); // Clear previous results

    const imagePrompt = `Analyze this image for neurodiversity-friendliness, considering aspects like color contrast, visual complexity, and pattern density. Provide a detailed assessment of its suitability for individuals with neurodevelopmental conditions. Be specific about the elements that may pose challenges or be beneficial.`;
    const textPrompt = `Analyze the following text for neurodiversity-friendliness, considering readability, clarity, and potential for misinterpretation. Provide an overall assessment.\n\nText: ${type === 'text' ? data.content : ''}`;

    try {
      let result: any = null; // Use 'any' for Puter response initially

      if (type === 'image') {
        // Puter Vision call expects prompt, imageURL, options
        result = await window.puter.ai.chat(imagePrompt, data.content, { model: 'gpt-4o' });
      } else if (type === 'text') {
         // Puter text call expects prompt, options
         result = await window.puter.ai.chat(textPrompt, { model: 'gpt-4o' });
      } else {
         throw new Error("Invalid data or type for analysis");
      }

      console.log("Puter API Response:", result); // Log the raw response

      // Extract the text response - adjust based on actual Puter.js response structure
      const analysisText = result?.message?.content || result?.text || (typeof result === 'string' ? result : null);

      if (analysisText) {
         setAnalysisResults({ analysisResult: analysisText });
      } else {
         // Attempt to parse if it's an object without expected fields
         let fallbackText = '';
         if (typeof result === 'object' && result !== null) {
           try {
             fallbackText = JSON.stringify(result);
           } catch {
             fallbackText = 'Received an unparseable object response.';
           }
         } else {
            fallbackText = 'Analysis returned an unexpected or empty result.';
         }
         console.error("Unexpected API Response Structure:", result);
         throw new Error(`Analysis failed: ${fallbackText}`);
      }

    } catch (error) {
      console.error('Analysis Error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during analysis. Please ensure you are logged into Puter and try again.',
        variant: 'destructive',
      });
       setAnalysisResults(null); // Ensure results are cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
       <div className="w-full flex flex-col items-center space-y-8">
        <FileUploader
            onFileSelect={handleFileSelect}
            onAnalysisRequest={handleAnalysisRequest}
            isLoading={isLoading}
        />

        {isLoading && !analysisResults && (
             <Skeleton className="w-full max-w-lg h-64 rounded-lg mt-8" />
        )}


        {!isLoading && analysisResults && (
          <AnalysisResults results={analysisResults} analysisType={fileType} />
        )}
      </div>
    </main>
  );
}

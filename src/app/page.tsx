'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { AnalysisResults, type StructuredAnalysisOutput, type StructuredTextAnalysisOutput } from '@/components/analysis-results'; // Import types
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // Ensure Card is imported
import { AlertTriangle } from 'lucide-react';

// Define Puter types globally for TypeScript
declare global {
  interface Window {
    puter: any; // Use 'any' for simplicity, or define a more specific type if needed
  }
}

// Union type for analysis results state
type AnalysisResultType = StructuredAnalysisOutput | StructuredTextAnalysisOutput | { analysisResult: string } | null;

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResultType>(null); // Use the union type
  const [isLoading, setIsLoading] = useState(false);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check Puter SDK readiness and sign-in status on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.puter) {
        setIsPuterReady(true);
        try {
          const signedInStatus = window.puter.auth.isSignedIn();
          setIsSignedIn(signedInStatus);
          if (!signedInStatus) {
            console.log("Puter: User is not signed in.");
          } else {
             console.log("Puter: User is signed in.");
          }
        } catch (error) {
           console.error("Error checking Puter sign-in status:", error);
           setIsSignedIn(false);
           toast({
              title: 'Puter SDK Error',
              description: 'Could not check Puter sign-in status.',
              variant: 'destructive',
            });
        }
      } else {
        setIsPuterReady(false);
        console.error("Puter SDK not loaded after timeout.");
        toast({
            title: 'Puter SDK Load Error',
            description: 'Puter.js SDK failed to load. Please refresh the page.',
            variant: 'destructive',
          });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [toast]);


  const handleFileSelect = useCallback((file: File | null, type: 'image' | 'text' | null) => {
    setSelectedFile(file);
    setFileType(type);
    setAnalysisResults(null);
  }, []);

 const handleManualSignIn = async () => {
    if (!window.puter) {
       toast({ title: 'Puter SDK Error', description: 'Puter.js SDK not loaded.', variant: 'destructive' });
       return;
    }
    try {
       await window.puter.auth.signIn();
       const signedInStatus = window.puter.auth.isSignedIn();
       setIsSignedIn(signedInStatus);
        if (signedInStatus) {
            toast({ title: 'Sign In Successful', description: 'You are now signed into Puter.' });
        } else {
             toast({ title: 'Sign In Not Completed', description: 'User did not complete the sign-in process.', variant: 'destructive' });
        }
    } catch (error) {
      console.error('Manual sign-in error:', error);
      toast({ title: 'Sign In Error', description: 'Could not initiate Puter sign-in.', variant: 'destructive' });
    }
  };


 const handleAnalysisRequest = useCallback(async (
    data: { content: string },
    type: 'image' | 'text'
  ) => {
    if (!isPuterReady || !window.puter) {
       toast({
          title: 'Puter SDK Not Ready',
          description: 'Puter.js SDK is not available. Please wait or refresh.',
          variant: 'destructive',
        });
        return;
    }

    const currentSignInStatus = window.puter.auth.isSignedIn();
    setIsSignedIn(currentSignInStatus);
    if (!currentSignInStatus) {
       toast({
          title: 'Not Signed In',
          description: 'Please sign into Puter to perform analysis.',
          variant: 'destructive',
        });
         console.warn("Attempting analysis without confirmed sign-in. Puter should prompt.");
    }


    setIsLoading(true);
    setAnalysisResults(null);

    // Image prompt requesting JSON
    const imagePrompt = `Analyze this image for neurodiversity-friendliness. Return the analysis ONLY as a JSON object with the following keys: "colorContrast", "visualComplexity", "patternDensity", "clarityOfInformation", "potentialChallenges", "positiveAspects", "overallSuitability". Each value should be a string providing a detailed assessment for that factor.

Example JSON structure:
{
  "colorContrast": "Assessment of color contrast...",
  "visualComplexity": "Assessment of visual complexity...",
  "patternDensity": "Assessment of pattern density...",
  "clarityOfInformation": "Assessment of how clearly information is presented...",
  "potentialChallenges": "Specific elements that might be challenging...",
  "positiveAspects": "Specific elements that are beneficial...",
  "overallSuitability": "Overall summary of suitability for neurodiverse individuals."
}`;

    // Text prompt requesting JSON
    const textPrompt = `Analyze the following text for neurodiversity-friendliness. Return the analysis ONLY as a JSON object with the following keys: "readability", "clarity", "structure", "tone", "potentialMisinterpretation", "overallAssessment". Each value should be a string providing a detailed assessment for that factor.

Example JSON structure:
{
  "readability": "Assessment of readability (e.g., sentence length, vocabulary)...",
  "clarity": "Assessment of clarity and conciseness...",
  "structure": "Assessment of organization, headings, lists...",
  "tone": "Assessment of the tone (e.g., formal, informal, empathetic)...",
  "potentialMisinterpretation": "Areas prone to misinterpretation...",
  "overallAssessment": "Overall summary of neurodiversity-friendliness."
}

Text to analyze:
${data.content}`;

    try {
      console.log(`Initiating Puter ${type} analysis...`);
      let result: any = null;

      const modelToUse = 'gpt-4o'; // Consistent model for potential JSON output

      if (type === 'image') {
        if (!data.content.startsWith('data:image') && !data.content.startsWith('http')) {
            throw new Error("Invalid image data format for Puter Vision.");
        }
        result = await window.puter.ai.chat(imagePrompt, data.content, { model: modelToUse });
      } else if (type === 'text') {
         result = await window.puter.ai.chat(textPrompt, { model: modelToUse });
      } else {
         throw new Error("Invalid type for analysis");
      }

      console.log("Puter API Raw Response:", result);

      let analysisContent: string | null = null;
       if (result) {
        if (result.message && typeof result.message.content === 'string') {
          analysisContent = result.message.content;
        } else if (typeof result.text === 'string') { // Handle older Puter SDK versions potentially
          analysisContent = result.text;
        } else if (typeof result === 'string') {
           analysisContent = result;
        } else if (result.error && typeof result.error === 'string') {
           throw new Error(`Puter API Error: ${result.error}`);
        } else if (result.message && typeof result.message === 'string' && result.message.toLowerCase().includes('error')) {
             throw new Error(`Puter API Message: ${result.message}`);
        }
      }


      if (analysisContent && analysisContent.trim()) {
         // Clean potential markdown code blocks and attempt JSON parsing
         const cleanedJsonString = analysisContent.replace(/^```json\s*|```$/g, '').trim();
         let parsedResult: any = null;
         let parseError: Error | null = null;

         try {
             parsedResult = JSON.parse(cleanedJsonString);
         } catch (e) {
            parseError = e as Error;
            console.warn(`Failed to parse API response as JSON for ${type}:`, parseError);
         }

         if (parsedResult && typeof parsedResult === 'object') {
             // Check if it matches the expected structure based on type
             if (type === 'image' && typeof parsedResult.overallSuitability === 'string') {
                 console.log("Parsed Structured Image Analysis:", parsedResult);
                 setAnalysisResults(parsedResult as StructuredAnalysisOutput);
             } else if (type === 'text' && typeof parsedResult.overallAssessment === 'string') {
                 console.log("Parsed Structured Text Analysis:", parsedResult);
                 setAnalysisResults(parsedResult as StructuredTextAnalysisOutput);
             } else {
                  // Parsed JSON doesn't match expected structure, fallback to raw text
                  console.log("Parsed JSON did not match expected structure. Falling back to raw text:", analysisContent);
                  setAnalysisResults({ analysisResult: analysisContent });
             }
         } else {
            // Parsing failed or result wasn't an object, treat as a single string result
            console.log(`Setting analysis result as raw text for ${type}:`, analysisContent);
            setAnalysisResults({ analysisResult: analysisContent });
         }

      } else {
         let fallbackText = 'Analysis returned an unexpected or empty result.';
          if (typeof result === 'object' && result !== null) {
            try { fallbackText = `Received unexpected object: ${JSON.stringify(result)}`; } catch { fallbackText = 'Received an unparseable object response.'; }
          } else if (result === null || result === undefined) { fallbackText = 'Analysis returned null or undefined.' }
          else { fallbackText = `Analysis returned unexpected type: ${typeof result}`; }
          console.error("Unexpected or Empty API Response:", result);
          throw new Error(fallbackText);
      }

    } catch (error) {
      console.error('Puter Analysis Error:', error);
       const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
       let toastDescription = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';

       if (errorMsg.includes('auth') || errorMsg.includes('sign in') || errorMsg.includes('permission') || errorMsg.includes('login')) {
            toastDescription = 'Authentication failed or permission denied. Please ensure you are signed into Puter and try again.';
            setIsSignedIn(false);
       } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
           toastDescription = 'A network error occurred. Please check your connection and try again.'
       } else if (errorMsg.includes('model')) {
            toastDescription = `There was an issue with the AI model: ${error instanceof Error ? error.message : String(error)}`
       }

      toast({
        title: 'Analysis Failed',
        description: toastDescription,
        variant: 'destructive',
      });
       setAnalysisResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast, isPuterReady]);


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
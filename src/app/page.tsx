
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { AnalysisResults, type StructuredAnalysisOutput } from '@/components/analysis-results'; // Import type
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Removed AlertCircle import as it's handled in FileUploader now for warnings/prompts
import { AlertTriangle } from 'lucide-react'; // Keep if used elsewhere, or remove

// Define Puter types globally for TypeScript
declare global {
  interface Window {
    puter: any; // Use 'any' for simplicity, or define a more specific type if needed
  }
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // fileType now reflects either the uploaded file type or 'text' if using the text area
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  // Update state to hold potentially structured results
  const [analysisResults, setAnalysisResults] = useState<StructuredAnalysisOutput | { analysisResult: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check Puter SDK readiness and sign-in status on mount
  useEffect(() => {
    // Give Puter SDK a moment to load
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
           setIsSignedIn(false); // Assume not signed in if check fails
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
    }, 500); // Wait 500ms for the SDK script to potentially load

    return () => clearTimeout(timer);
  }, [toast]);


  // This handler is now primarily for tracking what the FileUploader has selected/set
  const handleFileSelect = useCallback((file: File | null, type: 'image' | 'text' | null) => {
    setSelectedFile(file); // Keep track of file if uploaded
    setFileType(type); // Track type (image, text file, or pasted text)
    setAnalysisResults(null); // Clear previous results when selection changes
  }, []);

 const handleManualSignIn = async () => {
    if (!window.puter) {
       toast({ title: 'Puter SDK Error', description: 'Puter.js SDK not loaded.', variant: 'destructive' });
       return;
    }
    try {
       await window.puter.auth.signIn();
       // Re-check status after attempting sign-in
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


 // This function now receives the content (Data URL, file text, or pasted text) directly
 const handleAnalysisRequest = useCallback(async (
    data: { content: string }, // Expect content (Data URL or text string)
    type: 'image' | 'text' // Type is passed from FileUploader
  ) => {
    // Explicitly check Puter readiness and signed-in status
    if (!isPuterReady || !window.puter) {
       toast({
          title: 'Puter SDK Not Ready',
          description: 'Puter.js SDK is not available. Please wait or refresh.',
          variant: 'destructive',
        });
        return;
    }

    // Check sign-in status before proceeding
    const currentSignInStatus = window.puter.auth.isSignedIn();
    setIsSignedIn(currentSignInStatus);
    if (!currentSignInStatus) {
       toast({
          title: 'Not Signed In',
          description: 'Please sign into Puter to perform analysis.',
          variant: 'destructive',
        });
         console.warn("Attempting analysis without confirmed sign-in. Puter should prompt.");
        // Don't return here; let Puter attempt to prompt on the API call
    }


    setIsLoading(true);
    setAnalysisResults(null); // Clear previous results

    // Updated image prompt for structured JSON output
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

    // Text prompt remains the same, using the passed content
    const textPrompt = `Analyze the following text for neurodiversity-friendliness, considering readability, clarity, structure, tone, and potential for misinterpretation. Provide a detailed overall assessment as a single string.\n\nText:\n${data.content}`;

    try {
      console.log(`Initiating Puter ${type} analysis...`);
      let result: any = null; // Use 'any' for Puter response initially

      if (type === 'image') {
        // Puter Vision call expects prompt, imageURL (Data URL), options
        if (!data.content.startsWith('data:image') && !data.content.startsWith('http')) {
            // It's unlikely to get non-Data URL here now, but keep check
            throw new Error("Invalid image data format for Puter Vision.");
        }
        // Use a model capable of vision and structured output if possible (gpt-4o is good)
        result = await window.puter.ai.chat(imagePrompt, data.content, { model: 'gpt-4o' });
      } else if (type === 'text') {
         // Puter text call expects prompt, options
         result = await window.puter.ai.chat(textPrompt, { model: 'gpt-4o' });
      } else {
         throw new Error("Invalid type for analysis"); // Should not happen if FileUploader works correctly
      }

      console.log("Puter API Raw Response:", result); // Log the raw response for debugging

      // Extract and parse the result
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
         if (type === 'image') {
           // Attempt to parse the JSON response for images
           try {
             // Clean potential markdown code blocks
             const cleanedJsonString = analysisContent.replace(/^```json\s*|```$/g, '').trim();
             const parsedResult = JSON.parse(cleanedJsonString) as StructuredAnalysisOutput;
             // Basic validation to check if it looks like the expected structure
             if (parsedResult && typeof parsedResult.overallSuitability === 'string') {
                 console.log("Parsed Structured Analysis:", parsedResult);
                 setAnalysisResults(parsedResult);
             } else {
                  throw new Error("Parsed JSON does not match expected structure.");
             }
           } catch (parseError) {
             console.error("Failed to parse JSON response for image analysis:", parseError);
              console.log("Falling back to raw text analysis:", analysisContent)
             // Fallback: If JSON parsing fails, treat it as a single string result
             setAnalysisResults({ analysisResult: analysisContent });
           }
         } else {
           // For text analysis (from file or textarea), set the result as a simple string
           console.log("Extracted Text Analysis:", analysisContent);
           setAnalysisResults({ analysisResult: analysisContent });
         }
      } else {
         // Handle cases where extraction failed or content is empty
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
       // Check if the error message suggests an authentication issue
       const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
       let toastDescription = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';

       if (errorMsg.includes('auth') || errorMsg.includes('sign in') || errorMsg.includes('permission') || errorMsg.includes('login')) {
            toastDescription = 'Authentication failed or permission denied. Please ensure you are signed into Puter and try again.';
            setIsSignedIn(false); // Update sign-in state if auth error occurs
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
       setAnalysisResults(null); // Ensure results are cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [toast, isPuterReady]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
       <div className="w-full flex flex-col items-center space-y-8">
        {/* SDK readiness warning moved inside FileUploader */}
        {/* Sign-in prompt moved inside FileUploader */}

        <FileUploader
            onFileSelect={handleFileSelect} // Primarily for tracking state now
            onAnalysisRequest={handleAnalysisRequest} // Core analysis trigger
            isLoading={isLoading}
        />

        {isLoading && !analysisResults && (
             <Skeleton className="w-full max-w-lg h-64 rounded-lg mt-8" />
        )}


        {!isLoading && analysisResults && (
          // Pass the potentially structured results to the component
          // analysisType is now set by handleFileSelect, reflecting the source (file or text)
          <AnalysisResults results={analysisResults} analysisType={fileType} />
        )}
      </div>
    </main>
  );
}

    
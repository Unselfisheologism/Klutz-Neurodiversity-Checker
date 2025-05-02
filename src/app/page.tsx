'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // Import Card component
import { AlertCircle } from 'lucide-react';

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
            // Optionally prompt user to sign in if needed immediately,
            // but Puter should prompt automatically on API call.
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


  const handleFileSelect = useCallback((file: File | null, type: 'image' | 'text' | null) => {
    setSelectedFile(file);
    setFileType(type);
    setAnalysisResults(null); // Clear previous results when a new file is selected
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


 const handleAnalysisRequest = useCallback(async (
    data: { content: string }, // Expect content (Data URL or text)
    type: 'image' | 'text'
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
        // Optionally trigger manual sign-in here or rely on Puter's automatic prompt
        // await handleManualSignIn(); // Example: Trigger manually if preferred
        // return; // Stop if not signed in, Puter's auto-prompt might still trigger on the API call itself
         console.warn("Attempting analysis without confirmed sign-in. Puter should prompt.");
    }


    setIsLoading(true);
    setAnalysisResults(null); // Clear previous results

    const imagePrompt = `Analyze this image for neurodiversity-friendliness, considering aspects like color contrast, visual complexity, and pattern density. Provide a detailed assessment of its suitability for individuals with neurodevelopmental conditions. Be specific about the elements that may pose challenges or be beneficial.`;
    const textPrompt = `Analyze the following text for neurodiversity-friendliness, considering readability, clarity, and potential for misinterpretation. Provide an overall assessment.\n\nText: ${type === 'text' ? data.content : ''}`;

    try {
      console.log(`Initiating Puter ${type} analysis...`);
      let result: any = null; // Use 'any' for Puter response initially

      if (type === 'image') {
        // Puter Vision call expects prompt, imageURL, options
        // Ensure data.content is a valid Data URL or accessible public URL for images
        if (!data.content.startsWith('data:image') && !data.content.startsWith('http')) {
            throw new Error("Invalid image data format for Puter Vision.");
        }
        result = await window.puter.ai.chat(imagePrompt, data.content, { model: 'gpt-4o' });
      } else if (type === 'text') {
         // Puter text call expects prompt, options
         result = await window.puter.ai.chat(textPrompt, { model: 'gpt-4o' });
      } else {
         throw new Error("Invalid data or type for analysis");
      }

      console.log("Puter API Raw Response:", result); // Log the raw response for debugging

      // Improved response extraction logic
      let analysisText: string | null = null;
      if (result) {
        // Primary structure (chat completions)
        if (result.message && typeof result.message.content === 'string') {
          analysisText = result.message.content;
        }
        // Alternative structure (direct text response?)
        else if (typeof result.text === 'string') {
          analysisText = result.text;
        }
        // Fallback: if the result itself is a string
        else if (typeof result === 'string') {
          analysisText = result;
        }
         // Fallback: check for common error message structures
         else if (result.error && typeof result.error === 'string') {
           throw new Error(`Puter API Error: ${result.error}`);
         } else if (result.message && typeof result.message === 'string' && result.message.toLowerCase().includes('error')) {
             throw new Error(`Puter API Message: ${result.message}`);
         }
      }


      if (analysisText && analysisText.trim()) {
         console.log("Extracted Analysis Text:", analysisText);
         setAnalysisResults({ analysisResult: analysisText });
      } else {
         // Attempt to parse if it's an object without expected fields
         let fallbackText = 'Analysis returned an unexpected or empty result.';
         if (typeof result === 'object' && result !== null) {
           try {
             fallbackText = `Received unexpected object: ${JSON.stringify(result)}`;
           } catch {
             fallbackText = 'Received an unparseable object response.';
           }
         } else if (result === null || result === undefined) {
             fallbackText = 'Analysis returned null or undefined.'
         } else {
             fallbackText = `Analysis returned unexpected type: ${typeof result}`;
         }
         console.error("Unexpected or Empty API Response:", result);
         throw new Error(fallbackText);
      }

    } catch (error) {
      console.error('Puter Analysis Error:', error);
       // Check if the error message suggests an authentication issue
       const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
       let toastDescription = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';

       if (errorMsg.includes('auth') || errorMsg.includes('sign in') || errorMsg.includes('permission')) {
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
        {/* Show warning if Puter SDK isn't ready */}
        {isPuterReady === false && (
            <Card className="w-full max-w-lg bg-destructive/10 border-destructive text-destructive-foreground p-4">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Puter SDK not loaded. Analysis is unavailable. Please refresh.</span>
                </div>
            </Card>
        )}

         {/* Show sign-in prompt if Puter is ready but user isn't signed in */}
         {isPuterReady && isSignedIn === false && (
            <Card className="w-full max-w-lg bg-yellow-100 border-yellow-500 text-yellow-900 p-4 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <AlertCircle className="h-6 w-6 shrink-0" />
                    <div className="flex-grow text-center sm:text-left">
                        <p className="font-semibold">Sign in Required</p>
                        <p className="text-sm">Please sign in with your Puter account to analyze content.</p>
                    </div>
                    <Button onClick={handleManualSignIn} variant="outline" size="sm" className="bg-background hover:bg-accent dark:bg-foreground dark:text-background dark:hover:bg-accent dark:hover:text-foreground">
                        Sign In with Puter
                    </Button>
                </div>
            </Card>
        )}

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

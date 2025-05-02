
'use client';

import React, { useState, useCallback } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { analyzeImageForNeurodiversity } from '@/ai/flows/analyze-image-neurodiversity';
import { analyzeTextNeurodiversity } from '@/ai/flows/analyze-text-neurodiversity';
import type { AnalyzeImageNeurodiversityOutput, AnalyzeImageNeurodiversityInput } from '@/ai/flows/analyze-image-neurodiversity';
import type { AnalyzeTextNeurodiversityOutput, AnalyzeTextNeurodiversityInput } from '@/ai/flows/analyze-text-neurodiversity';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalyzeImageNeurodiversityOutput | AnalyzeTextNeurodiversityOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File | null, type: 'image' | 'text' | null) => {
    setSelectedFile(file);
    setFileType(type);
    setAnalysisResults(null); // Clear previous results when a new file is selected
  }, []);

 const handleAnalysisRequest = useCallback(async (
    data: AnalyzeImageNeurodiversityInput | AnalyzeTextNeurodiversityInput,
    type: 'image' | 'text'
  ) => {
    setIsLoading(true);
    setAnalysisResults(null); // Clear previous results before starting new analysis

    try {
      let result: AnalyzeImageNeurodiversityOutput | AnalyzeTextNeurodiversityOutput | null = null;
      if (type === 'image' && 'photoDataUri' in data) {
        result = await analyzeImageForNeurodiversity(data);
      } else if (type === 'text' && 'text' in data) {
        result = await analyzeTextNeurodiversity(data);
      } else {
         throw new Error("Invalid data or type for analysis");
      }

      if (result) {
         setAnalysisResults(result);
      } else {
         throw new Error("Analysis returned no result.");
      }

    } catch (error) {
      console.error('Analysis Error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during analysis. Please ensure your API key is configured correctly and try again.',
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

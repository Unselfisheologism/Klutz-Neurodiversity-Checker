
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { AnalyzeImageNeurodiversityOutput } from '@/ai/flows/analyze-image-neurodiversity';
import type { AnalyzeTextNeurodiversityOutput } from '@/ai/flows/analyze-text-neurodiversity';

interface AnalysisResultsProps {
  results: AnalyzeImageNeurodiversityOutput | AnalyzeTextNeurodiversityOutput | null;
  analysisType: 'image' | 'text' | null;
}

// Simple helper to check if analysis suggests friendliness
const isFriendly = (analysis: string | undefined): boolean => {
  if (!analysis) return false;
  const lowerCaseAnalysis = analysis.toLowerCase();
  // Look for positive keywords, avoid negative ones
  return (
    (lowerCaseAnalysis.includes('friendly') || lowerCaseAnalysis.includes('suitable') || lowerCaseAnalysis.includes('accessible') || lowerCaseAnalysis.includes('clear') || lowerCaseAnalysis.includes('good contrast')) &&
    !(lowerCaseAnalysis.includes('challenging') || lowerCaseAnalysis.includes('overwhelming') || lowerCaseAnalysis.includes('low contrast') || lowerCaseAnalysis.includes('complex') || lowerCaseAnalysis.includes('ambiguous'))
  );
};


export function AnalysisResults({ results, analysisType }: AnalysisResultsProps) {
  if (!results || !analysisType) {
    return null;
  }

  let overallAssessment = '';
  let friendly = false;

  if (analysisType === 'image' && 'analysisResult' in results) {
     overallAssessment = results.analysisResult;
     friendly = isFriendly(overallAssessment);
  } else if (analysisType === 'text' && 'neurodiversityAnalysis' in results) {
      overallAssessment = results.neurodiversityAnalysis.overallNeurodiversityFriendliness;
      friendly = isFriendly(overallAssessment);
  }


  return (
    <Card className="w-full max-w-lg mx-auto mt-8 shadow-lg rounded-lg subtle-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-primary flex items-center justify-center gap-2">
          {friendly ? (
             <CheckCircle className="text-green-500" />
           ) : (
             <AlertCircle className="text-orange-500" />
           )}
          Analysis Results ({analysisType === 'image' ? 'Image' : 'Text'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
         {analysisType === 'image' && 'analysisResult' in results && (
           <div>
             <h3 className="font-semibold mb-1">Overall Assessment:</h3>
             <p className="text-muted-foreground whitespace-pre-wrap">{results.analysisResult}</p>
           </div>
         )}
         {analysisType === 'text' && 'neurodiversityAnalysis' in results && (
           <>
             <div>
               <h3 className="font-semibold mb-1">Readability:</h3>
               <p className="text-muted-foreground whitespace-pre-wrap">{results.neurodiversityAnalysis.readability}</p>
             </div>
              <div>
               <h3 className="font-semibold mb-1">Clarity:</h3>
               <p className="text-muted-foreground whitespace-pre-wrap">{results.neurodiversityAnalysis.clarity}</p>
             </div>
              <div>
               <h3 className="font-semibold mb-1">Potential for Misinterpretation:</h3>
               <p className="text-muted-foreground whitespace-pre-wrap">{results.neurodiversityAnalysis.potentialForMisinterpretation}</p>
             </div>
             <hr className="my-4" />
              <div>
               <h3 className="font-semibold mb-1">Overall Neurodiversity Friendliness:</h3>
               <p className="text-muted-foreground whitespace-pre-wrap">{results.neurodiversityAnalysis.overallNeurodiversityFriendliness}</p>
             </div>
           </>
         )}
      </CardContent>
    </Card>
  );
}

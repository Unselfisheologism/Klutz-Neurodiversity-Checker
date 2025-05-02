
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
// Removed Genkit Output type imports

// Simplified input props as Puter.js flow returns a single string
interface AnalysisResultsProps {
  results: { analysisResult: string } | null; // Expecting a simple object with the result string
  analysisType: 'image' | 'text' | null;
}

// Simple helper to check if analysis suggests friendliness
const isFriendly = (analysis: string | undefined): boolean => {
  if (!analysis) return false;
  const lowerCaseAnalysis = analysis.toLowerCase();
  // Basic keyword check (can be refined)
  const positiveKeywords = ['friendly', 'suitable', 'accessible', 'clear', 'good contrast', 'well-structured'];
  const negativeKeywords = ['challenging', 'overwhelming', 'low contrast', 'complex', 'ambiguous', 'difficult', 'confusing', 'visually cluttered'];

  const hasPositive = positiveKeywords.some(kw => lowerCaseAnalysis.includes(kw));
  const hasNegative = negativeKeywords.some(kw => lowerCaseAnalysis.includes(kw));

  // Prioritize negative findings if present
  if (hasNegative) return false;
  if (hasPositive) return true;

  // Default to neutral/uncertain if no clear keywords found
  return false;
};


export function AnalysisResults({ results, analysisType }: AnalysisResultsProps) {
  if (!results || !analysisType || !results.analysisResult) {
    return null;
  }

  const overallAssessment = results.analysisResult;
  const friendly = isFriendly(overallAssessment);

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
         {/* Display the single analysis result directly */}
         <div>
           <h3 className="font-semibold mb-1">Assessment:</h3>
           <p className="text-muted-foreground whitespace-pre-wrap">{overallAssessment}</p>
         </div>
      </CardContent>
    </Card>
  );
}

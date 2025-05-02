
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Palette, Brain, Shapes, Info, AlertTriangle, Smile } from 'lucide-react';

// Define the expected structure for image analysis results
export type StructuredAnalysisOutput = {
  colorContrast: string;
  visualComplexity: string;
  patternDensity: string;
  clarityOfInformation: string;
  potentialChallenges: string;
  positiveAspects: string;
  overallSuitability: string;
};

// Type guard to check if the result is structured
function isStructuredAnalysis(results: any): results is StructuredAnalysisOutput {
  return results && typeof results === 'object' && 'overallSuitability' in results && typeof results.overallSuitability === 'string';
}


// Combined props type
interface AnalysisResultsProps {
  results: StructuredAnalysisOutput | { analysisResult: string } | null; // Can be structured or simple string
  analysisType: 'image' | 'text' | null;
}

// Simple helper to check if overall suitability suggests friendliness
const isFriendly = (analysis: string | undefined): boolean => {
  if (!analysis) return false;
  const lowerCaseAnalysis = analysis.toLowerCase();
  // Basic keyword check on overall suitability
  const positiveKeywords = ['friendly', 'suitable', 'accessible', 'clear', 'good', 'well-suited', 'positive'];
  const negativeKeywords = ['challenging', 'overwhelming', 'difficult', 'confusing', 'unsuitable', 'poor', 'negative', 'concerns'];

  const hasPositive = positiveKeywords.some(kw => lowerCaseAnalysis.includes(kw));
  const hasNegative = negativeKeywords.some(kw => lowerCaseAnalysis.includes(kw));

  // Prioritize negative findings if present
  if (hasNegative) return false;
  if (hasPositive) return true;

  // Default to neutral/uncertain if no clear keywords found
  return false;
};


export function AnalysisResults({ results, analysisType }: AnalysisResultsProps) {
  if (!results || !analysisType) {
    return null;
  }

  const isStructured = isStructuredAnalysis(results);
  const overallAssessment = isStructured ? results.overallSuitability : results.analysisResult;
  const friendly = isFriendly(overallAssessment);

  const renderSection = (title: string, content: string | undefined, Icon: React.ElementType) => {
     if (!content || !content.trim()) return null; // Don't render empty sections
     return (
       <div className="mb-4 last:mb-0">
         <h3 className="font-semibold text-md mb-1 flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
         </h3>
         <p className="text-muted-foreground whitespace-pre-wrap pl-6">{content}</p>
       </div>
     );
  };


  return (
    <Card className="w-full max-w-lg mx-auto mt-8 shadow-lg rounded-lg subtle-fade-in">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-xl font-semibold text-primary flex items-center justify-center gap-3">
          {friendly ? (
             <CheckCircle className="text-green-500 w-6 h-6" />
           ) : (
             <AlertCircle className="text-orange-500 w-6 h-6" />
           )}
          Neurodiversity Friendliness Analysis ({analysisType === 'image' ? 'Image' : 'Text'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm pt-6">
         {isStructured ? (
            <>
              {renderSection("Overall Suitability", results.overallSuitability, Brain)}
              {renderSection("Color Contrast", results.colorContrast, Palette)}
              {renderSection("Visual Complexity", results.visualComplexity, Shapes)}
              {renderSection("Pattern Density", results.patternDensity, Shapes)} {/* Reusing Shapes icon */}
              {renderSection("Clarity of Information", results.clarityOfInformation, Info)}
              {renderSection("Potential Challenges", results.potentialChallenges, AlertTriangle)}
              {renderSection("Positive Aspects", results.positiveAspects, Smile)}
            </>
         ) : (
            // Fallback for text analysis or if image analysis failed JSON parsing
            renderSection("Overall Assessment", results.analysisResult, Brain)
         )}
      </CardContent>
    </Card>
  );
}

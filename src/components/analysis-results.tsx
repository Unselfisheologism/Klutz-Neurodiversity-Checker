import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertCircle, CheckCircle, Palette, Brain, Shapes, Info, AlertTriangle, Smile,
    BookOpen, // Icon for Readability
    Sparkles, // Icon for Clarity
    ListTree, // Icon for Structure
    MessageSquare, // Icon for Tone
    HelpCircle // Icon for Potential Misinterpretation
} from 'lucide-react';

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

// Define the expected structure for text analysis results
export type StructuredTextAnalysisOutput = {
  readability: string;
  clarity: string;
  structure: string;
  tone: string;
  potentialMisinterpretation: string;
  overallAssessment: string;
};

// Type guard to check if the result is structured image analysis
function isStructuredImageAnalysis(results: any): results is StructuredAnalysisOutput {
  return results && typeof results === 'object' && 'overallSuitability' in results && typeof results.overallSuitability === 'string';
}

// Type guard to check if the result is structured text analysis
function isStructuredTextAnalysis(results: any): results is StructuredTextAnalysisOutput {
  return results && typeof results === 'object' && 'overallAssessment' in results && typeof results.overallAssessment === 'string';
}

// Type guard for the simple fallback structure
function isSimpleAnalysisResult(results: any): results is { analysisResult: string } {
     return results && typeof results === 'object' && 'analysisResult' in results && typeof results.analysisResult === 'string';
}


// Combined props type using union
interface AnalysisResultsProps {
  results: StructuredAnalysisOutput | StructuredTextAnalysisOutput | { analysisResult: string } | null;
  analysisType: 'image' | 'text' | null;
}

// Simple helper to check if overall assessment suggests friendliness
const isFriendly = (assessment: string | undefined): boolean => {
  if (!assessment) return false;
  const lowerCaseAnalysis = assessment.toLowerCase();
  const positiveKeywords = ['friendly', 'suitable', 'accessible', 'clear', 'good', 'well-suited', 'positive'];
  const negativeKeywords = ['challenging', 'overwhelming', 'difficult', 'confusing', 'unsuitable', 'poor', 'negative', 'concerns'];

  const hasPositive = positiveKeywords.some(kw => lowerCaseAnalysis.includes(kw));
  const hasNegative = negativeKeywords.some(kw => lowerCaseAnalysis.includes(kw));

  if (hasNegative) return false;
  if (hasPositive) return true;
  return false; // Default to neutral/uncertain
};


export function AnalysisResults({ results, analysisType }: AnalysisResultsProps) {
  if (!results || !analysisType) {
    return null;
  }

  let overallAssessmentText: string | undefined;
  let isResultFriendly = false;

   // Determine overall assessment and friendliness based on result structure
   if (isStructuredImageAnalysis(results)) {
       overallAssessmentText = results.overallSuitability;
       isResultFriendly = isFriendly(overallAssessmentText);
   } else if (isStructuredTextAnalysis(results)) {
       overallAssessmentText = results.overallAssessment;
       isResultFriendly = isFriendly(overallAssessmentText);
   } else if (isSimpleAnalysisResult(results)) {
       overallAssessmentText = results.analysisResult;
       isResultFriendly = isFriendly(overallAssessmentText); // Assess friendliness even for simple text
   }

  const renderSection = (title: string, content: string | undefined, Icon: React.ElementType) => {
     if (!content || !content.trim()) return null;
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
          {isResultFriendly ? (
             <CheckCircle className="text-green-500 w-6 h-6" />
           ) : (
             <AlertCircle className="text-orange-500 w-6 h-6" />
           )}
          Neurodiversity Friendliness Analysis ({analysisType === 'image' ? 'Image' : 'Text'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm pt-6">
         {isStructuredImageAnalysis(results) ? (
            <>
              {renderSection("Overall Suitability", results.overallSuitability, Brain)}
              {renderSection("Color Contrast", results.colorContrast, Palette)}
              {renderSection("Visual Complexity", results.visualComplexity, Shapes)}
              {renderSection("Pattern Density", results.patternDensity, Shapes)}
              {renderSection("Clarity of Information", results.clarityOfInformation, Info)}
              {renderSection("Potential Challenges", results.potentialChallenges, AlertTriangle)}
              {renderSection("Positive Aspects", results.positiveAspects, Smile)}
            </>
         ) : isStructuredTextAnalysis(results) ? (
             <>
              {renderSection("Overall Assessment", results.overallAssessment, Brain)}
              {renderSection("Readability", results.readability, BookOpen)}
              {renderSection("Clarity", results.clarity, Sparkles)}
              {renderSection("Structure", results.structure, ListTree)}
              {renderSection("Tone", results.tone, MessageSquare)}
              {renderSection("Potential for Misinterpretation", results.potentialMisinterpretation, HelpCircle)}
            </>
         ) : isSimpleAnalysisResult(results) ? (
            // Fallback for simple text result (or if JSON parsing failed)
            renderSection("Overall Assessment", results.analysisResult, Brain)
         ) : (
              // Should not happen if results are not null, but good practice
             <p className="text-muted-foreground">Could not display analysis results.</p>
         )}
      </CardContent>
    </Card>
  );
}
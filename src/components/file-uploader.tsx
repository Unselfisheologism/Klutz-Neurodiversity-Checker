
"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, ClipboardPaste, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { Textarea } from "@/components/ui/textarea"; // Import Textarea


// Define Puter types globally for TypeScript - added here for component context as well
declare global {
  interface Window {
    puter: any; // Use 'any' for simplicity, or define a more specific type if needed
  }
}

interface FileUploaderProps {
  onFileSelect: (file: File | null, type: 'image' | 'text' | null) => void;
  // Update expected data type for Puter.js
  onAnalysisRequest: (data: { content: string }, type: 'image' | 'text') => Promise<void>;
  isLoading: boolean;
}

// Expanded accepted image and text types
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];
const ACCEPTED_TEXT_TYPES = [
    'text/plain',
    'application/pdf', // Note: PDF content extraction might need server-side processing or a library. Puter AI might handle some formats directly.
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/html',
    'application/rtf',
    'text/csv'
];
// Combine all accepted types for the file input
const ALL_ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_TEXT_TYPES];

export function FileUploader({ onFileSelect, onAnalysisRequest, isLoading }: FileUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textAreaValue, setTextAreaValue] = useState(''); // State for textarea
  const [isReadingFile, setIsReadingFile] = useState(false); // Track file reading state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetFileState = useCallback(() => {
    setSelectedFile(null);
    setFileType(null);
    setPreview(null);
    setIsReadingFile(false); // Reset reading state
    onFileSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  const resetTextState = useCallback(() => {
    setTextAreaValue('');
    // Also clear file selection when clearing text
    resetFileState();
  }, [resetFileState]);

  const handleTabChange = (value: string) => {
    const newTab = value as 'upload' | 'paste';
    setActiveTab(newTab);
    // Clear the other input type when switching tabs
    if (newTab === 'upload') {
      setTextAreaValue(''); // Clear text when switching to upload
    } else {
      resetFileState(); // Clear file when switching to paste
    }
  };

  const handleFile = useCallback(
    async (file: File | null) => {
      // This should only run if the active tab is 'upload'
      if (activeTab !== 'upload') return;
      resetFileState(); // Reset previous file state first
      if (!file) return;

      // Prioritize image types based on MIME type first
      let determinedFileType: 'image' | 'text' | null = null;
      if (ACCEPTED_IMAGE_TYPES.some(type => file.type === type || file.type.startsWith(type.split('/')[0] + '/'))) {
         determinedFileType = 'image';
      }
      // Then check text types based on MIME type or extension
      else if (ACCEPTED_TEXT_TYPES.some(type => file.type === type || file.name.endsWith(type.split('/')[1])) || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
         determinedFileType = 'text';
      }


      if (!determinedFileType) {
        toast({
          title: 'Unsupported File Type',
          description: `File type "${file.type || 'unknown'}" (${file.name}) is not supported. Please upload a standard image or text document.`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setFileType(determinedFileType);
      onFileSelect(file, determinedFileType);

      // Generate preview for images
      if (determinedFileType === 'image') {
        setIsReadingFile(true); // Start reading state for preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
           setIsReadingFile(false); // End reading state
        };
         reader.onerror = () => {
           toast({ title: "Preview Error", description: "Could not generate image preview.", variant: "destructive" });
           setIsReadingFile(false); // End reading state on error
         };
        reader.readAsDataURL(file);
      } else {
        // For text files, show file icon and name
        setPreview(null); // No visual preview for text, just icon
      }
    },
    [toast, onFileSelect, resetFileState, activeTab] // Added activeTab
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      // Only handle drop if on the 'upload' tab
      if (activeTab !== 'upload') return;
      const file = event.dataTransfer.files?.[0] || null;
      handleFile(file);
    },
    [handleFile, activeTab] // Added activeTab
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only show drag over state if on the 'upload' tab
    if (activeTab === 'upload') {
        setDragOver(true);
    }
  }, [activeTab]); // Added activeTab

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

 const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
        // Prevent pasting if loading
        if (isLoading || isReadingFile) return;

      event.preventDefault();
      const items = event.clipboardData?.items;
      if (!items) return;

      let foundFile: File | null = null;
      let foundText: string | null = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Check for image files first
         if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.some(type => item.type === type || item.type.startsWith(type.split('/')[0] + '/'))) {
          foundFile = item.getAsFile();
          if (foundFile) break; // Take the first image file found
        }
        // Then check for plain text
         else if (item.kind === 'string' && item.type === 'text/plain') {
            // Only capture text if no file was found yet
            if (!foundFile) {
                 foundText = await new Promise<string>((resolve) => item.getAsString(resolve));
                 // Don't break here, prioritize finding a file if possible
            }
        }
         // Add check for other file types if needed (e.g., PDF, DOCX from clipboard)
         else if (item.kind === 'file' && ACCEPTED_TEXT_TYPES.includes(item.type)) {
             // Only capture file if no image was found yet
             if (!foundFile) {
                  foundFile = item.getAsFile();
                  if (foundFile) break; // Take the first recognized text file
             }
         }
      }

      if (foundFile) {
         setActiveTab('upload'); // Switch to upload tab
         setTextAreaValue(''); // Clear text area
         handleFile(foundFile); // Handle the found file
      } else if (foundText !== null) {
         setActiveTab('paste'); // Switch to paste tab
         resetFileState(); // Clear file state
         setTextAreaValue(foundText); // Set text area value
         onFileSelect(null, 'text'); // Inform parent component about text type selection
      } else {
        toast({
          title: 'Paste Error',
          description: 'Could not process pasted content. Please paste an image or plain text.',
          variant: 'destructive',
        });
      }
    },
    [handleFile, toast, isLoading, isReadingFile, resetFileState, onFileSelect] // Add dependencies
  );

  // Add paste event listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


   const handleAnalyzeClick = async () => {
     if (isLoading || isReadingFile) return; // Prevent analysis if busy

     // Determine content and type based on active tab
     let analysisContent: string | null = null;
     let analysisType: 'image' | 'text' | null = null;

     if (activeTab === 'paste') {
       if (!textAreaValue.trim()) {
         toast({ title: "Input Required", description: "Please paste or type text to analyze.", variant: "destructive" });
         return;
       }
       analysisContent = textAreaValue;
       analysisType = 'text';
     } else if (activeTab === 'upload') {
       if (!selectedFile) {
         toast({ title: "File Required", description: "Please select a file to analyze.", variant: "destructive" });
         return;
       }
        analysisType = fileType; // Use the determined fileType
        // File content will be read asynchronously below
     } else {
        toast({ title: "Error", description: "Invalid analysis mode selected.", variant: "destructive" });
        return;
     }


    // Ensure Puter is available before proceeding
    if (!window.puter || !window.puter.ai || !window.puter.ai.chat) {
      toast({
        title: 'Puter SDK Error',
        description: 'Puter AI functionality is not available. Please refresh.',
        variant: 'destructive',
      });
      return;
    }

     // If it's text from the textarea, analyze directly
     if (activeTab === 'paste' && analysisContent && analysisType) {
        try {
            await onAnalysisRequest({ content: analysisContent }, analysisType);
        } catch (error) {
             console.error("Analysis trigger error for text area:", error);
             toast({
               title: 'Analysis Failed',
               description: error instanceof Error ? error.message : 'An error occurred initiating the analysis.',
               variant: 'destructive',
             });
        }
        return; // Analysis initiated for text area
     }

     // If it's a file, read its content first
     if (activeTab === 'upload' && selectedFile && analysisType) {
         setIsReadingFile(true); // Indicate we are reading the file for analysis
         const reader = new FileReader();

         reader.onloadend = async () => {
           try {
             const fileContent = reader.result as string; // Data URL for image, text string for text
             if (!fileContent) {
                 throw new Error("File content could not be read.");
             }
             await onAnalysisRequest({ content: fileContent }, analysisType as 'image' | 'text'); // Pass content and type
           } catch (error) {
              console.error("Analysis trigger error after reading file:", error);
              toast({
                title: 'Analysis Failed',
                description: error instanceof Error ? error.message : 'An error occurred initiating the analysis.',
                variant: 'destructive',
              });
              // Loading state is handled by the parent component's finally block
           } finally {
              setIsReadingFile(false); // Reading for analysis finished (success or fail)
           }
         };

         reader.onerror = () => {
           console.error("FileReader error during analysis preparation");
           toast({
             title: "File Reading Error",
             description: "Could not read the selected file for analysis.",
             variant: "destructive",
           });
            setIsReadingFile(false); // Reset reading state on error
         };

         // Read the file based on its type
         if (analysisType === 'image') {
           reader.readAsDataURL(selectedFile); // Read image as Data URL
         } else {
           reader.readAsText(selectedFile); // Read text file as string
         }
     }
   };

  // Combined loading state check
   const isBusy = isLoading || isReadingFile;
   const canAnalyze = (activeTab === 'upload' && !!selectedFile) || (activeTab === 'paste' && !!textAreaValue.trim());

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-semibold text-primary">NeuroCheck</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted">
                <TabsTrigger value="upload" variant="accent" disabled={isBusy}>Upload File</TabsTrigger> {/* Use accent color */}
                <TabsTrigger value="paste" variant="accent" disabled={isBusy}>Paste Text</TabsTrigger> {/* Use accent color */}
            </TabsList>

            <TabsContent value="upload">
                <div
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors min-h-[200px] ${ // Added min-h
                    dragOver ? 'border-accent bg-accent/10' : 'border-border hover:border-accent' // Use accent for hover/drag
                  } ${selectedFile ? 'border-accent bg-accent/5' : ''} ${isBusy ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                  onDrop={isBusy ? undefined : handleDrop} // Disable drop when busy
                  onDragOver={isBusy ? undefined : handleDragOver} // Disable dragover when busy
                  onDragLeave={isBusy ? undefined : handleDragLeave} // Disable dragleave when busy
                  onClick={() => !isBusy && fileInputRef.current?.click()} // Disable click when busy
                >
                   {/* Loading overlay */}
                    {isReadingFile && !isLoading && ( // Show specifically for file reading
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                            <p className="text-sm text-muted-foreground font-medium">Reading file...</p>
                        </div>
                    )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={ALL_ACCEPTED_TYPES.join(',')} // Use combined list
                    className="hidden"
                    aria-label="File uploader"
                    disabled={isBusy} // Disable input when busy
                  />
                  {selectedFile ? (
                    <div className="text-center">
                      {fileType === 'image' && preview && (
                        <img
                          src={preview}
                          alt="Selected preview"
                          className="max-h-40 rounded-md mb-4 mx-auto shadow-sm"
                          data-ai-hint="uploaded image preview"
                        />
                      )}
                      {fileType === 'text' && (
                         <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      )}
                      <p className="text-sm font-medium truncate max-w-xs text-foreground">{selectedFile.name}</p> {/* Ensure text color */}
                      <p className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(2)} KB)</p>
                       <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetFileState(); }} className="mt-4" disabled={isBusy}>
                        Clear Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="w-12 h-12 mx-auto mb-4 text-accent" /> {/* Use accent for icon */}
                      <p className="font-semibold">Drag & drop file here</p>
                      <p className="text-sm">or click to browse</p>
                      <p className="text-xs mt-1">or paste an image</p> {/* Updated paste hint */}
                      <p className="text-xs mt-3">(Images: PNG, JPG, GIF, etc.)</p>
                      <p className="text-xs">(Text Files: TXT, PDF, DOCX, etc.)</p>
                    </div>
                  )}
                </div>
            </TabsContent>

             <TabsContent value="paste">
                <div className="relative flex flex-col space-y-2">
                     <Textarea
                        placeholder="Paste or type your text here..."
                        value={textAreaValue}
                        onChange={(e) => setTextAreaValue(e.target.value)}
                        className="min-h-[150px] text-base md:text-sm resize-y bg-input text-foreground placeholder:text-muted-foreground" // Adjust styles
                        aria-label="Text input area"
                        disabled={isBusy}
                     />
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={resetTextState}
                        disabled={!textAreaValue || isBusy}
                        aria-label="Clear text area"
                     >
                        <Trash2 className="h-4 w-4" />
                     </Button>
                     <p className="text-xs text-muted-foreground text-right">
                        {textAreaValue.length} characters
                      </p>
                </div>
            </TabsContent>
        </Tabs>


         {/* Progress bar shown only during the actual analysis API call */}
         {isLoading && (
          <Progress value={undefined} className="w-full mt-4 h-2" /> // Indeterminate progress
        )}


        <Button
          onClick={handleAnalyzeClick}
          disabled={!canAnalyze || isBusy} // Disable if no valid input or busy
          className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Analyze selected content"
        >
           {isLoading ? 'Analyzing...' : isReadingFile ? 'Preparing...' : 'Analyze with Puter AI'}
        </Button>
         {/* Inform user about Puter authentication */}
         {!isBusy && !canAnalyze && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Select a file or paste text to analyze. Analysis uses your Puter account.
            </p>
          )}
      </CardContent>
    </Card>
  );
}

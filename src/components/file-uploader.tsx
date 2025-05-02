
"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
// Removed Genkit Input type imports

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
    'application/pdf',
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
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setSelectedFile(null);
    setFileType(null);
    setPreview(null);
    setUploadProgress(null);
    onFileSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = useCallback(
    async (file: File | null) => {
      resetState(); // Reset previous state first
      if (!file) return;

      // Prioritize image types
      const isImageType = ACCEPTED_IMAGE_TYPES.some(type => file.type.startsWith(type.split('/')[0] + '/') || file.type === type);
      const isTextType = ACCEPTED_TEXT_TYPES.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx');

      let determinedFileType: 'image' | 'text' | null = null;
       if (isImageType) {
         determinedFileType = 'image';
       } else if (isTextType) {
         determinedFileType = 'text';
       }


      if (!determinedFileType) {
        toast({
          title: 'Unsupported File Type',
          description: `File type "${file.type || 'unknown'}" is not supported. Please upload a standard image or text document.`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setFileType(determinedFileType);
      onFileSelect(file, determinedFileType);

      // Generate preview
      if (determinedFileType === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For text files, show file icon and name
        setPreview(null); // No visual preview for text, just icon
      }
    },
    [toast, onFileSelect]
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
      const file = event.dataTransfer.files?.[0] || null;
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
        // Prevent pasting if already loading or file selected
        if (isLoading || selectedFile) return;

      event.preventDefault();
      const items = event.clipboardData?.items;
      if (!items) return;

      let foundFile: File | null = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.some(type => item.type.startsWith(type.split('/')[0] + '/'))) {
          foundFile = item.getAsFile();
          if (foundFile) break; // Take the first image file found
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          // Handle pasted text - create a temporary file
          const text = await new Promise<string>((resolve) => item.getAsString(resolve));
          foundFile = new File([text], "pasted_text.txt", { type: "text/plain" });
           if (foundFile) break; // Take the first text found
        }
      }

      if (foundFile) {
        handleFile(foundFile);
      } else {
        toast({
          title: 'Paste Error',
          description: 'Could not process pasted content. Please paste an image or plain text.',
          variant: 'destructive',
        });
      }
    },
    [handleFile, toast, isLoading, selectedFile] // Add dependencies
  );

  // Add paste event listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  const handleAnalyzeClick = async () => {
    if (!selectedFile || !fileType) return;
    // Ensure Puter is available before proceeding
     if (!window.puter) {
       toast({
         title: 'Puter SDK Error',
         description: 'Puter.js SDK not loaded. Please refresh the page.',
         variant: 'destructive',
       });
       return;
     }

    setUploadProgress(0); // Start progress simulation

    try {
      // Use FileReader for both types to handle progress uniformly
      const reader = new FileReader();

      reader.onprogress = (event) => {
         if (event.lengthComputable) {
          // Reading takes first 50%
          const percentLoaded = Math.round((event.loaded / event.total) * 50);
          setUploadProgress(percentLoaded);
        }
      };

      reader.onloadend = async () => {
        const content = reader.result as string; // Data URL for image, text string for text
        setUploadProgress(50); // Reading finished, start AI analysis (next 50%)
        await onAnalysisRequest({ content }, fileType); // Pass content and type
        setUploadProgress(100); // Analysis complete
        setTimeout(() => setUploadProgress(null), 500); // Hide progress bar
      };

       reader.onerror = () => {
         console.error("FileReader error");
         toast({
           title: "File Reading Error",
           description: "Could not read the selected file.",
           variant: "destructive",
         });
          setUploadProgress(null);
          setIsLoading(false); // Ensure loading state is reset
       };

      if (fileType === 'image') {
        reader.readAsDataURL(selectedFile); // Read image as Data URL
      } else {
        reader.readAsText(selectedFile); // Read text file as string
      }

    } catch (error) {
      console.error("Analysis trigger error:", error);
      toast({
        title: 'Analysis Failed',
        description: 'An error occurred before starting the analysis. Please try again.',
        variant: 'destructive',
      });
      setUploadProgress(null); // Reset progress on error
      // No need to call setIsLoading(false) here as it's handled in the main page component's finally block
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-semibold text-primary">NeuroCheck</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors ${
            dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'
          } ${selectedFile ? 'border-primary bg-accent/5' : ''} ${isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
          onDrop={isLoading ? undefined : handleDrop} // Disable drop when loading
          onDragOver={isLoading ? undefined : handleDragOver} // Disable dragover when loading
          onDragLeave={isLoading ? undefined : handleDragLeave} // Disable dragleave when loading
          onClick={() => !isLoading && fileInputRef.current?.click()} // Disable click when loading
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ALL_ACCEPTED_TYPES.join(',')} // Use combined list
            className="hidden"
            aria-label="File uploader"
            disabled={isLoading} // Disable input when loading
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
              <p className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(2)} KB)</p>
               <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetState(); }} className="mt-4" disabled={isLoading}>
                Clear Selection
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <UploadCloud className="w-12 h-12 mx-auto mb-4" />
              <p className="font-semibold">Drag & drop file here</p>
              <p className="text-sm">or click to browse</p>
              <p className="text-xs mt-1">or paste an image or text</p>
              <p className="text-xs mt-3">(Images: PNG, JPG, GIF, WEBP, etc.)</p>
              <p className="text-xs">(Text: TXT, PDF, DOC, DOCX, MD, etc.)</p>
            </div>
          )}
        </div>

         {uploadProgress !== null && (
          <Progress value={uploadProgress} className="w-full mt-4 h-2" />
        )}


        <Button
          onClick={handleAnalyzeClick}
          disabled={!selectedFile || isLoading || uploadProgress !== null}
          className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Analyze selected file"
        >
          {isLoading ? 'Analyzing...' : 'Analyze with Puter AI'}
        </Button>
         {/* Inform user about Puter authentication */}
         {!isLoading && !selectedFile && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Analysis uses your Puter account. You might be asked to sign in.
            </p>
          )}
      </CardContent>
    </Card>
  );
}

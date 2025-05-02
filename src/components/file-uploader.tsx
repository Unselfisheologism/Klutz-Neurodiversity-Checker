
"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
import type { AnalyzeImageNeurodiversityInput } from '@/ai/flows/analyze-image-neurodiversity';
import type { AnalyzeTextNeurodiversityInput } from '@/ai/flows/analyze-text-neurodiversity';

interface FileUploaderProps {
  onFileSelect: (file: File | null, type: 'image' | 'text' | null) => void;
  onAnalysisRequest: (data: AnalyzeImageNeurodiversityInput | AnalyzeTextNeurodiversityInput, type: 'image' | 'text') => Promise<void>;
  isLoading: boolean;
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const ACCEPTED_TEXT_TYPES = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown'];

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

      const determinedFileType = ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? 'image'
        : ACCEPTED_TEXT_TYPES.includes(file.type)
        ? 'text'
        : null;

      if (!determinedFileType) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a supported image (PNG, JPG, WEBP, GIF) or text (TXT, PDF, DOC, DOCX, MD) file.',
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
      event.preventDefault();
      const items = event.clipboardData?.items;
      if (!items) return;

      let foundFile: File | null = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          foundFile = item.getAsFile();
          if (foundFile) break; // Take the first file found
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          // Handle pasted text - create a temporary file
          const text = await new Promise<string>((resolve) => item.getAsString(resolve));
          foundFile = new File([text], "pasted_text.txt", { type: "text/plain" });
           if (foundFile) break;
        }
      }

      if (foundFile) {
        handleFile(foundFile);
      } else {
        toast({
          title: 'Paste Error',
          description: 'Could not process pasted content. Please paste an image or text, or use the upload options.',
          variant: 'destructive',
        });
      }
    },
    [handleFile, toast]
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

    setUploadProgress(0); // Start progress simulation

    try {
      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onprogress = (event) => {
           if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 50); // Reading takes first 50%
            setUploadProgress(percentLoaded);
          }
        };
        reader.onloadend = async () => {
          const photoDataUri = reader.result as string;
          setUploadProgress(50); // Reading finished, start AI analysis (next 50%)
          await onAnalysisRequest({ photoDataUri }, 'image');
          setUploadProgress(100); // Analysis complete
          setTimeout(() => setUploadProgress(null), 500); // Hide progress bar after a short delay
        };
        reader.readAsDataURL(selectedFile);
      } else if (fileType === 'text') {
         const reader = new FileReader();
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentLoaded = Math.round((event.loaded / event.total) * 50);
              setUploadProgress(percentLoaded);
            }
          };
         reader.onloadend = async () => {
           const text = reader.result as string;
            setUploadProgress(50);
           await onAnalysisRequest({ text }, 'text');
           setUploadProgress(100);
           setTimeout(() => setUploadProgress(null), 500);
         };
         reader.readAsText(selectedFile); // Read as text for text files
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: 'Analysis Failed',
        description: 'An error occurred during analysis. Please try again.',
        variant: 'destructive',
      });
      setUploadProgress(null); // Reset progress on error
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-semibold text-primary">NeuroCheck</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'
          } ${selectedFile ? 'border-primary' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_TEXT_TYPES].join(',')}
            className="hidden"
            aria-label="File uploader"
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
               <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetState(); }} className="mt-4">
                Clear Selection
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <UploadCloud className="w-12 h-12 mx-auto mb-4" />
              <p className="font-semibold">Drag & drop file here</p>
              <p className="text-sm">or click to browse</p>
              <p className="text-xs mt-1">or paste from clipboard</p>
              <p className="text-xs mt-3">(Images: PNG, JPG, GIF, WEBP)</p>
              <p className="text-xs">(Text: TXT, PDF, DOC, DOCX, MD)</p>
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
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </Button>
      </CardContent>
    </Card>
  );
}

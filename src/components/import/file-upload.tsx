'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile?: File;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = '.csv',
  maxSizeMB = 5,
  disabled = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Solo file CSV sono accettati';
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File troppo grande (max ${maxSizeMB}MB)`;
    }

    return null;
  }, [maxSizeMB]);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    setError(null);
    onFileRemove();
  }, [onFileRemove]);

  if (selectedFile) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card
        className={`border-2 border-dashed cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <input
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
              id="file-input"
              disabled={disabled}
            />

            <label htmlFor="file-input" className={`cursor-pointer ${disabled ? 'cursor-not-allowed' : ''}`}>
              <Upload className={`mx-auto h-12 w-12 mb-4 ${
                error ? 'text-red-400' : 'text-gray-400'
              }`} />

              <div className="space-y-2">
                <p className={`text-lg font-medium ${
                  error ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {error ? 'Errore file' : 'Carica il file CSV dei tesoretti'}
                </p>

                <p className={`text-sm ${
                  error ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {error || 'Trascina qui il file o clicca per selezionare'}
                </p>
              </div>
            </label>

            {error && (
              <div className="mt-3 flex items-center justify-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-400">
              Formato supportato: CSV • Max {maxSizeMB}MB
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
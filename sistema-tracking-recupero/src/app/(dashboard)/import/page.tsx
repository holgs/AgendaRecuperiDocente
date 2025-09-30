'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Upload, FileText, Database } from 'lucide-react';
import { FileUpload } from '@/components/import/file-upload';
import { DataPreview } from '@/components/import/data-preview';
import { CSVParser } from '@/lib/csv-parser';
import { ImportPreview, ParsedImportRecord, ImportResult } from '@/types/import';

type ImportStep = 'upload' | 'preview' | 'result';

interface SchoolYear {
  id: string;
  name: string;
  isActive: boolean;
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);

  // Load school years on component mount
  React.useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const response = await fetch('/api/school-years');
        const result = await response.json();

        if (response.ok && result.success) {
          setSchoolYears(result.data);

          // Auto-select active school year
          const activeYear = result.data.find((year: SchoolYear) => year.isActive);
          if (activeYear) {
            setSelectedSchoolYear(activeYear.id);
          }
        }
      } catch (error) {
        console.error('Error fetching school years:', error);
      }
    };

    fetchSchoolYears();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);

    try {
      const content = await file.text();
      const previewData = CSVParser.previewImport(content);
      setPreview(previewData);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setCurrentStep('upload');
  }, []);

  const handleImport = useCallback(async (records: ParsedImportRecord[]) => {
    if (!selectedSchoolYear) {
      alert('Seleziona un anno scolastico');
      return;
    }

    setIsLoading(true);

    try {
      const importRecords = records.map(record => ({
        cognome: record.cognome,
        nome: record.nome,
        minutesWeekly: record.minutesWeekly,
        minutesAnnual: record.minutesAnnual,
        modulesAnnual: record.modulesAnnual
      }));

      const response = await fetch('/api/budgets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schoolYearId: selectedSchoolYear,
          records: importRecords,
          importSource: 'csv_upload'
        })
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        setCurrentStep('result');
      } else {
        throw new Error(result.error || 'Errore durante l\'import');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Errore durante l\'import',
        results: { created: 0, updated: 0, errors: ['Errore di connessione'] }
      });
      setCurrentStep('result');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchoolYear]);

  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    setSelectedSchoolYear('');
  }, []);

  const handleBackToPreview = useCallback(() => {
    setCurrentStep('preview');
    setImportResult(null);
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Tesoretti Docenti</h1>
          <p className="text-gray-600 mt-2">
            Carica e importa i dati dei tesoretti docenti da file CSV
          </p>
        </div>

        {/* Breadcrumb/Steps */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${
            currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'upload' ? 'bg-blue-600 text-white' :
              ['preview', 'result'].includes(currentStep) ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              <Upload className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Upload</span>
          </div>

          <div className="h-px w-8 bg-gray-300"></div>

          <div className={`flex items-center space-x-2 ${
            currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'preview' ? 'bg-blue-600 text-white' :
              currentStep === 'result' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Preview</span>
          </div>

          <div className="h-px w-8 bg-gray-300"></div>

          <div className={`flex items-center space-x-2 ${
            currentStep === 'result' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'result' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              <Database className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Import</span>
          </div>
        </div>
      </div>

      {/* Informazioni formato */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Formato CSV richiesto:</strong> Docente; Minuti/Settimana; Tesoretto Annuale (min); Moduli Annui (50 min); Saldo (min)
          <br />
          <strong>Esempio:</strong> Anglini Luigi; 10; 300; 6; 1200
        </AlertDescription>
      </Alert>

      {/* Selezione Anno Scolastico */}
      <Card>
        <CardHeader>
          <CardTitle>Anno Scolastico</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSchoolYear} onValueChange={setSelectedSchoolYear}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Seleziona anno scolastico" />
            </SelectTrigger>
            <SelectContent>
              {schoolYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name} {year.isActive && '(Attivo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Content based on step */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile || undefined}
            disabled={isLoading}
          />

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Elaborazione file in corso...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'preview' && preview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Anteprima Dati</h2>
            <Button variant="outline" onClick={handleFileRemove}>
              Carica Nuovo File
            </Button>
          </div>

          <DataPreview
            preview={preview}
            onImport={handleImport}
            isImporting={isLoading}
          />
        </div>
      )}

      {currentStep === 'result' && importResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {importResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
                <span>Risultato Import</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>{importResult.message}</strong>
                </AlertDescription>
              </Alert>

              {importResult.success && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-md">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.results.created}
                    </div>
                    <div className="text-sm text-gray-600">Record creati</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-md">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.results.updated}
                    </div>
                    <div className="text-sm text-gray-600">Record aggiornati</div>
                  </div>
                </div>
              )}

              {importResult.results.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="font-medium text-red-800 mb-2">Errori:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {importResult.results.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-4">
                <Button onClick={handleReset}>
                  Nuovo Import
                </Button>
                <Button variant="outline" onClick={handleBackToPreview}>
                  Torna alla Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

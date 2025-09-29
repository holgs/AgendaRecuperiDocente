'use client';

import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportPreview, ParsedImportRecord } from '@/types/import';

interface DataPreviewProps {
  preview: ImportPreview;
  onImport: (records: ParsedImportRecord[]) => void;
  isImporting?: boolean;
}

export function DataPreview({ preview, onImport, isImporting = false }: DataPreviewProps) {
  const [showErrors, setShowErrors] = React.useState(true);
  const [showValid, setShowValid] = React.useState(true);

  const validRecords = preview.records.filter(r => r.errors.length === 0);
  const errorRecords = preview.records.filter(r => r.errors.length > 0);

  const filteredRecords = [
    ...(showValid ? validRecords : []),
    ...(showErrors ? errorRecords : [])
  ];

  const canImport = preview.stats.validRows > 0 && preview.errors.length === 0;

  const handleImport = () => {
    if (canImport) {
      onImport(validRecords);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Anteprima Import</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {preview.stats.totalRows}
              </div>
              <div className="text-sm text-gray-500">Righe totali</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {preview.stats.validRows}
              </div>
              <div className="text-sm text-gray-500">Righe valide</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {preview.stats.errorRows}
              </div>
              <div className="text-sm text-gray-500">Righe con errori</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {preview.stats.duplicates}
              </div>
              <div className="text-sm text-gray-500">Duplicati</div>
            </div>
          </div>

          {/* Errori globali */}
          {preview.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Errori nel file:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {preview.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtri */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Mostra:</span>

              <Button
                variant={showValid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowValid(!showValid)}
                className="flex items-center space-x-2"
              >
                {showValid ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Valide ({validRecords.length})</span>
              </Button>

              <Button
                variant={showErrors ? "default" : "outline"}
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center space-x-2"
              >
                {showErrors ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Errori ({errorRecords.length})</span>
              </Button>
            </div>

            <Button
              onClick={handleImport}
              disabled={!canImport || isImporting}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>
                {isImporting
                  ? 'Importazione...'
                  : `Importa ${validRecords.length} record${validRecords.length !== 1 ? 'i' : 'o'}`
                }
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabella dati */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Stato</TableHead>
                  <TableHead>Riga</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead>Min/Sett</TableHead>
                  <TableHead>Min Annui</TableHead>
                  <TableHead>Moduli</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Errori</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow key={`${record.rowIndex}-${index}`}>
                    <TableCell>
                      {record.errors.length === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={record.errors.length === 0 ? "default" : "destructive"}>
                        {record.rowIndex}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">
                        {record.cognome} {record.nome}
                      </div>
                    </TableCell>

                    <TableCell>{record.minutesWeekly || '—'}</TableCell>
                    <TableCell>{record.minutesAnnual || '—'}</TableCell>
                    <TableCell>{record.modulesAnnual || '—'}</TableCell>
                    <TableCell>
                      <span className={record.saldo < 0 ? 'text-red-600 font-medium' : ''}>
                        {record.saldo || '—'}
                      </span>
                    </TableCell>

                    <TableCell>
                      {record.errors.length > 0 && (
                        <div className="space-y-1">
                          {record.errors.map((error, errorIndex) => (
                            <Badge
                              key={errorIndex}
                              variant="destructive"
                              className="text-xs block w-fit"
                            >
                              {error}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
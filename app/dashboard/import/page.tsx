"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileCheck, AlertCircle, Loader2, CheckCircle2, X } from "lucide-react"

type PreviewRow = {
  docente: string
  minutiSettimanali: number
  tesorettoAnnuale: number
  moduliAnnui: number
  saldo: number
}

type ImportError = {
  row: number
  docente?: string
  error: string
}

type ImportWarning = {
  row: number
  docente: string
  message: string
}

type ImportResult = {
  success: boolean
  imported: number
  failed: number
  errors: ImportError[]
  warnings: ImportWarning[]
}

export default function ImportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [schoolYear, setSchoolYear] = useState<string>("")
  const [yearError, setYearError] = useState<string>("")

  function validateYearFormat(value: string): boolean {
    // Format: YYYY-YY (es. 2024-25)
    const regex = /^\d{4}-\d{2}$/
    if (!regex.test(value)) {
      setYearError("Formato non valido. Usa YYYY-YY (es. 2024-25)")
      return false
    }

    const [startYear, endYearShort] = value.split("-")
    const startYearNum = parseInt(startYear)
    const endYearShort2Digits = parseInt(endYearShort)
    const expectedEndYear = (startYearNum + 1) % 100

    if (endYearShort2Digits !== expectedEndYear) {
      setYearError("L'anno finale deve essere successivo all'anno iniziale")
      return false
    }

    setYearError("")
    return true
  }

  function handleYearChange(value: string) {
    setSchoolYear(value)
    if (value.length === 7) {
      validateYearFormat(value)
    } else if (value.length > 7) {
      setYearError("Formato troppo lungo")
    } else {
      setYearError("")
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  function processFile(selectedFile: File) {
    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        variant: "destructive",
        title: "File non valido",
        description: "Seleziona un file CSV",
      })
      return
    }

    setFile(selectedFile)
    setResult(null)

    // Read and parse CSV for preview (using ; separator)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      // Parse rows (skip header)
      const rows: PreviewRow[] = []
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const parts = lines[i].split(";").map(s => s.trim())
        if (parts.length >= 5 && parts[0]) {
          rows.push({
            docente: parts[0],
            minutiSettimanali: Number(parts[1]) || 0,
            tesorettoAnnuale: Number(parts[2]) || 0,
            moduliAnnui: Number(parts[3]) || 0,
            saldo: Number(parts[4]) || 0,
          })
        }
      }
      setPreview(rows)
    }

    reader.readAsText(selectedFile)
  }

  function clearFile() {
    setFile(null)
    setPreview([])
    setResult(null)
  }

  async function handleImport() {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Seleziona un file CSV",
      })
      return
    }

    if (!schoolYear || !validateYearFormat(schoolYear)) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Inserisci un anno scolastico valido (es. 2024-25)",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("schoolYearName", schoolYear)

      const response = await fetch("/api/budgets/import", {
        method: "POST",
        body: formData,
      })

      const data: ImportResult = await response.json()

      setResult(data)

      if (data.success || data.imported > 0) {
        toast({
          title: "Import completato",
          description: `${data.imported} tesoretti importati con successo`,
        })

        // Refresh after successful import
        setTimeout(() => {
          router.refresh()
          clearFile()
        }, 3000)
      } else {
        toast({
          variant: "destructive",
          title: "Import fallito",
          description: `${data.failed} errori riscontrati`,
        })
      }
    } catch (error: any) {
      console.error("Import error:", error)

      toast({
        variant: "destructive",
        title: "Errore import",
        description: error.message || "Errore durante l'import",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Tesoretti</h1>
        <p className="text-muted-foreground">
          Importa i tesoretti docenti da file CSV
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File CSV</CardTitle>
            <CardDescription>
              Trascina il file CSV o clicca per selezionarlo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* School Year Input */}
            <div className="space-y-2">
              <Label htmlFor="school-year">Anno Scolastico</Label>
              <Input
                id="school-year"
                type="text"
                placeholder="2024-25"
                value={schoolYear}
                onChange={(e) => handleYearChange(e.target.value)}
                disabled={isUploading}
                maxLength={7}
                className={yearError ? "border-red-500" : ""}
              />
              {yearError && (
                <p className="text-sm text-red-500">{yearError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formato: YYYY-YY (es. 2024-25)
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium">Clicca per caricare</span> o trascina qui
                </div>
                <p className="text-xs text-muted-foreground">
                  File CSV con separatore punto e virgola (;)
                </p>
              </div>
            </div>

            {file && (
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                <FileCheck className="h-5 w-5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || !schoolYear || !!yearError || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importazione in corso...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importa Tesoretti
                </>
              )}
            </Button>

            {result && (
              <div
                className={`rounded-lg border p-4 ${
                  result.success
                    ? "border-green-600 bg-green-50 dark:bg-green-950"
                    : result.imported > 0
                    ? "border-yellow-600 bg-yellow-50 dark:bg-yellow-950"
                    : "border-red-600 bg-red-50 dark:bg-red-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">
                      {result.imported > 0
                        ? `${result.imported} record importati`
                        : "Import fallito"}
                    </p>
                    {result.failed > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {result.failed} errori
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium mb-1">Errori:</p>
                        <ul className="text-xs space-y-1">
                          {result.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>
                              Riga {error.row}: {error.error}
                            </li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>... e altri {result.errors.length - 5} errori</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {result.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">Avvisi ({result.warnings.length}):</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Istruzioni</CardTitle>
            <CardDescription>
              Come preparare il file CSV per l&apos;import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Formato CSV richiesto:</h4>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs overflow-x-auto">
                <div>Docente;Minuti/Settimana;Tesoretto Annuale (min);Moduli Annui (50min);Saldo (min)</div>
                <div>Rossi Mario;40;1200;24;1200</div>
                <div>Bianchi Laura;25;750;15;750</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Note importanti:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• La prima riga deve contenere le intestazioni</li>
                <li>• Separatore: punto e virgola (;)</li>
                <li>• Formato docente: "Cognome Nome"</li>
                <li>• I docenti vengono creati automaticamente</li>
                <li>• I tesoretti esistenti vengono sovrascritti</li>
                <li>• I moduli durano 50 minuti</li>
                <li>• L&apos;anno scolastico viene creato automaticamente se non esiste</li>
              </ul>
            </div>

            <div className="rounded-lg border border-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-sm">
                  L&apos;import sovrascrive i tesoretti esistenti per l&apos;anno
                  selezionato. Verifica i dati prima di procedere.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Dati</CardTitle>
            <CardDescription>
              Prime {preview.length} righe del file CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Min/Settimana</TableHead>
                  <TableHead>Tesoretto Annuale</TableHead>
                  <TableHead>Moduli Annui</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.docente}</TableCell>
                    <TableCell>{row.minutiSettimanali}</TableCell>
                    <TableCell>{row.tesorettoAnnuale}</TableCell>
                    <TableCell>{row.moduliAnnui}</TableCell>
                    <TableCell>{row.saldo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

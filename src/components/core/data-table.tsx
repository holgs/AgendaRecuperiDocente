'use client'

import React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  useReactTable,
  type Table as ReactTable,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, Download, Eye, EyeOff } from 'lucide-react'

type ExportFormat = 'csv' | 'excel' | 'pdf'

type ExportMatrix = string[][]

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.warn('Impossibile serializzare il valore della cella', error)
      return ''
    }
  }

  return String(value)
}

const getVisibleTableMatrix = <TData,>(table: ReactTable<TData>): ExportMatrix => {
  const visibleColumns = table.getVisibleLeafColumns()

  if (!visibleColumns.length) {
    throw new Error('Nessuna colonna visibile da esportare.')
  }

  const headerRow = visibleColumns.map((column) => {
    const header = column.columnDef.header

    if (typeof header === 'string') {
      return header
    }

    const meta = column.columnDef.meta as { headerLabel?: string } | undefined

    if (meta?.headerLabel) {
      return meta.headerLabel
    }

    return column.id.toString()
  })

  const dataRows = table.getRowModel().rows.map((row) =>
    visibleColumns.map((column) => formatCellValue(row.getValue(column.id)))
  )

  return [headerRow, ...dataRows]
}

const escapeCsvValue = (value: string): string => {
  const needsEscaping = /[",\n\r]/.test(value)
  let escaped = value.replace(/"/g, '""')

  if (needsEscaping) {
    escaped = `"${escaped}"`
  }

  return escaped
}

const matrixToCsv = (matrix: ExportMatrix): string =>
  matrix.map((row) => row.map(escapeCsvValue).join(',')).join('\n')

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

const exportTableToCsv = <TData,>(table: ReactTable<TData>, fileName: string) => {
  if (typeof window === 'undefined') {
    throw new Error('L\'esportazione è disponibile solo lato client.')
  }

  const matrix = getVisibleTableMatrix(table)
  const csvContent = matrixToCsv(matrix)
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  downloadBlob(blob, `${fileName}.csv`)
}

const exportTableToExcel = async <TData,>(
  table: ReactTable<TData>,
  fileName: string
) => {
  if (typeof window === 'undefined') {
    throw new Error('L\'esportazione è disponibile solo lato client.')
  }

  const matrix = getVisibleTableMatrix(table)
  const xlsx = await import('xlsx')
  const worksheet = xlsx.utils.aoa_to_sheet(matrix)
  const workbook = xlsx.utils.book_new()

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Dati')
  xlsx.writeFile(workbook, `${fileName}.xlsx`)
}

const exportTableToPdf = async <TData,>(
  table: ReactTable<TData>,
  fileName: string
) => {
  if (typeof window === 'undefined') {
    throw new Error('L\'esportazione è disponibile solo lato client.')
  }

  const matrix = getVisibleTableMatrix(table)
  const [headerRow, ...dataRows] = matrix

  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFonts = await import('pdfmake/build/vfs_fonts')
  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as any

  if (!pdfMake.vfs) {
    const fonts = (pdfFonts.default ?? pdfFonts) as any
    pdfMake.vfs = fonts.pdfMake.vfs
  }

  const widths = new Array(headerRow.length).fill('*')
  const body = [
    headerRow.map((cell) => ({ text: cell, bold: true })),
    ...dataRows.map((row) => row.map((cell) => ({ text: cell }))),
  ]

  pdfMake.createPdf({
    content: [
      {
        table: {
          headerRows: 1,
          widths,
          body,
        },
      },
    ],
    pageMargins: [40, 60, 40, 60],
  }).download(`${fileName}.pdf`)
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  /**
   * Nome di base utilizzato per i file esportati (senza estensione).
   * @default "export"
   */
  exportFileName?: string
  /**
   * Mostra il selettore per l'esportazione dei dati.
   * @default true
   */
  enableExport?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = '',
  searchPlaceholder = 'Cerca...',
  exportFileName = 'export',
  enableExport = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [isExporting, setIsExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = React.useState('')
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  })

  const handleExport = React.useCallback(
    async (format: ExportFormat) => {
      try {
        setExportError(null)
        setIsExporting(true)

        if (format === 'csv') {
          exportTableToCsv(table, exportFileName)
        } else if (format === 'excel') {
          await exportTableToExcel(table, exportFileName)
        } else {
          await exportTableToPdf(table, exportFileName)
        }
      } catch (error) {
        console.error('Errore durante l\'esportazione della tabella', error)
        setExportError('Si è verificato un errore durante l\'esportazione.')
      } finally {
        setIsExporting(false)
      }
    },
    [exportFileName, table]
  )

  return (
    <div className="space-y-4">
      {/* Header con ricerca e filtri */}
      <div className="flex items-center justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          {/* Column visibility toggle */}
          <Select
            value=""
            onValueChange={(columnId) => {
              table.getColumn(columnId)?.toggleVisibility()
            }}
          >
            <SelectTrigger className="w-[180px]">
              <Eye className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Mostra colonne" />
            </SelectTrigger>
            <SelectContent>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <SelectItem key={column.id} value={column.id}>
                      <div className="flex items-center space-x-2">
                        {column.getIsVisible() ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                        <span>{column.id}</span>
                      </div>
                    </SelectItem>
                  )
                })}
            </SelectContent>
          </Select>

          {/* Export dropdown */}
          {enableExport && (
            <Select
              value={selectedFormat}
              onValueChange={async (format) => {
                setSelectedFormat(format)
                try {
                  await handleExport(format as ExportFormat)
                } finally {
                  setSelectedFormat('')
                }
              }}
              disabled={isExporting}
            >
              <SelectTrigger className="w-[150px]" aria-busy={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                <SelectValue
                  placeholder={isExporting ? 'Esportazione...' : 'Esporta'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {exportError && (
        <p className="text-sm text-destructive" role="alert">
          {exportError}
        </p>
      )}

      {/* Tabella */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanSort() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-4 w-4 p-0"
                          onClick={() => header.column.toggleSorting()}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              header.column.getIsSorted() === 'desc'
                                ? 'rotate-180'
                                : header.column.getIsSorted() === 'asc'
                                ? 'rotate-0'
                                : 'opacity-50'
                            }`}
                          />
                        </Button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nessun risultato trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} di{' '}
          {table.getFilteredRowModel().rows.length} righe selezionate.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Precedente
          </Button>
          <div className="flex items-center justify-center text-sm font-medium">
            Pagina {table.getState().pagination.pageIndex + 1} di{' '}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Successiva
          </Button>
        </div>
      </div>
    </div>
  )
}
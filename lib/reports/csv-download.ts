import Papa from "papaparse"

/**
 * Trigger a browser download of `rows` as a semicolon-separated CSV (Italian
 * Excel friendly), with a UTF-8 BOM so accented characters render correctly.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = Papa.unparse(rows, { delimiter: ";" })
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

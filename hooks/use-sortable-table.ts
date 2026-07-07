"use client"

import { useMemo, useState } from "react"

export type SortDirection = "asc" | "desc"

export type SortValue = string | number | null | undefined

/** Map of column key -> function returning the value to sort that column by. */
export type SortAccessors<T> = Record<string, (row: T) => SortValue>

export interface SortState {
  key: string
  direction: SortDirection
}

function compareValues(a: SortValue, b: SortValue): number {
  // Nulls / undefined always sort last, regardless of direction handling below.
  const aEmpty = a === null || a === undefined || a === ""
  const bEmpty = b === null || b === undefined || b === ""
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (typeof a === "number" && typeof b === "number") {
    return a - b
  }

  return String(a).localeCompare(String(b), "it", {
    numeric: true,
    sensitivity: "base",
  })
}

/**
 * Client-side sorting for a data table. Returns the sorted rows plus the current
 * sort state and a toggler. Pair with <SortableTableHead> for the header UI.
 *
 * Empty values are always ordered last; clicking a sorted column flips direction.
 */
export function useSortableTable<T>(
  data: T[],
  accessors: SortAccessors<T>,
  initial?: SortState
) {
  const [sort, setSort] = useState<SortState | null>(initial ?? null)

  const sorted = useMemo(() => {
    if (!sort) return data
    const accessor = accessors[sort.key]
    if (!accessor) return data

    const factor = sort.direction === "asc" ? 1 : -1
    // Copy first so we never mutate the source array (immutability).
    return [...data].sort((a, b) => {
      const base = compareValues(accessor(a), accessor(b))
      // Keep empty-last behavior stable in both directions.
      if (base === 0) return 0
      const aEmpty = accessor(a) === null || accessor(a) === undefined || accessor(a) === ""
      const bEmpty = accessor(b) === null || accessor(b) === undefined || accessor(b) === ""
      if (aEmpty || bEmpty) return base
      return base * factor
    })
  }, [data, sort, accessors])

  function requestSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      }
      return { key, direction: "asc" }
    })
  }

  return {
    sorted,
    sortKey: sort?.key ?? null,
    sortDirection: sort?.direction ?? null,
    requestSort,
  }
}

"use client"

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SortDirection } from "@/hooks/use-sortable-table"

interface SortableTableHeadProps {
  label: string
  sortKey: string
  activeKey: string | null
  direction: SortDirection | null
  onSort: (key: string) => void
  className?: string
}

/**
 * A clickable table header that toggles sorting for its column. Visual style
 * matches the existing shadcn TableHead; shows an arrow for the active column.
 */
export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = activeKey === sortKey
  const Icon = isActive ? (direction === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
        aria-label={`Ordina per ${label}`}
      >
        <span>{label}</span>
        <Icon className={cn("h-3.5 w-3.5", isActive ? "opacity-100" : "opacity-50")} />
      </button>
    </TableHead>
  )
}

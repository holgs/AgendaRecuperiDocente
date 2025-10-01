import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function calculateModules(minutes: number): number {
  return Number((minutes / 50).toFixed(2))
}

export function calculatePercentageUsed(used: number, total: number): number {
  if (total === 0) return 0
  return Number(((used / total) * 100).toFixed(1))
}

export function getBudgetStatus(percentageUsed: number): 'success' | 'warning' | 'critical' {
  if (percentageUsed < 50) return 'success'
  if (percentageUsed < 80) return 'warning'
  return 'critical'
}

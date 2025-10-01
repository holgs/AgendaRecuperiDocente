"use client"

import * as React from "react"
import { Paintbrush } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#64748b", // slate
]

interface ColorPickerProps {
  value?: string
  onChange?: (color: string) => void
  disabled?: boolean
}

export function ColorPicker({ value = "#3b82f6", onChange, disabled }: ColorPickerProps) {
  const [customColor, setCustomColor] = React.useState(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleColorChange = (color: string) => {
    setCustomColor(color)
    onChange?.(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange?.(newColor)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex w-full items-center gap-2">
            <div
              className="h-4 w-4 rounded-sm border"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1">{value}</span>
            <Paintbrush className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#000000"
              className="flex-1 font-mono text-xs"
              maxLength={7}
            />
            <div
              className="h-8 w-8 rounded-md border"
              style={{ backgroundColor: customColor }}
            />
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-md border-2 transition-all hover:scale-110",
                  value === color ? "border-foreground" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  handleColorChange(color)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

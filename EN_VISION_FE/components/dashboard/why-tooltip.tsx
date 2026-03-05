"use client"

import { Info } from "lucide-react"

interface WhyTooltipProps {
  causes: string[]
  severity: string
  model?: string
}

export function WhyTooltip({ causes, severity, model }: WhyTooltipProps) {
  return (
    <div className="relative group">
      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />

      <div className="absolute z-50 hidden group-hover:block w-64 p-3 rounded-lg bg-background border border-border shadow-md text-xs">
        <p className="font-medium text-foreground mb-1">Why detected?</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          {causes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        {model && (
          <p className="mt-2 text-muted-foreground">
            Model: <span className="font-medium">{model}</span>
          </p>
        )}
        <p className="mt-1 text-muted-foreground">Severity: {severity}</p>
      </div>
    </div>
  )
}

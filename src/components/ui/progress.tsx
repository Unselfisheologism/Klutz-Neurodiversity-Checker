"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { value?: number | null | undefined } // Allow undefined/null for value
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    {/* Conditionally render the indicator only if value is a number */}
    {typeof value === 'number' && (
       <ProgressPrimitive.Indicator
         className="h-full w-full flex-1 bg-primary transition-all"
         style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
       />
     )}
     {/* Add styling for indeterminate state if needed, e.g., pulsing background */}
     {(value === null || value === undefined) && (
        <div className="absolute h-full w-full bg-primary/30 animate-pulse" />
     )}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

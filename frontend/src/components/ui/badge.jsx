import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "border-transparent bg-accent/20 text-accent": variant === "default" || !variant,
          "border-white/10 bg-white/5 text-zinc-300": variant === "secondary",
          "border-transparent bg-red-500/15 text-red-400": variant === "destructive",
          "border-white/10 text-zinc-400": variant === "outline",
        },
        className
      )}
      {...props}
    ></div>
  )
})
Badge.displayName = "Badge"

export { Badge }

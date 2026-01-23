import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[#01DEB2] text-zinc-900 shadow hover:bg-[#00c9a0]":
            variant === "default" || !variant,
          "border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700":
            variant === "secondary",
          "border-transparent bg-red-900/50 text-red-400 shadow hover:bg-red-900/70":
            variant === "destructive",
          "border-zinc-600 text-zinc-100": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }

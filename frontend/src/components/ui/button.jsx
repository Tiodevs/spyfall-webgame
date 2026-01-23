import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#01DEB2] text-zinc-900 shadow hover:bg-[#00c9a0]",
        destructive:
          "bg-zinc-800 text-red-400 border border-red-400/30 shadow-sm hover:bg-red-950 hover:text-red-300",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-100 shadow-sm hover:bg-zinc-800",
        secondary:
          "bg-zinc-800 text-zinc-100 shadow-sm hover:bg-zinc-700",
        ghost: "text-zinc-100 hover:bg-zinc-800",
        link: "text-[#01DEB2] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }

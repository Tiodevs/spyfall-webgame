import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-black shadow-lg hover:bg-accent-hover glow-accent",
        destructive:
          "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        outline:
          "border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10",
        secondary:
          "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
        ghost: "text-zinc-300 hover:bg-white/5 hover:text-white",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
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

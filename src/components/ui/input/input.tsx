import * as React from "react"
import { cn } from "@/lib/utils"
import './input.css'

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "ui-input",
        "ui-input-2",
        "ui-input-3",
        className
      )}
      {...props}
    />
  )
}

export { Input }

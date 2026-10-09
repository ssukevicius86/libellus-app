import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import './button.css'

const buttonVariants = cva(
  "ui-button",
  {
    variants: {
      variant: {
        default: "ui-button--variant-default",
        destructive:
          "ui-button--variant-destructive",
        outline:
          "ui-button--variant-outline",
        secondary:
          "ui-button--variant-secondary",
        ghost:
          "ui-button--variant-ghost",
        link: "ui-button--variant-link",
      },
      size: {
        default: "ui-button--size-default",
        xs: "ui-button--size-xs",
        sm: "ui-button--size-sm",
        lg: "ui-button--size-lg",
        icon: "ui-button--size-icon",
        "icon-xs": "ui-button--size-icon-xs",
        "icon-sm": "ui-button--size-icon-sm",
        "icon-lg": "ui-button--size-icon-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

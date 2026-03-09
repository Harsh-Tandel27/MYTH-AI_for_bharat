import * as React from "react"

import { cn } from "@/lib/utils"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-border bg-black text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:inset_0px_-2px_0px_0px_#0b1220,_0px_1px_6px_0px_rgba(3,_5,_10,_0.3)] hover:[box-shadow:inset_0px_-2px_0px_0px_#111827,_0px_1px_6px_0px_rgba(3,_5,_10,_0.4)] transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
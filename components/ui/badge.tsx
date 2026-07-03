import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Badge({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white",
        className
      )}
      style={style}
      {...props}
    />
  );
}

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

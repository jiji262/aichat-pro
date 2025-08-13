import React, { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder = "Enter text",
  className = "",
  ...props
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={cn(
        "px-4 py-2 w-full border-2 border-border shadow-retro-sm bg-input text-foreground transition focus:outline-none focus:shadow-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground",
        props["aria-invalid"] && "border-destructive text-destructive shadow-retro-xs",
        className
      )}
      {...props}
    />
  );
};

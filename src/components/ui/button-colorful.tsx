import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ButtonColorfulProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const ButtonColorful = React.forwardRef<
  HTMLButtonElement,
  ButtonColorfulProps
>(({ className, children, label, icon, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        "relative h-10 px-4 overflow-hidden rounded-full font-bold",
        "bg-zinc-900 dark:bg-zinc-100",
        "transition-all duration-200",
        "group shadow-md hover:shadow-lg active:scale-95 border border-white/20 dark:border-zinc-800",
        className
      )}
      {...props}
    >
      {/* Gradient background effect */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
          "opacity-60 group-hover:opacity-100",
          "blur-xs transition-opacity duration-500"
        )}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2 text-white dark:text-zinc-900 font-extrabold z-10">
        {children ? (
          children
        ) : (
          <>
            <span>{label || "Explore Components"}</span>
            {icon}
          </>
        )}
      </div>
    </Button>
  );
});

ButtonColorful.displayName = "ButtonColorful";

export default ButtonColorful;

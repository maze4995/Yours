import { cn } from "@/lib/utils";

interface MockupProps {
  className?: string;
  children: React.ReactNode;
}

export function Mockup({ className, children }: MockupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card",
        className,
      )}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border/50 bg-muted/60 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <div className="h-3 w-3 rounded-full bg-green-400/60" />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="w-56 rounded-md border border-border/30 bg-background/60 px-4 py-1 text-center text-xs text-muted-foreground">
            yours.app/results
          </div>
        </div>
        <div className="w-[54px]" />
      </div>
      <div>{children}</div>
    </div>
  );
}

import { Sparkles } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display font-bold text-base tracking-tight">Aurora</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Ops AI</span>
      </div>
    </div>
  );
}

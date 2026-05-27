import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/10 bg-white/[0.035]", className)}>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{delta}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-zinc-300">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

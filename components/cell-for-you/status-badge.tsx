import { Badge } from "@/components/ui/badge";
import type { CallStatus, CampaignStatus } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

const statusLabels: Record<CallStatus | CampaignStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  finding_leads: "Finding leads",
  calling: "Calling",
  paused: "Paused",
  completed: "Completed",
  queued: "Queued",
  interested: "Interested",
  booked: "Booked",
  callback: "Callback",
  not_interested: "Not interested",
  do_not_call: "Do not call",
  failed: "Failed",
};

const statusClasses: Partial<Record<CallStatus | CampaignStatus, string>> = {
  booked: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  interested: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  callback: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  calling: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  finding_leads: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  queued: "border-white/15 bg-white/5 text-zinc-300",
  ready: "border-white/15 bg-white/5 text-zinc-300",
  not_interested: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  do_not_call: "border-red-400/30 bg-red-400/10 text-red-200",
  failed: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CallStatus | CampaignStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusClasses[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  );
}

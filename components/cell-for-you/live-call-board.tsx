import { Activity, Clock3, RadioTower } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Lead } from "@/lib/domain/schemas";
import { StatusBadge } from "./status-badge";

export function LiveCallBoard({ leads }: { leads: Lead[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live call board</CardTitle>
            <CardDescription>
              Real-time call states will stream from Twilio and ElevenLabs.
            </CardDescription>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            System armed
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-muted-foreground">
            No active calls. Calls will appear after leads are selected and
            `/api/calls/start` successfully queues provider calls.
          </div>
        ) : (
          leads.map((lead, index) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                  {lead.status === "calling" ? (
                    <RadioTower className="size-4 text-violet-200" />
                  ) : lead.status === "queued" ? (
                    <Clock3 className="size-4 text-zinc-300" />
                  ) : (
                    <Activity className="size-4 text-sky-200" />
                  )}
                  {lead.status === "calling" ? (
                    <span className="absolute inset-0 animate-ping rounded-full border border-violet-300/25" />
                  ) : null}
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{lead.businessName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Agent {index + 1} · {lead.phone}
                  </p>
                </div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

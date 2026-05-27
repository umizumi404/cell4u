import { FileAudio, MessageSquareText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Call } from "@/lib/domain/schemas";
import { StatusBadge } from "./status-badge";

export function CallTranscript({ call }: { call: Call | null }) {
  if (!call) {
    return (
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <CardTitle>Call transcript</CardTitle>
          <CardDescription>
            Conversation evidence, summary, and outcome classification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-muted-foreground">
            No call selected. Completed provider conversations will populate this
            panel after webhooks arrive.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Call transcript</CardTitle>
            <CardDescription>
              Conversation evidence, summary, and outcome classification.
            </CardDescription>
          </div>
          <StatusBadge status={call.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <MessageSquareText className="size-3.5" />
            Summary
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-200">{call.summary}</p>
        </div>
        <ScrollArea className="h-40 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm leading-7 text-zinc-300">{call.transcript}</p>
        </ScrollArea>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-muted-foreground">
          <FileAudio className="size-4" />
          Recording URL will appear here after the provider webhook completes.
        </div>
      </CardContent>
    </Card>
  );
}

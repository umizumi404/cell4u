import {
  CheckCircle2,
  PhoneCall,
  Radio,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceSetup } from "@/components/cell-for-you/voice-setup";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Radio className="size-4 text-zinc-100" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Cell For You</p>
              <p className="text-xs text-muted-foreground">
                Autonomous outbound sales
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
              Setup mode
            </Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-zinc-200" />
              Voice in. Campaign out.
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-zinc-50 sm:text-5xl">
              Build an outbound campaign without typing.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Start by recording the offer, audience, location, and success
              criteria. The app will then generate the campaign, find leads,
              start calls, and wait for provider webhooks to fill the dashboard.
            </p>

            <div className="mt-8 space-y-3">
              <FlowStep
                icon={Sparkles}
                title="1. Capture campaign"
                description="Voice transcript becomes a structured campaign and sales prompt."
                state="active"
              />
              <FlowStep
                icon={Search}
                title="2. Find leads"
                description="Google Places returns phone-qualified businesses for the selected market."
              />
              <FlowStep
                icon={PhoneCall}
                title="3. Start calls"
                description="ElevenLabs agents call leads and Twilio/ElevenLabs webhooks update outcomes."
              />
            </div>
          </div>
          <VoiceSetup />
        </div>

        <Card className="mt-8 border-white/10 bg-white/[0.025]">
          <CardHeader>
            <CardTitle>Campaign workspace</CardTitle>
            <CardDescription>
              This area stays empty until a real campaign is created. No demo
              rows, fake calls, or inflated metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <EmptyStage title="Campaign" description="Waiting for voice setup." />
            <EmptyStage title="Leads" description="Run lead discovery next." />
            <EmptyStage title="Calls" description="Call activity appears here." />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function FlowStep({
  icon: Icon,
  title,
  description,
  state = "waiting",
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  state?: "active" | "waiting";
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
        {state === "active" ? (
          <Icon className="size-4 text-zinc-100" />
        ) : (
          <Icon className="size-4 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyStage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4">
      <CheckCircle2 className="size-4 text-muted-foreground" />
      <p className="mt-4 text-sm font-medium text-zinc-100">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

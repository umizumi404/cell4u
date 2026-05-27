import { CheckCircle2, MapPin, Target, WalletCards } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Campaign } from "@/lib/domain/schemas";
import { StatusBadge } from "./status-badge";

export function CampaignSummary({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) {
    return (
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <CardTitle>Campaign intelligence</CardTitle>
          <CardDescription>
            The spoken idea converted into a structured outbound motion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-muted-foreground">
            No campaign yet. Record or paste the pitch to generate the campaign
            brief and prompt.
          </div>
        </CardContent>
      </Card>
    );
  }

  const facts = [
    {
      icon: Target,
      label: "Audience",
      value: campaign.targetCustomer,
    },
    {
      icon: WalletCards,
      label: "Offer",
      value: campaign.offer,
    },
    {
      icon: MapPin,
      label: "Search area",
      value: campaign.location ?? "No location set",
    },
    {
      icon: CheckCircle2,
      label: "Success",
      value: campaign.successCriteria ?? "Qualified interest",
    },
  ];

  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Campaign intelligence</CardTitle>
            <CardDescription>
              The spoken idea converted into a structured outbound motion.
            </CardDescription>
          </div>
          <StatusBadge status={campaign.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <fact.icon className="size-3.5" />
                {fact.label}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-100">{fact.value}</p>
            </div>
          ))}
        </div>
        <Separator className="my-4 bg-white/10" />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Agent opener
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-200">
            {campaign.generatedPrompt?.opener}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

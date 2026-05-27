import { Globe2, Phone, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead } from "@/lib/domain/schemas";
import { StatusBadge } from "./status-badge";

export function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader>
        <CardTitle>Lead pipeline</CardTitle>
        <CardDescription>
          Google Places results filtered for reachable businesses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-muted-foreground">
            Lead discovery has not run yet. Create a campaign, then search
            Google Places for businesses with reachable phone numbers.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Business</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="border-white/10">
                  <TableCell>
                    <div className="font-medium text-zinc-100">
                      {lead.businessName}
                    </div>
                    <div className="mt-1 max-w-52 truncate text-xs text-muted-foreground">
                      {lead.address}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="size-3 text-amber-200" />
                        {lead.rating ?? "N/A"} · {lead.userRatingCount ?? 0} reviews
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe2 className="size-3" />
                        {lead.website ? "Website found" : "No website"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3" />
                      {lead.phone}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

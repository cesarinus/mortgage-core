import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function ComingSoonSection({ title, blurb }: { title: string; blurb?: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{blurb ?? "This module is being built out as part of the new Settings Control Center."}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Coming soon</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Hook into the new dynamic CRM Field Builder, Lead Sources, and Pipeline Stages — all shipped from this same control center.
        </CardContent>
      </Card>
    </div>
  );
}
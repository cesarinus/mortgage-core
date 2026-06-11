import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bug, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface Props { leadId: string; refreshKey?: number }

interface LogRow {
  id: string;
  status: string;
  export_system: string | null;
  payload: any;
  response: any;
  validation_errors: any;
  created_at: string;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "success") return "default";
  if (status === "failed" || status === "invalid") return "destructive";
  return "secondary";
}

export default function ExportDebugPanel({ leadId, refreshKey }: Props) {
  const [log, setLog] = useState<LogRow | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("lead_export_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setLog(data ?? null);
    })();
    return () => { active = false; };
  }, [leadId, refreshKey]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" /> Export debug
                {log && <Badge variant={statusVariant(log.status)} className="capitalize">{log.status}</Badge>}
              </span>
              <ChevronDown className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="text-xs space-y-2">
            {!log ? (
              <p className="text-muted-foreground">No export attempts yet.</p>
            ) : (
              <>
                <div className="text-muted-foreground">
                  Last attempt: {format(new Date(log.created_at), "PPp")} · system {log.export_system ?? "arive"}
                </div>
                <Tabs defaultValue="payload">
                  <TabsList className="grid grid-cols-4 h-8">
                    <TabsTrigger value="payload" className="text-[11px]">Payload</TabsTrigger>
                    <TabsTrigger value="errors" className="text-[11px]">Errors</TabsTrigger>
                    <TabsTrigger value="arive" className="text-[11px]">ARIVE</TabsTrigger>
                    <TabsTrigger value="zapier" className="text-[11px]">Zapier</TabsTrigger>
                  </TabsList>
                  <TabsContent value="payload">
                    <pre className="bg-muted/40 border rounded p-2 max-h-56 overflow-auto text-[10px]">
{JSON.stringify(log.payload ?? {}, null, 2)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="errors">
                    <pre className="bg-muted/40 border rounded p-2 max-h-56 overflow-auto text-[10px]">
{JSON.stringify(log.validation_errors ?? [], null, 2)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="arive">
                    <pre className="bg-muted/40 border rounded p-2 max-h-56 overflow-auto text-[10px]">
{JSON.stringify(log.response?.arive ?? log.response ?? {}, null, 2)}
                    </pre>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ARIVE responses surface here once Zapier returns the loan ID via the inbound webhook.
                    </p>
                  </TabsContent>
                  <TabsContent value="zapier">
                    <pre className="bg-muted/40 border rounded p-2 max-h-56 overflow-auto text-[10px]">
{JSON.stringify(log.response?.zapier ?? { note: "no-cors POST — see Zap history for delivery status" }, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

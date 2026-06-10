import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings2, FlaskConical, FileSearch, ListChecks } from "lucide-react";

export default function AriveSection() {
  return (
    <div className="max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">ARIVE LOS</h1><p className="text-muted-foreground text-sm">Mapping, payload testing, schema gap analysis, and integration logs.</p></div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { to: "/settings/los-mappings", icon: Settings2, title: "Field Mappings", desc: "CRM → ARIVE field map" },
          { to: "/settings/los-tester", icon: FlaskConical, title: "Payload Tester", desc: "Preview + send test payloads" },
          { to: "/settings/los-gap-report", icon: FileSearch, title: "Schema Gap Report", desc: "Find missing/null fields" },
          { to: "/settings/los-logs", icon: ListChecks, title: "Integration Logs", desc: "Every Send-to-LOS call" },
        ].map((c) => (
          <Card key={c.to}>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><c.icon className="h-4 w-4 text-primary" /> {c.title}</CardTitle><CardDescription>{c.desc}</CardDescription></CardHeader>
            <CardContent><Button asChild size="sm" variant="outline"><Link to={c.to}>Open</Link></Button></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ARIVE_FIELD_MAP } from "@/lib/los/ariveFieldMap";

function validationRule(type: string): string {
  switch (type) {
    case "email": return "Valid email address";
    case "phone": return "10 numeric digits";
    case "money": return "Numeric (decimals allowed)";
    case "number": return "Numeric";
    case "fico": return "Integer 300–850 (range midpoint accepted)";
    case "enum": return "Allowed enum value";
    case "date": return "ISO 8601 datetime";
    default: return "Non-empty string";
  }
}

export default function AriveExportMappings() {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ARIVE Export Mapping</h1>
        <p className="text-muted-foreground text-sm">
          Source of truth for the flat Zapier → ARIVE payload. Updates here flow into the validator and the lead preview dialog.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Field map</CardTitle>
          <CardDescription>Mortgage Core field → Zapier field → ARIVE field</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-2 font-medium">Mortgage Core Field</th>
                <th className="p-2 font-medium">Zapier / ARIVE Field</th>
                <th className="p-2 font-medium">Type</th>
                <th className="p-2 font-medium">Required</th>
                <th className="p-2 font-medium">Validation Rule</th>
                <th className="p-2 font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {ARIVE_FIELD_MAP.map((f) => (
                <tr key={f.ariveField} className="border-b last:border-0">
                  <td className="p-2">
                    <div className="font-medium">{f.crmField}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{f.crmPath}</div>
                  </td>
                  <td className="p-2 font-mono">{f.ariveField}</td>
                  <td className="p-2 capitalize">{f.type}</td>
                  <td className="p-2">
                    {f.required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}
                  </td>
                  <td className="p-2">{validationRule(f.type)}{f.enumValues ? ` (${f.enumValues.join(", ")})` : ""}</td>
                  <td className="p-2 font-mono text-[11px]">{f.defaultValue ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

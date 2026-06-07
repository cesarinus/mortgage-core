import { usePortalBinding } from "@/hooks/usePortalBinding";
import { IncomeCard } from "@/components/crm/IncomeCard";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalIncome() {
  const { binding, loading } = usePortalBinding();
  if (loading) return null;
  if (!binding?.lead_id) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        Income entry will be available once your loan is set up.
      </CardContent></Card>
    );
  }
  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-4">Your income</h1>
      <IncomeCard leadId={binding.lead_id} editable />
    </div>
  );
}
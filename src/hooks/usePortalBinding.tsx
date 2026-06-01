import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PortalBinding = {
  user_id: string;
  deal_id: string;
  lead_id: string | null;
  contact_id: string | null;
};

/**
 * Returns the portal_users row for the current auth user, or null if the
 * user is not a portal borrower yet (e.g. a CRM staff member, or someone who
 * signed up but hasn't accepted an invite).
 */
export function usePortalBinding() {
  const { user, loading: authLoading } = useAuth();
  const [binding, setBinding] = useState<PortalBinding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      if (!user) {
        setBinding(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("portal_users")
        .select("user_id, deal_id, lead_id, contact_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setBinding((data as PortalBinding | null) ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { binding, loading };
}
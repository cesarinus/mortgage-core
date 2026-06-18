import { supabase } from "@/integrations/supabase/client";

export interface AddressSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface ResolvedAddress {
  placeId: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface AddressProvider {
  name: string;
  autocomplete(input: string, sessionToken?: string): Promise<AddressSuggestion[]>;
  resolve(suggestionId: string, sessionToken?: string): Promise<ResolvedAddress>;
}

/** Google Places-backed provider (calls our edge function so the key stays server-side). */
export const googlePlacesProvider: AddressProvider = {
  name: "google_places",
  async autocomplete(input, sessionToken) {
    const { data, error } = await supabase.functions.invoke("address-autocomplete", {
      body: { action: "autocomplete", input, sessionToken },
    });
    if (error) throw error;
    return ((data as any)?.suggestions ?? []).map((s: any) => ({
      id: s.placeId,
      description: s.description,
      mainText: s.mainText,
      secondaryText: s.secondaryText,
    }));
  },
  async resolve(placeId, sessionToken) {
    const { data, error } = await supabase.functions.invoke("address-autocomplete", {
      body: { action: "details", placeId, sessionToken },
    });
    if (error) throw error;
    return (data as any)?.result as ResolvedAddress;
  },
};

let activeProvider: AddressProvider = googlePlacesProvider;

export function getAddressProvider(): AddressProvider {
  return activeProvider;
}

export function setAddressProvider(p: AddressProvider) {
  activeProvider = p;
}
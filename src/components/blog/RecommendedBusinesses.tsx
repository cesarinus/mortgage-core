import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

interface RecommendedBusinessesProps {
  category: string;
  limit?: number;
}

// Placeholder data — will be replaced with directory DB queries when directory tables exist
const PLACEHOLDER_BUSINESSES: Record<string, { name: string; description: string }[]> = {
  mortgage: [
    { name: "NexGen Capital", description: "Full-service mortgage solutions for Southwest Florida homebuyers and investors." },
    { name: "SWFL Home Lending", description: "Competitive rates and personalized service for first-time buyers in Naples and Fort Myers." },
    { name: "Coastal Mortgage Group", description: "Specializing in conventional, FHA, and VA loans across Cape Coral and beyond." },
  ],
  "real estate": [
    { name: "Gulf Coast Realty", description: "Premier real estate services in Naples, Fort Myers, and Cape Coral." },
    { name: "Paradise Properties SWFL", description: "Helping families find their dream home in Southwest Florida since 2010." },
    { name: "Suncoast Real Estate", description: "Investment properties and luxury homes across SWFL." },
  ],
  default: [
    { name: "NexGen Capital", description: "Your trusted partner for mortgage and financial services in SWFL." },
    { name: "SWFL Business Network", description: "Connecting local professionals across Southwest Florida." },
    { name: "Coastal Services Group", description: "Premium business solutions for the Southwest Florida community." },
  ],
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    mortgage: "Mortgage Experts",
    "real estate": "Real Estate Professionals",
    credit: "Credit Repair Specialists",
    business: "Business Services",
  };
  return labels[category.toLowerCase()] || "Local Businesses";
};

const RecommendedBusinesses = ({ category, limit = 3 }: RecommendedBusinessesProps) => {
  const businesses =
    PLACEHOLDER_BUSINESSES[category.toLowerCase()] ||
    PLACEHOLDER_BUSINESSES.default;

  const displayed = businesses.slice(0, limit);

  return (
    <div className="my-10 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Recommended {getCategoryLabel(category)} in SWFL
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((biz, i) => (
          <Card key={i} className="border-border transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{biz.name}</h4>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {category}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{biz.description}</p>
              <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-primary">
                View Profile <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecommendedBusinesses;

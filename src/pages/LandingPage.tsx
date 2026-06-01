import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import WhyChooseUsSection from "@/components/landing/WhyChooseUsSection";
import ContactFormSection from "@/components/landing/ContactFormSection";
import Footer from "@/components/landing/Footer";
import ApplicationHub from "@/components/landing/ApplicationHub";
import MortgageCalculator from "@/components/calculator/MortgageCalculator";
import FloatingCalculatorButton from "@/components/calculator/FloatingCalculatorButton";
import { AccessibilityToolbar } from "@/components/accessibility/AccessibilityToolbar";
import { SITE_URL, HOMEPAGE_KEYWORDS_STRING } from "@/lib/seoConstants";

const LandingPage = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [prefillPurpose, setPrefillPurpose] = useState<string | undefined>();
  const [calcOpen, setCalcOpen] = useState(false);

  const openHub = (purpose?: string) => {
    setPrefillPurpose(purpose);
    setHubOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Naples FL Mortgage Broker | NexGen Capital — SW Florida Home Loans</title>
        <meta name="description" content="Top-rated Naples, FL mortgage broker. Fast pre-approvals and competitive rates on Conventional, FHA, VA, USDA, Jumbo, and Refinance loans across Southwest Florida." />
        <meta name="keywords" content={HOMEPAGE_KEYWORDS_STRING} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content="Naples FL Mortgage Broker | NexGen Capital" />
        <meta property="og:description" content="Top-rated Naples mortgage broker serving Cape Coral, Fort Myers, and all of Southwest Florida. Fast pre-approvals, competitive rates." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "MortgageBroker", "FinancialService"],
          "@id": `${SITE_URL}/#business`,
          name: "NexGen Capital",
          image: `${SITE_URL}/og-default.jpg`,
          priceRange: "$$",
          telephone: "(239) 645-4580",
          url: SITE_URL,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Naples",
            addressRegion: "FL",
            postalCode: "34108",
            addressCountry: "US",
          },
          geo: { "@type": "GeoCoordinates", latitude: 26.1420, longitude: -81.7948 },
          areaServed: [
            { "@type": "City", name: "Naples" },
            { "@type": "City", name: "Cape Coral" },
            { "@type": "City", name: "Fort Myers" },
            { "@type": "City", name: "Bonita Springs" },
            { "@type": "City", name: "Estero" },
          ],
          openingHoursSpecification: [{
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
            opens: "00:00", closes: "23:59",
          }],
          sameAs: [
            "https://www.google.com/maps/search/?api=1&query=NexGen+Capital+Naples+FL",
          ],
        })}</script>
      </Helmet>
      <Navbar onGetStarted={() => openHub()} />
      <HeroSection onApplyNow={() => openHub()} onCalculate={() => setCalcOpen(true)} />
      <ServicesSection onSelectService={(purpose) => openHub(purpose)} />
      <WhyChooseUsSection />
      <ContactFormSection />
      <Footer />
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} prefillPurpose={prefillPurpose} />
      <MortgageCalculator open={calcOpen} onOpenChange={setCalcOpen} />
      <FloatingCalculatorButton onClick={() => setCalcOpen(true)} />
      <AccessibilityToolbar />
    </div>
  );
};

export default LandingPage;

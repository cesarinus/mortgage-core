import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import WhyChooseUsSection from "@/components/landing/WhyChooseUsSection";
import ContactFormSection from "@/components/landing/ContactFormSection";
import Footer from "@/components/landing/Footer";
import ApplicationHub from "@/components/landing/ApplicationHub";
import { SITE_URL, HOMEPAGE_KEYWORDS_STRING } from "@/lib/seoConstants";

const LandingPage = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [prefillPurpose, setPrefillPurpose] = useState<string | undefined>();

  const openHub = (purpose?: string) => {
    setPrefillPurpose(purpose);
    setHubOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>NexGen Capital | Southwest Florida Mortgage Lending</title>
        <meta name="description" content="NexGen Capital — Your trusted mortgage partner in Southwest Florida. Fast pre-approvals, competitive rates, and personalized service for Conventional, FHA, VA, and Refinance loans." />
        <meta name="keywords" content={HOMEPAGE_KEYWORDS_STRING} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SITE_URL} />
      </Helmet>
      <Navbar onGetStarted={() => openHub()} />
      <HeroSection onApplyNow={() => openHub()} />
      <ServicesSection onSelectService={(purpose) => openHub(purpose)} />
      <WhyChooseUsSection />
      <ContactFormSection />
      <Footer />
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} prefillPurpose={prefillPurpose} />
    </div>
  );
};

export default LandingPage;

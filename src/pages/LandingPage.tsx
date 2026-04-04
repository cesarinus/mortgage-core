import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import WhyChooseUsSection from "@/components/landing/WhyChooseUsSection";
import ContactFormSection from "@/components/landing/ContactFormSection";
import Footer from "@/components/landing/Footer";
import ApplicationHub from "@/components/landing/ApplicationHub";

const LandingPage = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [prefillPurpose, setPrefillPurpose] = useState<string | undefined>();

  const openHub = (purpose?: string) => {
    setPrefillPurpose(purpose);
    setHubOpen(true);
  };

  return (
    <div className="min-h-screen">
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

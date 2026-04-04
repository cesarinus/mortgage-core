import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type LegalDoc = "privacy" | "terms" | null;

const Footer = () => {
  const [openDoc, setOpenDoc] = useState<LegalDoc>(null);

  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
                N
              </div>
              <span className="font-display text-lg font-bold">NexGen Capital</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed opacity-70">
              Southwest Florida's trusted mortgage lending partner since 2009.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider opacity-50">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><button onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} className="hover:opacity-100">Services</button></li>
              <li><button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="hover:opacity-100">About Us</button></li>
              <li><button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="hover:opacity-100">Contact</button></li>
              <li><Link to="/auth" className="hover:opacity-100">Team Login</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider opacity-50">Legal</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><button onClick={() => setOpenDoc("privacy")} className="hover:opacity-100 underline-offset-2 hover:underline">Privacy Policy</button></li>
              <li><button onClick={() => setOpenDoc("terms")} className="hover:opacity-100 underline-offset-2 hover:underline">Terms of Service</button></li>
              <li><a href="https://nmlsconsumeraccess.org/EntityDetails.aspx/COMPANY/1766649" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 underline-offset-2 hover:underline">NMLS Consumer Access</a></li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider opacity-50">Licensing</h4>
            <p className="text-xs leading-relaxed opacity-50">
              NexGen Capital is a licensed mortgage lender. NMLS 1766649. Equal Housing Lender. All loans subject to credit approval. Rates and terms subject to change.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-background/10 pt-6 text-center text-xs opacity-50">
          © {new Date().getFullYear()} NexGen Capital. All rights reserved.
        </div>
      </div>

      {/* Privacy Policy Sheet */}
      <Sheet open={openDoc === "privacy"} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg text-foreground">
          <SheetHeader>
            <SheetTitle>Privacy Policy</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(100vh-6rem)] pr-4">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p className="text-xs text-muted-foreground">Effective Date: January 1, 2025</p>

              <h3 className="text-base font-semibold text-foreground">1. Introduction</h3>
              <p>NexGen Capital ("we," "us," or "our") is committed to protecting the privacy of our customers, website visitors, and applicants. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>

              <h3 className="text-base font-semibold text-foreground">2. Information We Collect</h3>
              <p><strong>Personal Information:</strong> When you apply for a mortgage or contact us, we may collect your name, email address, phone number, Social Security number, income and employment details, credit history, and property information.</p>
              <p><strong>Automatically Collected Information:</strong> We collect browser type, IP address, pages visited, and referring URLs through cookies and similar technologies.</p>

              <h3 className="text-base font-semibold text-foreground">3. How We Use Your Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Process and evaluate your mortgage application</li>
                <li>Communicate with you about your loan status</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our website and services</li>
                <li>Send relevant marketing communications (with your consent)</li>
              </ul>

              <h3 className="text-base font-semibold text-foreground">4. Information Sharing</h3>
              <p>We do not sell your personal information. We may share information with service providers who assist in loan processing, credit reporting agencies, government agencies as required by law, and affiliated business partners with your consent.</p>

              <h3 className="text-base font-semibold text-foreground">5. Data Security</h3>
              <p>We implement industry-standard administrative, technical, and physical safeguards to protect your personal information. However, no method of electronic transmission or storage is 100% secure.</p>

              <h3 className="text-base font-semibold text-foreground">6. Your Rights</h3>
              <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, opt out of marketing communications, and request a copy of the information we hold about you.</p>

              <h3 className="text-base font-semibold text-foreground">7. Cookies</h3>
              <p>Our website uses cookies to enhance your browsing experience. You can manage cookie preferences through your browser settings.</p>

              <h3 className="text-base font-semibold text-foreground">8. Contact Us</h3>
              <p>If you have questions about this Privacy Policy, please contact us at <strong>hello@ngcapital.net</strong> or call <strong>(239) 645-4580</strong>.</p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Terms of Service Sheet */}
      <Sheet open={openDoc === "terms"} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg text-foreground">
          <SheetHeader>
            <SheetTitle>Terms of Service</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(100vh-6rem)] pr-4">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p className="text-xs text-muted-foreground">Effective Date: January 1, 2025</p>

              <h3 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h3>
              <p>By accessing or using the NexGen Capital website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

              <h3 className="text-base font-semibold text-foreground">2. Services Provided</h3>
              <p>NexGen Capital provides mortgage lending services, including but not limited to conventional loans, FHA loans, VA loans, USDA loans, DSCR loans, construction loans, and refinancing options. All services are subject to credit approval and applicable regulations.</p>

              <h3 className="text-base font-semibold text-foreground">3. Eligibility</h3>
              <p>You must be at least 18 years of age and a legal resident of the United States to apply for a mortgage through our services. By submitting an application, you represent that all information provided is accurate and complete.</p>

              <h3 className="text-base font-semibold text-foreground">4. User Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide truthful and accurate information in all forms and applications</li>
                <li>Promptly notify us of any changes to your financial situation</li>
                <li>Not use the website for any unlawful or fraudulent purpose</li>
                <li>Maintain the confidentiality of any account credentials</li>
              </ul>

              <h3 className="text-base font-semibold text-foreground">5. No Guarantee of Approval</h3>
              <p>Submitting an application or inquiry does not guarantee loan approval. All mortgage products are subject to underwriting guidelines, credit verification, and applicable state and federal regulations.</p>

              <h3 className="text-base font-semibold text-foreground">6. Intellectual Property</h3>
              <p>All content on this website, including text, graphics, logos, and software, is the property of NexGen Capital and is protected by applicable intellectual property laws. You may not reproduce or distribute any content without our written permission.</p>

              <h3 className="text-base font-semibold text-foreground">7. Limitation of Liability</h3>
              <p>NexGen Capital shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or services. Our total liability shall not exceed the fees paid by you for the specific service giving rise to the claim.</p>

              <h3 className="text-base font-semibold text-foreground">8. Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions.</p>

              <h3 className="text-base font-semibold text-foreground">9. Changes to Terms</h3>
              <p>We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated effective date. Your continued use of our services constitutes acceptance of the revised Terms.</p>

              <h3 className="text-base font-semibold text-foreground">10. Contact Us</h3>
              <p>For questions regarding these Terms of Service, contact us at <strong>hello@ngcapital.net</strong> or call <strong>(239) 645-4580</strong>.</p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </footer>
  );
};

export default Footer;

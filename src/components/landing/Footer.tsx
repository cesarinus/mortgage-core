import { Link } from "react-router-dom";

const Footer = () => {
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
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">NMLS Consumer Access</span></li>
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
    </footer>
  );
};

export default Footer;

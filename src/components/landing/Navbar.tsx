import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { EmailContactSheet } from "@/components/landing/EmailContactSheet";

interface NavbarProps {
  onGetStarted?: () => void;
}

const Navbar = ({ onGetStarted }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "";

  const scrollTo = (id: string) => {
    setIsOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleGetStarted = () => {
    setIsOpen(false);
    if (onGetStarted) {
      onGetStarted();
    }
  };

  const handleContact = () => {
    setIsOpen(false);
    if (isLanding) {
      scrollTo("contact");
    } else {
      setContactOpen(true);
    }
  };

  const handleNavAction = (id: string) => {
    setIsOpen(false);
    if (isLanding) {
      scrollTo(id);
    } else {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
              N
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              NexGen <span className="text-primary">Capital</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => handleNavAction("services")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Services
            </button>
            <button onClick={() => handleNavAction("about")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              About
            </button>
            <Link to="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Blog
            </Link>
            <button onClick={handleContact} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </button>
            <Link to="/book">
              <Button variant="outline" size="sm">Book a Meeting</Button>
            </Link>
            <Button className="btn-shadow" onClick={handleGetStarted}>Get Started</Button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="animate-fade-in border-t border-border bg-background px-4 pb-4 md:hidden">
            <div className="flex flex-col gap-3 pt-3">
              <button onClick={() => handleNavAction("services")} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                Services
              </button>
              <button onClick={() => handleNavAction("about")} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                About
              </button>
              <Link to="/blog" className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => setIsOpen(false)}>
                Blog
              </Link>
              <button onClick={handleContact} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                Contact
              </button>
              <Link to="/book" className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => setIsOpen(false)}>
                Book a Meeting
              </Link>
              <Button className="btn-shadow w-full" onClick={handleGetStarted}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>

      <EmailContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default Navbar;

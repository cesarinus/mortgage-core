import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollTo = (id: string) => {
    setIsOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
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
          <button onClick={() => scrollTo("services")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Services
          </button>
          <button onClick={() => scrollTo("about")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </button>
          <button onClick={() => scrollTo("contact")} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </button>
          <Link to="/auth">
            <Button className="btn-shadow">Get Started</Button>
          </Link>
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
            <button onClick={() => scrollTo("services")} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              Services
            </button>
            <button onClick={() => scrollTo("about")} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              About
            </button>
            <button onClick={() => scrollTo("contact")} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              Contact
            </button>
            <Link to="/auth" onClick={() => setIsOpen(false)}>
              <Button className="btn-shadow w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

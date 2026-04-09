import { useState } from "react";
import { Button } from "@/components/ui/button";
import ApplicationHub from "@/components/landing/ApplicationHub";
import { EmailContactSheet } from "@/components/landing/EmailContactSheet";

const BlogCTA = () => {
  const [hubOpen, setHubOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-6 text-center">
        <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Ready to Take the Next Step?
        </h3>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          Whether you're buying your first home or growing your investment portfolio in Southwest Florida, our team is here to help.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="sm"
            className="btn-shadow w-full"
            onClick={() => setHubOpen(true)}
          >
            Get Pre-Qualified
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setContactOpen(true)}
          >
            Talk to an Expert
          </Button>
        </div>
      </div>

      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
      <EmailContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default BlogCTA;

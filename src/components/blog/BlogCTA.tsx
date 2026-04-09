import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const BlogCTA = () => {
  return (
    <section className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center md:p-12">
      <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
        Ready to Take the Next Step?
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
        Whether you're buying your first home or growing your investment portfolio in Southwest Florida, our team is here to help.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="btn-shadow">
          <Link to="/?action=apply">Get Pre-Qualified</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/?action=contact">Talk to an Expert</Link>
        </Button>
      </div>
    </section>
  );
};

export default BlogCTA;

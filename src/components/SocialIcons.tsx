import { Facebook, Instagram, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NexGen Capital social profile URLs.
 * TODO: Replace these placeholders with the official URLs.
 */
export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/CesarAMartinezNGC",
  instagram: "https://www.instagram.com/cesarmartinezngc/",
  linkedin: "https://www.linkedin.com/in/cesar-a-martinez-b294099/",
};

interface Props {
  className?: string;
  iconClassName?: string;
  variant?: "light" | "dark";
}

export function SocialIcons({ className, iconClassName, variant = "dark" }: Props) {
  const items = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", Icon: Facebook },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: Instagram },
    { href: SOCIAL_LINKS.linkedin, label: "LinkedIn", Icon: Linkedin },
  ];
  const base =
    variant === "light"
      ? "text-background/60 hover:text-primary hover:bg-background/10"
      : "text-muted-foreground hover:text-primary hover:bg-primary/10";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`NexGen Capital on ${label}`}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            base,
          )}
        >
          <Icon className={cn("h-4 w-4", iconClassName)} />
        </a>
      ))}
    </div>
  );
}
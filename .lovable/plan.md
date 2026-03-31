

# NexGen Capital — Landing Page Plan
**Using the NexGenSWFL theme (warm orange + charcoal palette)**

---

## Overview

Build a public landing page at `/` for **NexGen Capital** (mortgage company). The CRM dashboard moves to `/dashboard`. The landing page uses the same design system as the NexGen Directory project: warm orange primary, cream backgrounds, DM Sans + Inter fonts, dotted grid patterns, floating cards, and orange glow shadows.

---

## Theme Changes

Update `src/index.css` and `tailwind.config.ts` to match the NexGen Directory design system:

- **Colors**: Warm orange primary (`hsl(24 95% 53%)`), cream background (`hsl(40 33% 98%)`), charcoal foreground
- **Brand tokens**: `--orange`, `--orange-light`, `--orange-dark`, `--charcoal`, `--cream`
- **Shadows**: `--shadow-card`, `--shadow-card-hover`, `--shadow-orange`
- **Radius**: `1rem` base
- **Fonts**: DM Sans + Inter via Google Fonts import
- **Utility classes**: `.bg-dotted`, `.text-gradient-orange`, `.btn-shadow`, `.card-elevated`, `.trust-badge`, `.feature-pill`, `.orange-blob`, animations (float, fade-up, fade-in, scale-in)
- **Tailwind config**: Add `orange`, `charcoal`, `cream` color tokens, custom box shadows, font family, extra border-radius values

The CRM sidebar theme variables will also shift to the orange palette so the internal app stays cohesive.

---

## Routing Change

| Route | Component | Access |
|---|---|---|
| `/` | Landing page (new) | Public |
| `/lead-form` | Standalone lead form (new) | Public |
| `/auth` | Login / Signup | Public |
| `/dashboard` | Dashboard | Protected |
| `/leads`, `/contacts`, `/pipeline`, `/settings` | CRM modules | Protected |

---

## Landing Page Sections

### 1. Header / Navbar
- NexGen Capital logo/wordmark (left)
- Nav links: Services, About, Contact
- "Get Started" CTA button (orange, right)
- Mobile hamburger menu
- Sticky on scroll

### 2. Hero with CTA
- Trust badge pill: "Southwest Florida's Trusted Mortgage Partner"
- Headline with gradient orange text: "Your Path to **Homeownership Starts Here**"
- Subtitle describing services
- Two CTA buttons: "Apply Now" (orange) + "Learn More" (outline)
- Feature pills: "Fast Pre-Approvals", "Competitive Rates", "Local Expertise"
- Floating stat cards (loans funded, average rating) with NexGen float animation
- Professional hero image
- Stats bar: Loans Funded, Years Experience, Average Rating, SWFL Local Focus

### 3. Services Overview
- Section heading with orange accent label
- Card grid (3-4 cards) for loan types: Conventional, FHA, VA, Refinance
- Each card: icon, title, short description, "Learn More" link
- Uses `.card-elevated` and `.card-hover` styles

### 4. About / Why Choose Us
- Split layout: content left, image/testimonial right
- Headline: "Why NexGen Capital?"
- Bullet benefits with checkmark icons (e.g., Licensed professionals, Fast closing, Personalized service, Transparent process)
- Testimonial card with star rating, quote, and avatar

### 5. Contact / Get Started Form
- Two-column layout: form left, contact info right
- Form fields: First Name, Last Name, Email, Phone, Loan Type (select), Message
- Submit inserts into the `leads` table via Supabase anon policy (uses existing RLS)
- Success toast on submission
- Right column: phone, email, office address, business hours
- Uses `.card-elevated` container with orange corner accent

### 6. Footer
- NexGen Capital branding
- Quick links, legal links (Privacy, Terms)
- NMLS disclaimer / licensing info
- Social media icon links
- Copyright

---

## New Files

| File | Purpose |
|---|---|
| `src/pages/LandingPage.tsx` | Landing page composition (imports sections) |
| `src/components/landing/Navbar.tsx` | Sticky top navigation |
| `src/components/landing/HeroSection.tsx` | Hero with CTA, stats, floating cards |
| `src/components/landing/ServicesSection.tsx` | Loan type cards grid |
| `src/components/landing/WhyChooseUsSection.tsx` | Benefits + testimonial |
| `src/components/landing/ContactFormSection.tsx` | Lead capture form + contact info |
| `src/components/landing/Footer.tsx` | Site footer |

---

## Modified Files

| File | Change |
|---|---|
| `src/index.css` | Replace with NexGen theme (colors, utilities, animations) |
| `tailwind.config.ts` | Add orange/charcoal/cream tokens, shadows, fonts, radius |
| `src/App.tsx` | Add `/` route for LandingPage, move Dashboard to `/dashboard` |

---

## Technical Notes

- The contact form submits to the existing `leads` table using the anon RLS policy (requires `first_name` and `last_name`, nullifies `assigned_to` and `created_by`)
- No database changes needed
- No new dependencies needed
- All components are mobile-first, matching the 384px viewport the user is currently on


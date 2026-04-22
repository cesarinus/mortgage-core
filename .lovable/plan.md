

# Calendly-Style Booking Page

A public `/book` page where prospects pick a date and time, fill in their info, and trigger confirmation emails to both the prospect and you. Availability is admin-configurable from Settings.

## User flow

```text
/book
 ┌─────────────┬─────────────────┬─────────────┐
 │ NexGen      │ Select Date     │ Mon, Jul 22 │
 │ Carlos M.   │ < July 2026 >   │ ┌─────────┐ │
 │ 30 min      │ S M T W T F S   │ │ 9:00 AM │ │
 │ Call/Zoom   │ . . 1 2 3 4 5   │ │ 9:30 AM │ │
 │             │ 6 7 8 9 ...     │ │10:00 AM │ │
 │             │ Time zone: ET   │ └─────────┘ │
 └─────────────┴─────────────────┴─────────────┘
   → Step 2: Name, Email, Phone, Loan Type, Meeting Type (Call/Zoom), Notes
   → Confirm → email to prospect + email to CMartinez@NGCapital.net
   → Success screen with booking summary
```

## Database (additive, schema-only changes)

New tables:

- **`booking_settings`** — single-row config: `weekday_hours` (jsonb, e.g. `{ "mon": ["09:00","17:00"], ... }`), `slot_minutes` (int, default 30), `buffer_minutes` (int, default 0), `timezone` (text, default `America/New_York`), `notify_email` (text, default `CMartinez@NGCapital.net`).
- **`booking_blackout_dates`** — `id`, `date`, `reason`. Admin-managed exclusions (holidays, vacation).
- **`bookings`** — `id`, `lead_id` (nullable), `first_name`, `last_name`, `email`, `phone`, `loan_type`, `meeting_type` (`call` | `zoom`), `notes`, `start_at` (timestamptz), `end_at` (timestamptz), `status` (`confirmed` | `cancelled`, default `confirmed`), `created_at`. Unique partial index on `(start_at)` where `status='confirmed'` to prevent double-bookings.

RLS:

- `booking_settings`, `booking_blackout_dates`: public SELECT (so the booking page can read availability), admin ALL for writes.
- `bookings`: public INSERT (anonymous booking), admin ALL, plus SELECT for assigned loan officer.
- A SECURITY DEFINER function `get_available_slots(p_date date)` returns open slots for a given date, computed from settings minus existing confirmed bookings minus blackout dates. Public can call it.

## Edge functions

1. **`create-booking`** (public, `verify_jwt = false`)
   - Validates payload with Zod (name, valid email, phone, ISO `start_at`, meeting type).
   - Re-checks slot availability server-side (race-safe).
   - Inserts `bookings` row.
   - Creates a CRM `lead` (source = "Booking", tagged `meeting_booked`, +30 score), links `bookings.lead_id`.
   - Sends two Resend emails via the existing connector pattern:
     - **Prospect email** — confirmation with date/time, meeting type, what to expect, contact info.
     - **Internal email** — to `CMartinez@NGCapital.net` with all booking details + reply-to set to prospect.
   - Returns `{ success, bookingId }`.

2. **`get-booking-availability`** (public, `verify_jwt = false`)
   - Input: `{ from: date, to: date }` (max 60-day range).
   - Returns per-day arrays of available ISO time slots (calls `get_available_slots`).
   - Used by the booking page to render only bookable times and disable full days.

Both reuse the inline `corsHeaders` and `RESEND_API_KEY` pattern from `send-contact-form`.

## Frontend

**New page `/book`** (`src/pages/Book.tsx`, public route in `App.tsx`):
- Three-column Calendly-style layout (matches the screenshot): left meeting info card, center calendar (`@/components/ui/calendar` — already installed), right time-slot list.
- Step 1: pick date → fetch slots for that day → user picks time.
- Step 2: details form (first/last name, email, phone, loan type dropdown, meeting type radio: Call / Zoom, notes).
- Step 3: success screen with booking summary and "Add to calendar" `.ics` download (generated client-side).
- Uses `<Helmet>` + the existing SEO constants pattern (canonical `/book`, indexable).
- Brand styling: orange primary, DM Sans/Inter, `card-elevated` class — consistent with landing.

**Settings page additions** (`src/pages/SettingsPage.tsx`, admin-only section "Booking Availability"):
- Per-weekday start/end time inputs (or "Closed" toggle).
- Slot length selector (15 / 30 / 45 / 60 min).
- Buffer between meetings (0 / 5 / 10 / 15 min).
- Notify email field (defaults to `CMartinez@NGCapital.net`).
- Blackout dates manager: list + date picker to add/remove.
- All writes go through admin-only RLS on `booking_settings` / `booking_blackout_dates`.

**Navigation entry points**:
- Add "Book a Meeting" CTA button in `Navbar.tsx` (next to "Get Started") and as a secondary CTA in `HeroSection.tsx` and `ContactFormSection.tsx`.

## Email templates (inline HTML in `create-booking`, brand-styled)

- **Prospect**: orange header, "Your meeting with NexGen Capital is confirmed", date/time block, meeting type with Zoom note ("Zoom link will be sent before the meeting" or call number), contact info, NMLS footer.
- **Internal**: "New booking — [Name] — [Date Time]", full prospect contact card, loan type, notes, link back to `/leads`.

Sent via existing Resend connector (`RESEND_API_KEY` already configured), `from: "NexGen Capital <onboarding@resend.dev>"`, prospect's email as `reply_to` on the internal one.

## Files

**New**
- `supabase/migrations/<timestamp>_booking_system.sql` — tables, RLS, `get_available_slots` function
- `supabase/functions/create-booking/index.ts`
- `supabase/functions/get-booking-availability/index.ts`
- `src/pages/Book.tsx`
- `src/components/booking/BookingCalendar.tsx`
- `src/components/booking/BookingDetailsForm.tsx`
- `src/components/booking/BookingSuccess.tsx`
- `src/components/settings/BookingAvailabilitySettings.tsx`
- `src/lib/booking.ts` — slot helpers, `.ics` generator

**Edited**
- `src/App.tsx` — add `<Route path="/book" element={<Book />} />`
- `src/pages/SettingsPage.tsx` — mount `BookingAvailabilitySettings`
- `src/components/landing/Navbar.tsx` — "Book a Meeting" link to `/book`
- `src/components/landing/HeroSection.tsx` — secondary CTA
- `src/lib/seoConstants.ts` — add booking page keywords
- `supabase/config.toml` — register the two new functions

## Defaults seeded

- Mon–Fri 9:00 AM – 5:00 PM ET, 30-minute slots, 0-min buffer, notify `CMartinez@NGCapital.net`. You can change these immediately from Settings after launch.


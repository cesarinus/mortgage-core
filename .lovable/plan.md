# Responsive Overhaul Plan

Goal: make the entire app usable down to 360–414px phones, comfortable on 768–1024px tablets, and free of horizontal scroll on 1280px laptops — without touching business logic or data.

## Scope (frontend / presentation only)

### 1. Public website
- `Navbar`: already has mobile menu — audit spacing, logo wrap, sticky height.
- `HeroSection`, `ServicesSection`, `WhyChooseUsSection`, `ContactFormSection`, `Footer`: collapse multi-column grids to single column under `md`; tighten typography scale (`text-4xl md:text-6xl` etc.); reduce section padding on mobile.
- `ApplicationHub` (7-step sheet): full-screen sheet on mobile, stacked field rows, sticky footer with Next/Back.
- `MortgageCalculator` + `FloatingCalculatorButton`: bottom-sheet style on mobile, smaller floating button position to avoid covering iOS home indicator.
- Blog: `BlogPost` sidebar moves below content on mobile; `StickyFloatingCTA` shrinks; `BlogIndex` cards become single column.
- Booking pages: calendar + form stack vertically; chip rows wrap.

### 2. CRM shell
- `AppLayout` header: hide search on `<md`, collapse Quick Add into an icon, keep AI Assistant primary CTA visible but icon-only on `<sm`.
- `AppSidebar`: use shadcn `Sidebar` offcanvas behavior on mobile (drawer triggered by `SidebarTrigger`), icon-mini on tablet.
- Main content padding: `p-4 md:p-6` instead of fixed `p-6`.

### 3. CRM record workspace + lists
- `Leads`, `Pipeline`, `Contacts`, `Companies`, `People`, `Subscribers`, `EmailTemplates`, `BlogAdmin` tables: convert rows to **stacked cards** under `md` (name + status badge + key metric + chevron); keep table on `md+`.
- `RecordWorkspace` (LeftRail / center / RightRail): three-column on `xl`, two-column with collapsible right rail on `lg`, single column with tab switcher (`Details | Activity | AI`) on `<lg`.
- Tab content (`UnifiedTimelineTab`, `ConditionsTab`, `DocumentsTab`, etc.): grid → single column; action button rows wrap.
- `AriveExportPreviewDialog` and similar dialogs: become full-screen sheets on mobile.

### 4. Settings
- `SettingsLayout`: today is 3-column (`w-64` nav / content / `w-80` advisor).
  - `<lg`: hide right advisor (already `hidden xl:block`, keep).
  - `<md`: convert left nav into a top **Select dropdown** (or shadcn `Sheet` triggered by a hamburger) so content gets full width.
- All settings sections: form rows stack, tables horizontally scroll inside a wrapper, tabs become scrollable.

## Technical approach

- Pure Tailwind responsive classes (`sm: md: lg: xl:`) — no new dependencies.
- Reusable pattern for list→card swap:
  ```tsx
  <div className="hidden md:block"><Table>…</Table></div>
  <div className="md:hidden space-y-2">{rows.map(r => <MobileCard …/>)}</div>
  ```
- Add a small `useIsMobile` (already exists) for conditional rendering where Tailwind isn't enough (e.g., Dialog ↔ Sheet swap).
- Container rule: every page root uses `w-full max-w-full overflow-x-hidden` to prevent rogue horizontal scroll.
- Tap targets: minimum `h-10 w-10` for icon buttons on touch.
- No changes to: business logic, data fetching, edge functions, DB schema, ARIVE mapping, auth.

## Delivery order (incremental, each shippable)

1. **CRM shell + Settings layout** — biggest unlock, touches every authenticated page.
2. **Leads / Pipeline / Contacts list → mobile cards.**
3. **RecordWorkspace 3-col → tabbed mobile view.**
4. **Public website sections + ApplicationHub sheet.**
5. **Blog + Booking polish.**
6. **Settings inner pages (LOS mappings, field builder, integrations) row stacking.**

I'll start with step 1 in the next turn unless you want a different order.

## Out of scope
- Native app, PWA install prompts, offline mode.
- Redesigning components (visual direction stays per brand memory).
- Changing any backend, ARIVE, or AI behavior.

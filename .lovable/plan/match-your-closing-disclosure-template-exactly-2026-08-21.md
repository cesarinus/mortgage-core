# Match Your Closing Disclosure Template Exactly

Short answer: yes. If you upload the Closing Disclosure PDF (blank or filled), I can rebuild the print output and the emailed PDF so they are visually indistinguishable from your template.

## What I need from you

Upload the template as a PDF. A filled sample is ideal — it shows me real values, spacing behavior, and any lender-specific wording. A blank one works too.

## How the match is produced

1. **Parse the template.** Extract every page as a high-resolution image plus the underlying text and table structure, so I have exact wording, section order, row labels, column positions, rules, shaded bars, and footer text.
2. **Rebuild the replica page by page.** The existing 6-page print component and its stylesheet are rewritten to mirror the template: page geometry (8.5 x 11 in with the template's exact margins), font family and sizes, header/footer bands, black section bars, hairline widths, column widths, checkbox glyphs, currency alignment, and the "Page N of N" / Loan ID footer.
3. **Bind the data.** Every field in the replica maps to the form data already captured in the Closing Disclosure form, so a saved disclosure prints filled.
4. **One replica, both outputs.** Print (browser print dialog) and the emailed PDF render from the same component, so the paper copy and the attachment are identical.
5. **Side-by-side QA.** I render the generated PDF to images and compare each page against the template pages, fixing drift in spacing, alignment, and type until each page matches. I report exactly what I checked and fixed.

## Notes and limits

- Fonts: official CFPB forms are typically set in a standard sans/serif pair. I match with the closest web-safe or bundled font; if your template uses a licensed font, tell me and I'll use it if you can supply the file.
- Anything in the template that has no matching field in the current form (extra lender rows, custom disclosures, a logo block) gets added as a new field so the printed page isn't blank there — I'll list those additions before wiring them.
- If any page of your template differs materially from the current CFPB H-25A structure, I'll follow your template, not the current build.

## Technical detail

- `src/components/closing-disclosure/PrintDocument.tsx` (999 lines) and `src/components/closing-disclosure/print.css` (233 lines) are rewritten to the template's measurements; the `@page` rule and per-page wrappers are re-derived from the PDF's page box.
- `src/pages/crm/ClosingDisclosure.tsx` keeps its current pipeline (html2canvas at scale 2 -> jsPDF per page, emailed as a base64 attachment through the `send-email` function). Only the rendered markup and CSS change, so Save Draft, Submit, Print, and Email all pick up the new fidelity automatically.
- Any new fields discovered in the template are added to `src/lib/closing-disclosure/types.ts` and the matching form page, and flow into the existing `crm_payload` JSON without a schema change.

## Next step

Upload the Closing Disclosure PDF and I'll start with the parse-and-compare pass.

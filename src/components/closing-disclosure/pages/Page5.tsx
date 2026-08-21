import { Section, Grid, TextField, AreaField, DateField, CheckField } from "../fields";
import { SignaturePad } from "../SignaturePad";
import { PageProps } from "./shared";
import { CONTACT_ROLE_LABELS } from "@/lib/closing-disclosure/types";

export default function Page5({ form, update }: PageProps) {
  const parties = form.contactInfo.parties;
  const od = form.otherDisclosures;
  const sg = form.signatures;

  return (
    <div className="space-y-6">
      <Section title="Contact Information">
        <div className="space-y-4">
          {parties.map((p, i) => (
            <div key={p.role || i} className="space-y-4 rounded-lg border border-border/60 p-4">
              <p className="text-sm font-semibold">{CONTACT_ROLE_LABELS[p.role] ?? p.role}</p>
              <Grid cols={2}>
                <TextField label="Name" value={p.name} onChange={(v) => update((f) => { f.contactInfo.parties[i].name = v; })} />
                <AreaField label="Address" rows={2} value={p.address} onChange={(v) => update((f) => { f.contactInfo.parties[i].address = v; })} />
                <TextField label="NMLS ID" value={p.nmls_id} onChange={(v) => update((f) => { f.contactInfo.parties[i].nmls_id = v; })} />
                <TextField label="License ID" value={p.license_id} onChange={(v) => update((f) => { f.contactInfo.parties[i].license_id = v; })} />
                <TextField label="Contact" value={p.contact_name} onChange={(v) => update((f) => { f.contactInfo.parties[i].contact_name = v; })} />
                <TextField label="Contact NMLS ID" value={p.contact_nmls_id} onChange={(v) => update((f) => { f.contactInfo.parties[i].contact_nmls_id = v; })} />
                <TextField label="Contact License ID" value={p.contact_license_id} onChange={(v) => update((f) => { f.contactInfo.parties[i].contact_license_id = v; })} />
                <TextField label="Email" value={p.email} onChange={(v) => update((f) => { f.contactInfo.parties[i].email = v; })} />
                <TextField label="Phone" value={p.phone} onChange={(v) => update((f) => { f.contactInfo.parties[i].phone = v; })} />
              </Grid>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Other Disclosures">
        <div className="space-y-3">
          <CheckField
            label="Appraisal"
            hint="Lender has provided the borrower a copy of any appraisal promptly upon completion."
            checked={od.appraisal_acknowledged}
            onChange={(v) => update((f) => { f.otherDisclosures.appraisal_acknowledged = v; })}
          />
          <CheckField
            label="Contract Details"
            hint="See your note and security instrument for details about nonpayment, default and required repayment."
            checked={od.contract_details_acknowledged}
            onChange={(v) => update((f) => { f.otherDisclosures.contract_details_acknowledged = v; })}
          />
          <CheckField
            label="Liability after Foreclosure — state law protection applies"
            checked={od.liability_after_foreclosure_protected}
            onChange={(v) => update((f) => { f.otherDisclosures.liability_after_foreclosure_protected = v; })}
          />
          <CheckField
            label="Refinance — refinancing this loan may be possible in the future"
            checked={od.refinance_possible}
            onChange={(v) => update((f) => { f.otherDisclosures.refinance_possible = v; })}
          />
        </div>
        <AreaField label="Tax Deductions Note" rows={3} value={od.tax_deductions_note} onChange={(v) => update((f) => { f.otherDisclosures.tax_deductions_note = v; })} />
      </Section>

      <Section title="Confirm Receipt">
        <p className="text-sm text-muted-foreground">
          By signing, you are only confirming that you have received this form. You do not have to accept this loan
          because you have signed or received this form.
        </p>
        <Grid cols={2}>
          <div className="space-y-3">
            <SignaturePad
              label="Applicant Signature"
              value={sg.applicant_signature_data_url}
              onChange={(v) => update((f) => { f.signatures.applicant_signature_data_url = v; })}
            />
            <DateField label="Date" value={sg.applicant_signature_date} onChange={(v) => update((f) => { f.signatures.applicant_signature_date = v; })} />
          </div>
          <div className="space-y-3">
            <SignaturePad
              label="Co-Applicant Signature"
              value={sg.co_applicant_signature_data_url}
              onChange={(v) => update((f) => { f.signatures.co_applicant_signature_data_url = v; })}
            />
            <DateField label="Date" value={sg.co_applicant_signature_date} onChange={(v) => update((f) => { f.signatures.co_applicant_signature_date = v; })} />
          </div>
        </Grid>
        <CheckField
          label="Receipt of this Closing Disclosure is confirmed"
          checked={sg.receipt_confirmed}
          onChange={(v) => update((f) => { f.signatures.receipt_confirmed = v; })}
        />
      </Section>
    </div>
  );
}

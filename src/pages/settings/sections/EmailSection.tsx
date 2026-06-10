import EmailProviderSettings from "@/components/settings/EmailProviderSettings";
export default function EmailSection() {
  return (
    <div className="max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Email</h1><p className="text-muted-foreground text-sm">SMTP / Resend provider settings.</p></div>
      <EmailProviderSettings />
    </div>
  );
}
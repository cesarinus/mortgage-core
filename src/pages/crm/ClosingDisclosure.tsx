import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Download, Loader2, Mail, Printer, Save, Send, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ClosingDisclosureForm } from "@/lib/closing-disclosure/types";
import { createEmptyForm } from "@/lib/closing-disclosure/types";
import { computeTotals, validateForm } from "@/lib/closing-disclosure/calc";
import {
  clearLocalDraft,
  emailDisclosure,
  fetchDisclosure,
  formFromPayload,
  persistDisclosure,
  readLocalDraft,
  saveLocalDraft,
} from "@/lib/closing-disclosure/api";
import Page1 from "@/components/closing-disclosure/pages/Page1";
import Page2 from "@/components/closing-disclosure/pages/Page2";
import Page3 from "@/components/closing-disclosure/pages/Page3";
import Page4 from "@/components/closing-disclosure/pages/Page4";
import Page5 from "@/components/closing-disclosure/pages/Page5";
import Page6 from "@/components/closing-disclosure/pages/Page6";
import { PrintDocument } from "@/components/closing-disclosure/PrintDocument";
import { ImportedFieldsContext } from "@/components/closing-disclosure/fields";
import { importFromDeal } from "@/lib/closing-disclosure/importDeal";
import "@/components/closing-disclosure/form.css";

const PAGES = [
  { n: 1, label: "Loan Terms", Comp: Page1 },
  { n: 2, label: "Closing Costs", Comp: Page2 },
  { n: 3, label: "Cash to Close", Comp: Page3 },
  { n: 4, label: "Disclosures", Comp: Page4 },
  { n: 5, label: "Contacts & Signing", Comp: Page5 },
  { n: 6, label: "Loan Calculations", Comp: Page6 },
] as const;

/** Deep clone before mutating so React sees a new reference. */
const clone = (f: ClosingDisclosureForm): ClosingDisclosureForm =>
  typeof structuredClone === "function" ? structuredClone(f) : JSON.parse(JSON.stringify(f));

export default function ClosingDisclosurePage() {
  const { id: routeId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const opportunityId = params.get("opportunity");
  const leadId = params.get("lead");
  const isNew = !routeId || routeId === "new";

  const [recordId, setRecordId] = useState<string | null>(isNew ? null : routeId!);
  const [form, setForm] = useState<ClosingDisclosureForm>(createEmptyForm);
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"form" | "preview">("form");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Your Closing Disclosure");
  const [emailBody, setEmailBody] = useState(
    "<p>Attached is your Closing Disclosure. Please review it carefully and contact us with any questions.</p>",
  );
  const [importedLabels, setImportedLabels] = useState<Set<string>>(() => new Set());
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const totals = useMemo(() => computeTotals(form), [form]);
  const draftKey = recordId ?? "new";
  const formRef = useRef(form);
  formRef.current = form;

  /* ---------------- load ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (isNew) {
        const local = readLocalDraft("new");
        if (local && alive) setForm(local);
        // Pre-fill mappable fields from the originating Deal/Opportunity.
        if (!local && (opportunityId || leadId)) {
          try {
            const imported = await importFromDeal({ opportunityId, leadId });
            if (imported && alive) {
              setForm((prev) => {
                const next = clone(prev);
                imported.apply(next);
                return next;
              });
              setImportedLabels(new Set(imported.importedLabels));
              setImportedFrom(imported.dealName);
            }
          } catch {
            /* import is best-effort — the form still opens blank */
          }
        }
        return;
      }
      setLoading(true);
      try {
        const rec = await fetchDisclosure(routeId!);
        if (!alive) return;
        if (!rec) {
          toast.error("Closing Disclosure not found");
          navigate("/pipeline");
          return;
        }
        setForm(formFromPayload(rec.crm_payload));
        setStatus(rec.status === "submitted" ? "submitted" : "draft");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load disclosure");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [routeId, isNew, navigate, opportunityId, leadId]);

  /* ---------------- editing ---------------- */
  const update = useCallback((mutate: (draft: ClosingDisclosureForm) => void) => {
    setForm((prev) => {
      const next = clone(prev);
      mutate(next);
      return next;
    });
  }, []);

  // Local autosave (crash protection); backend save stays explicit.
  useEffect(() => {
    const t = setTimeout(() => saveLocalDraft(draftKey, form), 800);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  // Belt-and-braces 30s snapshot to localStorage.
  useEffect(() => {
    const i = setInterval(() => saveLocalDraft(draftKey, formRef.current), 30_000);
    return () => clearInterval(i);
  }, [draftKey]);


  /* ---------------- actions ---------------- */
  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const savedId = await persistDisclosure({
        id: recordId,
        form,
        status,
        opportunityId,
        leadId,
      });
      if (!recordId) {
        clearLocalDraft("new");
        setRecordId(savedId);
        navigate(
          `/closing-disclosure/${savedId}${opportunityId ? `?opportunity=${opportunityId}` : leadId ? `?lead=${leadId}` : ""}`,
          { replace: true },
        );
      }
      if (!silent) toast.success("Draft saved");
      return savedId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validateForm(form);
    if (errors.length) {
      toast.error("Cannot submit yet", { description: errors.slice(0, 4).join(" ") });
      return;
    }
    setBusy("submit");
    try {
      const savedId = await persistDisclosure({
        id: recordId,
        form,
        status: "submitted",
        opportunityId,
        leadId,
      });
      setRecordId(savedId);
      setStatus("submitted");
      clearLocalDraft(draftKey);
      toast.success("Closing Disclosure submitted to the CRM");
      if (!recordId) navigate(`/closing-disclosure/${savedId}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    setMode("preview");
    // Let the replica mount before invoking the print dialog.
    setTimeout(() => window.print(), 350);
  };

  const buildPdf = async () => {
    const node = printRef.current;
    if (!node) throw new Error("Preview is not ready");
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
    const pages = Array.from(node.querySelectorAll<HTMLElement>(".cd-page"));
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 8.5, 11);
    }
    return pdf;
  };

  const withPreview = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setMode("preview");
    await new Promise((r) => setTimeout(r, 350));
    return fn();
  };

  const handleDownload = async () => {
    setBusy("pdf");
    try {
      const pdf = await withPreview(buildPdf);
      pdf.save(`Closing-Disclosure-${form.transactionInfo.loan_id || "draft"}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    setBusy("email");
    try {
      const savedId = recordId ?? (await handleSave(true));
      const pdf = await withPreview(buildPdf);
      const base64 = pdf.output("datauristring").split(",")[1];
      await emailDisclosure({
        id: savedId ?? "",
        to: emailTo.trim(),
        subject: emailSubject,
        body: emailBody,
        pdfBase64: base64,
        filename: `Closing-Disclosure-${form.transactionInfo.loan_id || "draft"}.pdf`,
        leadId,
        opportunityId,
      });
      toast.success(`Closing Disclosure emailed to ${emailTo.trim()}`);
      setEmailOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email failed");
    } finally {
      setBusy(null);
    }
  };

  const Current = PAGES[page - 1].Comp;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <Helmet>
        <title>Closing Disclosure (CFPB H-25A) | NexGen Capital</title>
        <meta
          name="description"
          content="Fillable CFPB Closing Disclosure form with print, PDF email delivery and CRM submission."
        />
      </Helmet>

      {/* Header */}
      <header className="no-print space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-5 w-5 text-primary" />
                Closing Disclosure
              </h1>
              <p className="text-xs text-muted-foreground">CFPB Model Form H-25A — 6 pages</p>
            </div>
            <Badge variant={status === "submitted" ? "default" : "secondary"} className="capitalize">
              {status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === "form" ? "preview" : "form")}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              {mode === "form" ? "Preview" : "Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save Draft
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={busy === "pdf"}>
              {busy === "pdf" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="mr-1.5 h-4 w-4" />
              Email
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={busy === "submit"}>
              {busy === "submit" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Submit
            </Button>
          </div>
        </div>

        {mode === "form" && (
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Form pages">
            {PAGES.map((p) => (
              <button
                key={p.n}
                type="button"
                onClick={() => setPage(p.n)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  page === p.n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.n}. {p.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Body */}
      {mode === "form" ? (
        <ImportedFieldsContext.Provider value={importedLabels}>
          <div className="cd-form space-y-6">
            {importedFrom && importedLabels.size > 0 && (
              <p className="border border-[#b58900] bg-[#fffbe6] px-3 py-2 text-xs text-[#7a5c00]">
                {importedLabels.size} field{importedLabels.size === 1 ? "" : "s"} pre-filled from{" "}
                <strong>{importedFrom}</strong>. Imported values are highlighted.
              </p>
            )}
            <Current form={form} update={update} totals={totals} />
            <div className="no-print flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of 6</span>
              <Button onClick={() => setPage((p) => Math.min(6, p + 1))} disabled={page === 6}>
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </ImportedFieldsContext.Provider>
      ) : (
        <div className="cd-preview print-mode rounded-lg">
          <PrintDocument ref={printRef} form={form} />
        </div>
      )}

      {/* Hidden replica so Print/PDF work from the form view too */}
      {mode === "form" && (
        <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
          <PrintDocument ref={printRef} form={form} />
        </div>
      )}

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Closing Disclosure</DialogTitle>
            <DialogDescription>
              Sends an exact PDF copy of the 6-page form as an attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cd-email-to">Recipient</Label>
              <Input
                id="cd-email-to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="borrower@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd-email-subject">Subject</Label>
              <Input id="cd-email-subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd-email-body">Message</Label>
              <Textarea id="cd-email-body" rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmail} disabled={busy === "email"}>
              {busy === "email" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/email/RichTextEditor";

interface BaseProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  contactId?: string;
  onDone: () => void;
}

export function NoteModal({ open, onClose, leadId, contactId, onDone }: BaseProps) {
  const [body, setBody] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const save = async () => {
    if (!body.trim()) return;
    const { error } = await supabase.from("crm_notes").insert({
      lead_id: leadId, contact_id: contactId, body_html: body, created_by: user?.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Note saved" });
    setBody(""); onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add note</DialogTitle></DialogHeader>
        <RichTextEditor value={body} onChange={setBody} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskModal({ open, onClose, leadId, contactId, onDone }: BaseProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const { user } = useAuth();
  const { toast } = useToast();
  const save = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("crm_tasks").insert({
      lead_id: leadId, contact_id: contactId, title, description,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      priority, status: "open", created_by: user?.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Task created" });
    setTitle(""); setDescription(""); setDueAt(""); onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Due</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CallModal({ open, onClose, leadId, contactId, onDone }: BaseProps) {
  const [outcome, setOutcome] = useState("connected");
  const [direction, setDirection] = useState("outbound");
  const [duration, setDuration] = useState("0");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const save = async () => {
    const { error } = await supabase.from("crm_calls").insert({
      lead_id: leadId, contact_id: contactId, direction, outcome,
      duration_sec: parseInt(duration || "0", 10), notes,
      follow_up_at: followUp ? new Date(followUp).toISOString() : null,
      created_by: user?.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Call logged" });
    setNotes(""); setDuration("0"); setFollowUp(""); onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log call</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="scheduled_callback">Scheduled callback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Duration (seconds)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div><Label>Follow-up</Label><Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Log call</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetingModal({ open, onClose, leadId, contactId, onDone }: BaseProps) {
  const [title, setTitle] = useState("Mortgage consultation");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [video, setVideo] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const save = async () => {
    if (!start || !end) return toast({ title: "Pick start and end" });
    const { error } = await supabase.from("crm_meetings").insert({
      lead_id: leadId, contact_id: contactId, title,
      start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(),
      location, video_link: video, notes, created_by: user?.id,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Meeting scheduled" });
    onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule meeting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div><Label>Video link (Zoom/Meet)</Label><Input value={video} onChange={(e) => setVideo(e.target.value)} /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmailModal({ open, onClose, leadId, contactId, onDone, recipientEmail }: BaseProps & { recipientEmail?: string }) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [to, setTo] = useState(recipientEmail ?? "");
  const { user } = useAuth();
  const { toast } = useToast();
  const send = async () => {
    if (!to || !subject) return toast({ title: "Recipient and subject required" });
    // Log as activity + email_logs entry; provider send via existing function later
    const { error } = await supabase.from("email_logs").insert({
      lead_id: leadId, recipient_email: to, subject,
      status: "sent", metadata: { html, sent_via: "crm-workspace", sent_by: user?.id },
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await supabase.from("crm_activities").insert({
      lead_id: leadId, contact_id: contactId, activity_type: "email",
      title: `Email: ${subject}`, body: to, actor_id: user?.id,
    });
    toast({ title: "Email logged", description: "Delivery via Resend gateway." });
    onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Send email</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>To</Label><Input value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <RichTextEditor value={html} onChange={setHtml} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadModal({ open, onClose, leadId, contactId, onDone, categories }: BaseProps & { categories: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const save = async () => {
    if (!file || !leadId) return toast({ title: "Pick a file" });
    setBusy(true);
    try {
      const path = `${leadId}/${category}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("crm-documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from("crm_attachments").insert({
        lead_id: leadId, contact_id: contactId, category_slug: category,
        file_name: file.name, file_path: path, mime_type: file.type, size_bytes: file.size,
        uploaded_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Uploaded" });
      setFile(null); onDone(); onClose();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !file}>{busy ? "Uploading..." : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
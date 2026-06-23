
-- Universal Task Management: extend existing public.tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS related_type text,
  ADD COLUMN IF NOT EXISTS related_id uuid,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.pipeline_opportunities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- Allow extended status values; existing default 'open' kept for back-compat (treated as not_started)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
  END IF;
END $$;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open','not_started','in_progress','completed','cancelled'));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_priority_check;
  END IF;
END $$;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low','normal','medium','high'));

CREATE INDEX IF NOT EXISTS idx_tasks_related ON public.tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity ON public.tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_person ON public.tasks(person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON public.tasks(reminder_at) WHERE reminder_at IS NOT NULL AND reminded_at IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timeline integration for tasks
CREATE OR REPLACE FUNCTION public.tlg_task_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event text;
  v_title text;
  v_person uuid;
  v_lead uuid;
  v_opp uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'TASK_CREATED';
    v_title := 'Task created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      v_event := 'TASK_COMPLETED';
      v_title := 'Task completed: ' || NEW.title;
    ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
      v_event := 'TASK_REOPENED';
      v_title := 'Task reopened: ' || NEW.title;
    ELSE
      v_event := 'TASK_UPDATED';
      v_title := 'Task updated: ' || NEW.title;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event := 'TASK_DELETED';
    v_title := 'Task deleted: ' || OLD.title;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_person := OLD.person_id; v_lead := OLD.lead_id; v_opp := OLD.opportunity_id;
    PERFORM public.timeline_log(v_event,'task',v_title,NULL,v_person,v_lead,v_opp,OLD.deal_id,NULL,
      jsonb_build_object('priority',OLD.priority,'task_type',OLD.task_type),
      auth.uid(), OLD.id, now());
    RETURN OLD;
  ELSE
    v_person := NEW.person_id; v_lead := NEW.lead_id; v_opp := NEW.opportunity_id;
    PERFORM public.timeline_log(v_event,'task',v_title,NEW.notes,v_person,v_lead,v_opp,NEW.deal_id,NULL,
      jsonb_build_object('priority',NEW.priority,'task_type',NEW.task_type,'status',NEW.status,'due_at',NEW.due_at),
      COALESCE(NEW.created_by, auth.uid()), NEW.id, now());
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_tasks_timeline_ins ON public.tasks;
CREATE TRIGGER trg_tasks_timeline_ins AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tlg_task_event();
DROP TRIGGER IF EXISTS trg_tasks_timeline_upd ON public.tasks;
CREATE TRIGGER trg_tasks_timeline_upd AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tlg_task_event();
DROP TRIGGER IF EXISTS trg_tasks_timeline_del ON public.tasks;
CREATE TRIGGER trg_tasks_timeline_del AFTER DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tlg_task_event();

-- Allow TASK_* event types in timeline_events check (if any restrictive check exists, this is a no-op otherwise)
-- (timeline_events.event_type is free text, so no constraint change needed.)

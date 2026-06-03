-- Add reference_number column
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE;

-- Sequence for daily numbering
CREATE SEQUENCE IF NOT EXISTS public.ticket_ref_seq;

-- Function to generate reference number
CREATE OR REPLACE FUNCTION public.generate_ticket_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_code TEXT;
  _seq INT;
BEGIN
  IF NEW.reference_number IS NOT NULL THEN RETURN NEW; END IF;
  _dept_code := CASE NEW.department
    WHEN 'HR' THEN 'HR'
    WHEN 'IT' THEN 'IT'
    WHEN 'Finance' THEN 'FIN'
    ELSE 'GEN'
  END;
  _seq := nextval('public.ticket_ref_seq');
  NEW.reference_number := 'TCK-' || _dept_code || '-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ticket_reference ON public.tickets;
CREATE TRIGGER trg_generate_ticket_reference
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_reference();

-- Replace resolution trigger with full status-change notification using professional templates
CREATE OR REPLACE FUNCTION public.handle_ticket_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_full TEXT;
  _title TEXT;
  _msg TEXT;
  _ref TEXT;
BEGIN
  _dept_full := CASE NEW.department
    WHEN 'HR' THEN 'Human Resources'
    WHEN 'IT' THEN 'Information Technology'
    WHEN 'Finance' THEN 'Finance'
    ELSE NEW.department
  END;
  _ref := COALESCE(NEW.reference_number, '#' || substr(NEW.id::text, 1, 8));

  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at := now();
    _title := 'Ticket Resolved — ' || _ref;
    _msg := 'Your request has been successfully resolved.' || E'\n\nReference Number: ' || _ref ||
            E'\nDepartment: ' || _dept_full || E'\nStatus: Resolved' ||
            E'\nResolved Date: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') ||
            E'\n\nShould you experience any further issues related to this request, please submit a new ticket and reference the number provided above.' ||
            E'\n\nThank you for working with us throughout the resolution process.' || E'\n\nSupport Centre';
    INSERT INTO public.notifications (user_id, title, message) VALUES (NEW.employee_id, _title, _msg);
  ELSIF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
    _title := 'Status Update: In Progress — ' || _ref;
    _msg := 'Thank you for your continued patience.' || E'\n\nYour request is currently being reviewed by the assigned department.' ||
            E'\n\nReference Number: ' || _ref || E'\nDepartment: ' || _dept_full || E'\nStatus: In Progress' ||
            E'\nLast Updated: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') ||
            E'\n\nOur team is actively working on your request and will provide further updates as progress is made.' ||
            E'\n\nSupport Centre';
    INSERT INTO public.notifications (user_id, title, message) VALUES (NEW.employee_id, _title, _msg);
  ELSIF NEW.status = 'escalated' AND OLD.status IS DISTINCT FROM 'escalated' THEN
    _title := 'Status Update: Escalated — ' || _ref;
    _msg := 'Your request has been escalated for additional attention.' ||
            E'\n\nReference Number: ' || _ref || E'\nDepartment: ' || _dept_full || E'\nStatus: Escalated' ||
            E'\nLast Updated: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') ||
            E'\n\nThe matter has been assigned for further investigation and prioritised accordingly.' ||
            E'\n\nWe appreciate your patience while this request is being addressed.' ||
            E'\n\nSupport Centre';
    INSERT INTO public.notifications (user_id, title, message) VALUES (NEW.employee_id, _title, _msg);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on creation: send "Open" acknowledgement notification
CREATE OR REPLACE FUNCTION public.handle_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_full TEXT;
  _msg TEXT;
  _ref TEXT;
BEGIN
  _dept_full := CASE NEW.department
    WHEN 'HR' THEN 'Human Resources'
    WHEN 'IT' THEN 'Information Technology'
    WHEN 'Finance' THEN 'Finance'
    ELSE NEW.department
  END;
  _ref := COALESCE(NEW.reference_number, '#' || substr(NEW.id::text, 1, 8));

  _msg := 'Thank you for contacting the Support Centre.' ||
          E'\n\nThis is an automated confirmation that your request has been successfully received and logged.' ||
          E'\n\nReference Number: ' || _ref || E'\nDepartment: ' || _dept_full || E'\nStatus: Open' ||
          E'\nDate Logged: ' || to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI') ||
          E'\n\nOur team will review your request and provide updates as progress is made. Please retain your reference number for any future communication regarding this matter.' ||
          E'\n\nThank you for your patience and cooperation.' || E'\n\nSupport Centre';

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (NEW.employee_id, 'Ticket Received — ' || _ref, _msg);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_ticket_created ON public.tickets;
CREATE TRIGGER trg_handle_ticket_created
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_created();

-- Ensure resolution trigger exists (BEFORE UPDATE so resolved_at write persists)
DROP TRIGGER IF EXISTS trg_handle_ticket_resolution ON public.tickets;
CREATE TRIGGER trg_handle_ticket_resolution
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_resolution();

-- Backfill reference numbers for existing tickets
UPDATE public.tickets t
SET reference_number = 'TCK-' || (CASE department WHEN 'HR' THEN 'HR' WHEN 'IT' THEN 'IT' WHEN 'Finance' THEN 'FIN' ELSE 'GEN' END)
  || '-' || to_char(created_at, 'YYYYMMDD') || '-' || lpad(nextval('public.ticket_ref_seq')::text, 4, '0')
WHERE reference_number IS NULL;
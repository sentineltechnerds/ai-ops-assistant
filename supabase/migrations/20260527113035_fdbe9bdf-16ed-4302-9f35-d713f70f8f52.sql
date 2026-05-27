
-- Drop dependents on app_role first
DROP POLICY IF EXISTS tickets_select_own_or_admin ON public.tickets;
DROP POLICY IF EXISTS tickets_update_admin ON public.tickets;
DROP POLICY IF EXISTS tickets_insert_own ON public.tickets;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- New enum
CREATE TYPE public.app_role_new AS ENUM ('employee', 'department_admin', 'super_admin');
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new
  USING (CASE WHEN role::text = 'admin' THEN 'super_admin'::public.app_role_new ELSE 'employee'::public.app_role_new END);
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- profiles.is_active
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
UPDATE public.profiles SET department = 'IT' WHERE department NOT IN ('HR','IT','Finance');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_check CHECK (department IN ('HR','IT','Finance'));

-- tickets.resolved_at + dept check
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
UPDATE public.tickets SET department = 'IT' WHERE department NOT IN ('HR','IT','Finance');
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_department_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_department_check CHECK (department IN ('HR','IT','Finance'));

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;
CREATE OR REPLACE FUNCTION public.is_department_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'department_admin')
$$;
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.profiles WHERE id = _user_id
$$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Policies
CREATE POLICY tickets_insert_own ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);
CREATE POLICY tickets_select_scoped ON public.tickets
  FOR SELECT TO authenticated USING (
    auth.uid() = employee_id
    OR public.is_super_admin(auth.uid())
    OR (public.is_department_admin(auth.uid()) AND department = public.get_user_department(auth.uid()))
  );
CREATE POLICY tickets_update_scoped ON public.tickets
  FOR UPDATE TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR (public.is_department_admin(auth.uid()) AND department = public.get_user_department(auth.uid()))
  );

CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_super_admin(auth.uid()));
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_scoped ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

CREATE POLICY user_roles_select_scoped ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

-- Resolution trigger
CREATE OR REPLACE FUNCTION public.handle_ticket_resolution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    NEW.resolved_at = now();
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.employee_id,
      'Ticket resolved',
      'Your ' || NEW.department || ' request "' || NEW.title || '" has been resolved.'
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ticket_resolution ON public.tickets;
CREATE TRIGGER trg_ticket_resolution
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_resolution();

-- handle_new_user updated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _dept text;
BEGIN
  _dept := COALESCE(NEW.raw_user_meta_data->>'department', 'IT');
  IF _dept NOT IN ('HR','IT','Finance') THEN _dept := 'IT'; END IF;
  INSERT INTO public.profiles (id, email, full_name, department)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), _dept);
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'employee'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

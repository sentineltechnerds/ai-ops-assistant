ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_check CHECK (department = ANY (ARRAY['HR'::text, 'IT'::text, 'Finance'::text, 'Operations'::text, 'General'::text]));
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_department_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_department_check CHECK (department = ANY (ARRAY['HR'::text, 'IT'::text, 'Finance'::text, 'Operations'::text]));
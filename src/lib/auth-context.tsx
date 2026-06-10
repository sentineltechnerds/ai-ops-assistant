import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "department_admin" | "employee";
export type Department = "HR" | "IT" | "Finance" | "Operations";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  department: Department | null;
  fullName: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  session: null, user: null, role: null, department: null, fullName: null,
  loading: true, refresh: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (sess: Session | null) => {
    if (!sess?.user) { setRole(null); setDepartment(null); setFullName(null); return; }
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", sess.user.id).maybeSingle(),
      supabase.from("profiles").select("department, full_name").eq("id", sess.user.id).maybeSingle(),
    ]);
    setRole((r?.role as AppRole) ?? "employee");
    setDepartment((p?.department as Department) ?? null);
    setFullName(p?.full_name ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setTimeout(() => { hydrate(sess); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      hydrate(data.session).finally(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, role, department, fullName, loading,
      refresh: () => hydrate(session),
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

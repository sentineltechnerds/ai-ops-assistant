import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Aurora" }] }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [f, setF] = useState({ fullName: "", email: "", department: "Operations", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) return toast.error("Passwords don't match");
    if (f.password.length < 6) return toast.error("Password must be 6+ characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: f.fullName, department: f.department, role: "employee" },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Sign out so the user explicitly logs in afterwards
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Account created — please sign in");
    nav({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="glass rounded-3xl p-8 shadow-glow">
          <h1 className="font-display text-2xl font-bold">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join your team's operations workspace.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            {[
              { k: "fullName", label: "Full name", type: "text" },
              { k: "email", label: "Work email", type: "email" },
            ].map(fl => (
              <div key={fl.k}>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{fl.label}</label>
                <input required type={fl.type} value={(f as any)[fl.k]} onChange={e => setF({ ...f, [fl.k]: e.target.value })} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department</label>
              <select value={f.department} onChange={e => setF({ ...f, department: e.target.value })} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm">
                {["HR", "Finance", "IT", "Operations"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative mt-1.5">
                <input type={show ? "text" : "password"} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm pr-11" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password</label>
              <input type={show ? "text" : "password"} required value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm" />
            </div>
            <button disabled={loading} className="w-full bg-gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold shadow-glow disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
}

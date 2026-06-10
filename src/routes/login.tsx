import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Aurora" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (session) nav({ to: "/dashboard", replace: true }); }, [session, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="glass rounded-3xl p-8 shadow-glow">
          <h1 className="font-display text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your operations command center.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative mt-1.5">
                <input type={show ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-11" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <button disabled={loading} className="w-full bg-gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold shadow-glow disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Accounts are provisioned by your administrator.</p>
        </div>
      </motion.div>
    </div>
  );
}

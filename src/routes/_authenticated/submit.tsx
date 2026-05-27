import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitTicket } from "@/lib/tickets.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/submit")({
  head: () => ({ meta: [{ title: "Submit Ticket — Aurora" }] }),
  component: Submit,
});

function Submit() {
  const fn = useServerFn(submitTicket);
  const nav = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: "", dept: "IT" as "HR" | "IT" | "Finance" });
  const [form, setForm] = useState<{ title: string; description: string; priority: "low" | "medium" | "high" | "critical" }>({ title: "", description: "", priority: "medium" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (user) supabase.from("profiles").select("full_name, department").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = (["HR","IT","Finance"].includes(data.department) ? data.department : "IT") as "HR"|"IT"|"Finance";
        setProfile({ name: data.full_name || user.email || "", dept: d });
      });
  }, [user]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fn({ data: {
        title: form.title, description: form.description, priority: form.priority,
        employeeName: profile.name, department: profile.dept,
      }});
      setResult(r.ticket);
      toast.success("Ticket submitted and classified");
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8 shadow-glow">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-success" /><h2 className="font-display text-2xl font-bold">Ticket routed</h2></div>
          <div className="mt-6 grid gap-4">
            <Row label="Ticket ID" value={`#${result.id.slice(0, 8)}`} />
            <Row label="Title" value={result.title} />
            <Row label="Predicted Category" value={<span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">{result.predicted_category}</span>} />
            <Row label="AI Confidence" value={`${Math.round(Number(result.confidence_score) * 100)}%`} />
            <Row label="AI Summary" value={<span className="italic text-muted-foreground">"{result.ai_summary}"</span>} />
            <Row label="Suggested Priority" value={<span className="uppercase text-xs font-bold">{result.ai_suggested_priority}</span>} />
            <Row label="Routed to" value={result.assigned_queue} />
            <Row label="Status" value={<span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase">{result.status}</span>} />
            {result.ai_fallback && <div className="text-xs text-warning bg-warning/10 rounded-xl p-3">AI fallback mode active — keyword classification used.</div>}
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={() => { setResult(null); setForm({ title: "", description: "", priority: "medium" }); }} className="px-5 py-2.5 rounded-xl bg-secondary text-sm font-medium">Submit another</button>
            <button onClick={() => nav({ to: "/dashboard" })} className="px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold">Go to dashboard</button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Submit a request</h1>
      <p className="text-sm text-muted-foreground mt-1">AI will classify, prioritize, and route automatically.</p>
      <form onSubmit={submit} className="mt-6 glass rounded-3xl p-7 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee Name"><input required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="input" /></Field>
          <Field label="Department"><select required value={profile.dept} onChange={e => setProfile({ ...profile, dept: e.target.value as "HR"|"IT"|"Finance" })} className="input">{["HR","IT","Finance"].map(d => <option key={d}>{d}</option>)}</select></Field>
        </div>
        <Field label="Request Title">
          <input required maxLength={150} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. VPN connection failing" />
          <div className="text-[10px] text-muted-foreground text-right mt-1">{form.title.length}/150</div>
        </Field>
        <Field label="Description">
          <textarea required maxLength={2000} rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input resize-none" placeholder="Describe the issue or request in detail…" />
          <div className="text-[10px] text-muted-foreground text-right mt-1">{form.description.length}/2000</div>
        </Field>
        <Field label="Priority Level">
          <div className="grid grid-cols-4 gap-2">
            {(["low", "medium", "high", "critical"] as const).map(p => (
              <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })} className={`rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition border ${form.priority === p ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-card border-border text-foreground hover:bg-secondary"}`}>{p}</button>
            ))}
          </div>
        </Field>
        <button disabled={loading} className="w-full bg-gradient-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold shadow-glow disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI analyzing…</> : <><Sparkles className="h-4 w-4" /> Submit & classify</>}
        </button>
      </form>
      <style>{`.input { width: 100%; border-radius: 0.75rem; background: var(--card); border: 1px solid var(--border); padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; } .input:focus { box-shadow: 0 0 0 2px var(--ring); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label><div className="mt-1.5">{children}</div></div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><span className="text-sm font-medium text-right">{value}</span></div>;
}

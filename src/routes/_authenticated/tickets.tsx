import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Clock, CheckCircle2, AlertTriangle, ArrowRightCircle, Sparkles } from "lucide-react";
import { listAllTickets, listMyTickets } from "@/lib/tickets.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "Ticket History — Aurora" }] }),
  component: Tickets,
});

const STATUS_FLOW = ["new", "in_progress", "awaiting_review", "escalated", "resolved"] as const;
const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  new: { label: "New", icon: Sparkles, color: "text-primary bg-primary/15" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-warning bg-warning/15" },
  awaiting_review: { label: "Awaiting Review", icon: ArrowRightCircle, color: "text-accent-foreground bg-accent/30" },
  escalated: { label: "Escalated", icon: AlertTriangle, color: "text-critical bg-critical/15" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-success bg-success/15" },
};

function Tickets() {
  const { role, department } = useAuth();
  const isAdmin = role === "super_admin" || role === "department_admin";
  const fn = useServerFn(isAdmin ? listAllTickets : listMyTickets);
  const { data } = useQuery({ queryKey: ["tickets-history", role], queryFn: () => fn() });
  const [q, setQ] = useState("");

  let tickets = data?.tickets ?? [];
  if (role === "department_admin" && department) tickets = tickets.filter(t => t.department === department);
  tickets = tickets.filter(t =>
    q === "" || t.title.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Ticket history</h1>
        <p className="text-sm text-muted-foreground mt-1">Track every request, its AI classification, and lifecycle.</p>
      </header>

      <div className="glass rounded-2xl p-3 flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tickets…" className="flex-1 bg-transparent text-sm outline-none py-2" />
      </div>

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-sm text-muted-foreground">No tickets found.</div>
        ) : tickets.map((t, i) => {
          const meta = STATUS_META[t.status] ?? STATUS_META.new;
          const stepIndex = STATUS_FLOW.indexOf(t.status as any);
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass rounded-3xl p-6 hover:shadow-glow transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">#{t.id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{t.department}</span>
                    <span>·</span>
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-semibold text-base mt-1.5">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  {t.ai_summary && (
                    <div className="mt-3 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary"><Sparkles className="h-3 w-3" /> AI insight</span>
                      <span className="text-muted-foreground italic"> · "{t.ai_summary}"</span>
                      {t.confidence_score && <span className="ml-2 text-muted-foreground">{Math.round(Number(t.confidence_score) * 100)}% confidence</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <motion.span animate={t.priority === "critical" ? { scale: [1, 1.05, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${t.priority === "critical" ? "bg-critical/15 text-critical" : t.priority === "high" ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"}`}>
                    {t.priority}
                  </motion.span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${meta.color}`}>
                    <meta.icon className="h-3 w-3" /> {meta.label}
                  </span>
                </div>
              </div>

              {/* Progress timeline */}
              <div className="mt-5 flex items-center gap-2">
                {STATUS_FLOW.map((s, idx) => {
                  const reached = idx <= (stepIndex === -1 ? 0 : stepIndex);
                  return (
                    <div key={s} className="flex-1 flex items-center gap-2">
                      <div className={`h-1.5 flex-1 rounded-full transition-colors ${reached ? "bg-gradient-primary" : "bg-secondary"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                {STATUS_FLOW.map(s => <span key={s} className="flex-1 text-center">{STATUS_META[s].label}</span>)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

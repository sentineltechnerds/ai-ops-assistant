import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { listAllTickets, updateTicketStatus } from "@/lib/tickets.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({ meta: [{ title: "Department Queue — Aurora" }] }),
  component: Queue,
});

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

function Queue() {
  const { role, department } = useAuth();
  const listFn = useServerFn(listAllTickets);
  const updateFn = useServerFn(updateTicketStatus);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["queue", department],
    queryFn: () => listFn(),
    enabled: role === "department_admin" || role === "super_admin",
    refetchInterval: 15000,
  });

  if (role !== "department_admin" && role !== "super_admin") {
    return <div className="text-sm text-muted-foreground">Access denied.</div>;
  }

  const scoped = (data?.tickets ?? [])
    .filter(t => role === "super_admin" || t.department === department)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 4;
      const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 4;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const counters = {
    critical: scoped.filter(t => t.priority === "critical" && t.status !== "resolved").length,
    high: scoped.filter(t => t.priority === "high" && t.status !== "resolved").length,
    open: scoped.filter(t => t.status !== "resolved").length,
    resolvedToday: scoped.filter(t => t.status === "resolved" && t.resolved_at && new Date(t.resolved_at) >= today).length,
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await updateFn({ data: { id, status: status as any } });
      toast.success("Status updated");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const cards = [
    { label: "Critical", value: counters.critical, icon: AlertTriangle, color: "text-critical" },
    { label: "High", value: counters.high, icon: Zap, color: "text-warning" },
    { label: "Open", value: counters.open, icon: Clock, color: "text-primary" },
    { label: "Resolved Today", value: counters.resolvedToday, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{department ?? "Department"} Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-prioritized operational queue. Critical tickets surface first.</p>
        </div>
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live · auto-refresh
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass rounded-2xl p-4">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <div className="text-2xl font-bold mt-2">{c.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        scoped.length === 0 ? <div className="glass rounded-3xl p-12 text-center text-sm text-muted-foreground">Queue is clear.</div> :
        <div className="space-y-3">
          {scoped.map(t => {
            const isCritical = t.priority === "critical";
            return (
              <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`glass rounded-2xl p-4 flex flex-wrap items-center gap-4 relative overflow-hidden ${isCritical ? "ring-2 ring-critical/50 shadow-[0_0_24px_-4px_oklch(0.65_0.2_25/0.45)]" : ""}`}>
                {isCritical && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0.0, 0.15, 0.0] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    style={{ background: "radial-gradient(circle at 0% 50%, oklch(0.65 0.2 25 / 0.4), transparent 60%)" }}
                  />
                )}
                <div className="flex-1 min-w-[240px] relative">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm">{t.title}</div>
                    {isCritical && (
                      <motion.span animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-critical text-white">
                        <AlertTriangle className="h-2.5 w-2.5" /> Escalate
                      </motion.span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.employee_name} · {new Date(t.created_at).toLocaleString()}</div>
                  {t.ai_summary && <div className="text-xs text-muted-foreground mt-1.5 italic">"{t.ai_summary}"</div>}
                </div>
                <motion.span animate={isCritical ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 1.4 }}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${PRIORITY_STYLE[t.priority]}`}>
                  {t.priority}
                </motion.span>
                <select value={t.status} onChange={e => setStatus(t.id, e.target.value)} className="text-xs rounded-lg bg-card border border-border px-2.5 py-1.5 relative">
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                </select>
              </motion.div>
            );
          })}
        </div>}
    </div>
  );
}

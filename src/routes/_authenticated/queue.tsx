import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { listAllTickets, updateTicketStatus } from "@/lib/tickets.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({ meta: [{ title: "Department Queue — Aurora" }] }),
  component: Queue,
});

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function Queue() {
  const { role, department } = useAuth();
  const listFn = useServerFn(listAllTickets);
  const updateFn = useServerFn(updateTicketStatus);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["queue", department],
    queryFn: () => listFn(),
    enabled: role === "department_admin" || role === "super_admin",
  });

  if (role !== "department_admin" && role !== "super_admin") {
    return <div className="text-sm text-muted-foreground">Access denied.</div>;
  }

  const scoped = (data?.tickets ?? [])
    .filter(t => role === "super_admin" || t.department === department)
    .sort((a, b) => (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 4) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 4));

  const setStatus = async (id: string, status: string) => {
    try {
      await updateFn({ data: { id, status: status as any } });
      toast.success("Status updated");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{department ?? "Department"} Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Live operational queue scoped to your department.</p>
      </header>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        scoped.length === 0 ? <div className="glass rounded-3xl p-12 text-center text-sm text-muted-foreground">Queue is clear.</div> :
        <div className="space-y-3">
          {scoped.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`glass rounded-2xl p-4 flex flex-wrap items-center gap-4 ${t.priority === "critical" ? "ring-2 ring-critical/40" : ""}`}>
              <div className="flex-1 min-w-[240px]">
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.employee_name} · {new Date(t.created_at).toLocaleString()}</div>
                {t.ai_summary && <div className="text-xs text-muted-foreground mt-1.5 italic">"{t.ai_summary}"</div>}
              </div>
              <motion.span animate={t.priority === "critical" ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 1.4 }}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${t.priority === "critical" ? "bg-critical/15 text-critical" : t.priority === "high" ? "bg-warning/15 text-warning" : "bg-secondary"}`}>
                {t.priority}
              </motion.span>
              <select value={t.status} onChange={e => setStatus(t.id, e.target.value)} className="text-xs rounded-lg bg-card border border-border px-2.5 py-1.5">
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            </motion.div>
          ))}
        </div>}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Ticket, Users, Cpu, DollarSign, Wrench, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { listAllTickets, listMyTickets, updateTicketStatus } from "@/lib/tickets.functions";
import { getWeeklyInsights } from "@/lib/analytics.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Aurora" }] }),
  component: Dashboard,
});

const priorityColors: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};
const statusColors: Record<string, string> = {
  new: "bg-primary/15 text-primary",
  in_progress: "bg-warning/15 text-warning",
  escalated: "bg-critical/15 text-critical",
  resolved: "bg-success/15 text-success",
};
const CHART_COLORS = ["oklch(0.55 0.14 280)", "oklch(0.74 0.09 285)", "oklch(0.78 0.16 70)", "oklch(0.7 0.14 160)"];

function Dashboard() {
  const { role, department } = useAuth();
  const isSuper = role === "super_admin";
  const isDeptAdmin = role === "department_admin";
  const isAdmin = isSuper || isDeptAdmin;
  const fn = useServerFn(isAdmin ? listAllTickets : listMyTickets);
  const updateFn = useServerFn(updateTicketStatus);
  const insightsFn = useServerFn(getWeeklyInsights);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tickets", role, department],
    queryFn: () => fn(),
  });
  const insightsQ = useQuery({
    queryKey: ["enterprise-weekly"],
    queryFn: () => insightsFn({ data: { scope: "all" } }),
    enabled: isSuper,
    staleTime: 5 * 60 * 1000,
  });

  const allTickets = data?.tickets ?? [];
  // Department admin: scope client-side too (RLS already enforces it)
  const tickets = isDeptAdmin && department
    ? allTickets.filter(t => t.department === department)
    : allTickets;

  const stats = {
    total: tickets.length,
    HR: tickets.filter(t => t.predicted_category === "HR" || t.department === "HR").length,
    IT: tickets.filter(t => t.predicted_category === "IT" || t.department === "IT").length,
    Finance: tickets.filter(t => t.predicted_category === "Finance" || t.department === "Finance").length,
    critical: tickets.filter(t => t.priority === "critical").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    escalated: tickets.filter(t => t.status === "escalated").length,
  };

  const catData = [
    { name: "HR", value: stats.HR },
    { name: "IT", value: stats.IT },
    { name: "Finance", value: stats.Finance },
  ];

  const sorted = [...tickets].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority as keyof typeof order] ?? 4) - (order[b.priority as keyof typeof order] ?? 4);
  }).slice(0, 6);

  const setStatus = async (id: string, status: string) => {
    try {
      await updateFn({ data: { id, status: status as any } });
      toast.success("Status updated");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const cards = [
    { label: "Total Tickets", value: stats.total, icon: Ticket, color: "text-primary" },
    { label: "HR", value: stats.HR, icon: Users, color: "text-accent-foreground" },
    { label: "IT", value: stats.IT, icon: Cpu, color: "text-primary" },
    { label: "Finance", value: stats.Finance, icon: DollarSign, color: "text-warning" },
    { label: "Critical", value: stats.critical, icon: AlertTriangle, color: "text-critical" },
    { label: "Escalated", value: stats.escalated, icon: Wrench, color: "text-warning" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Operations Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Full visibility across every queue." : "Your personal operations dashboard."}</p>
        </div>
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live · {tickets.length} tickets
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass rounded-2xl p-4">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <div className="text-2xl font-bold mt-2">{c.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Category distribution</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData}>
              <XAxis dataKey="name" stroke="oklch(0.5 0.04 270)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.04 270)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.91 0.015 280)", borderRadius: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Priority breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: "Critical", value: tickets.filter(t => t.priority === "critical").length },
                { name: "High", value: tickets.filter(t => t.priority === "high").length },
                { name: "Medium", value: tickets.filter(t => t.priority === "medium").length },
                { name: "Low", value: tickets.filter(t => t.priority === "low").length },
              ]} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="glass rounded-3xl p-6">
        <h3 className="font-semibold mb-4">Priority Ticket Queue</h3>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-12">No tickets yet. Submit your first request to see the AI in action.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(t => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`rounded-2xl bg-card/80 border border-border p-4 flex flex-wrap items-center gap-4 ${t.priority === "critical" ? "pulse-glow" : ""}`}>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.employee_name} · {t.assigned_queue}</div>
                  {t.ai_summary && <div className="text-xs text-muted-foreground mt-1.5 italic">"{t.ai_summary}"</div>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${priorityColors[t.priority]}`}>{t.priority}</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-secondary font-medium">{t.predicted_category}</span>
                {t.confidence_score && <span className="text-[10px] text-muted-foreground">AI {Math.round(Number(t.confidence_score) * 100)}%</span>}
                {isDeptAdmin ? (
                  <select value={t.status} onChange={e => setStatus(t.id, e.target.value)} className={`text-[10px] font-semibold uppercase rounded-full px-2.5 py-1 border-0 ${statusColors[t.status]}`}>
                    <option value="new">New</option><option value="in_progress">In Progress</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option>
                  </select>
                ) : (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {isSuper && (
        <section className="glass rounded-3xl p-6 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Enterprise Weekly Summary</h3>
          </div>
          {insightsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Generating executive briefing…</div>
          ) : insightsQ.data?.empty || !insightsQ.data?.enterprise ? (
            <div className="text-sm text-muted-foreground">No summary available yet — insufficient ticket activity.</div>
          ) : (() => {
            const e = insightsQ.data.enterprise;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div><div className="text-muted-foreground">Total</div><div className="font-bold text-lg">{e.total}</div></div>
                  <div><div className="text-muted-foreground">Open</div><div className="font-bold text-lg">{e.open}</div></div>
                  <div><div className="text-muted-foreground">Closed</div><div className="font-bold text-lg">{e.closed}</div></div>
                  <div><div className="text-muted-foreground">Top Dept</div><div className="font-bold text-lg">{e.topDept}</div></div>
                  <div><div className="text-muted-foreground">WoW Trend</div><div className={`font-bold text-lg ${e.wowTrendPct > 0 ? "text-warning" : e.wowTrendPct < 0 ? "text-success" : "text-muted-foreground"}`}>{e.wowTrendPct > 0 ? "↑" : e.wowTrendPct < 0 ? "↓" : "→"} {Math.abs(e.wowTrendPct)}%</div></div>
                </div>
                {e.insight && (
                  <p className="text-sm leading-relaxed italic text-muted-foreground border-t border-border/50 pt-4">"{e.insight}"</p>
                )}
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Ticket, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { listAllTickets } from "@/lib/tickets.functions";
import { getWeeklyInsights } from "@/lib/analytics.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Aurora" }] }),
  component: AnalyticsPage,
});

const CHART_COLORS = ["oklch(0.55 0.14 280)", "oklch(0.74 0.09 285)", "oklch(0.78 0.16 70)", "oklch(0.7 0.14 160)"];
type RangeKey = "today" | "7d" | "30d" | "all";

function rangeStart(key: RangeKey): number | null {
  const now = Date.now();
  if (key === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  if (key === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (key === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function trendIcon(pct: number) {
  if (pct > 1) return { Icon: TrendingUp, color: "text-warning", label: "↑" };
  if (pct < -1) return { Icon: TrendingDown, color: "text-success", label: "↓" };
  return { Icon: Minus, color: "text-muted-foreground", label: "→" };
}

function fmtMin(m: number | null) {
  if (m === null) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

function AnalyticsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (role === "employee") navigate({ to: "/tickets", replace: true });
  }, [role, navigate]);

  const fnTickets = useServerFn(listAllTickets);
  const fnInsights = useServerFn(getWeeklyInsights);
  const [range, setRange] = useState<RangeKey>("7d");
  const [deptFilter, setDeptFilter] = useState<"ALL" | "IT" | "HR" | "Finance">("ALL");

  const ticketsQ = useQuery({ queryKey: ["analytics-tickets"], queryFn: () => fnTickets() });
  const insightsQ = useQuery({
    queryKey: ["analytics-insights"],
    queryFn: () => fnInsights({ data: { scope: "all" } }),
    staleTime: 5 * 60 * 1000,
  });

  const allTickets = ticketsQ.data?.tickets ?? [];

  const tickets = useMemo(() => {
    const start = rangeStart(range);
    return allTickets.filter(t => {
      if (start !== null && new Date(t.created_at).getTime() < start) return false;
      if (deptFilter !== "ALL" && t.department !== deptFilter) return false;
      return true;
    });
  }, [allTickets, range, deptFilter]);

  // KPIs + WoW
  const kpis = useMemo(() => {
    const now = Date.now();
    const wk = 7 * 24 * 60 * 60 * 1000;
    const tw = allTickets.filter(t => now - new Date(t.created_at).getTime() <= wk);
    const pw = allTickets.filter(t => {
      const d = now - new Date(t.created_at).getTime();
      return d > wk && d <= 2 * wk;
    });
    const responseMin = (arr: any[]) => {
      const v = arr
        .filter(t => t.resolved_at)
        .map(t => (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000)
        .filter(n => n >= 0);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

    return {
      total: { v: tickets.length, t: pct(tw.length, pw.length) },
      open: {
        v: tickets.filter(t => t.status !== "resolved").length,
        t: pct(tw.filter(t => t.status !== "resolved").length, pw.filter(t => t.status !== "resolved").length),
      },
      closed: {
        v: tickets.filter(t => t.status === "resolved").length,
        t: pct(tw.filter(t => t.status === "resolved").length, pw.filter(t => t.status === "resolved").length),
      },
      avg: {
        v: responseMin(tickets),
        t: (() => {
          const a = responseMin(tw), b = responseMin(pw);
          if (a === null || b === null) return 0;
          return pct(Math.round(a), Math.round(b));
        })(),
      },
    };
  }, [tickets, allTickets]);

  // Volume line chart — bucket by day
  const volumeData = useMemo(() => {
    const start = rangeStart(range);
    const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 30;
    const buckets: { date: string; ts: number; created: number; resolved: number; open: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      buckets.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        ts: d.getTime(), created: 0, resolved: 0, open: 0,
      });
    }
    const inRange = (t: any) => {
      if (start !== null && new Date(t.created_at).getTime() < start) return false;
      if (deptFilter !== "ALL" && t.department !== deptFilter) return false;
      return true;
    };
    for (const t of allTickets) {
      if (!inRange(t)) continue;
      const day = new Date(t.created_at); day.setHours(0, 0, 0, 0);
      const b = buckets.find(x => x.ts === day.getTime());
      if (b) {
        b.created++;
        if (t.status === "resolved") b.resolved++;
        else b.open++;
      }
    }
    return buckets;
  }, [allTickets, range, deptFilter]);

  // Pie data
  const catData = [
    { name: "IT", value: tickets.filter(t => t.department === "IT").length },
    { name: "HR", value: tickets.filter(t => t.department === "HR").length },
    { name: "Finance", value: tickets.filter(t => t.department === "Finance").length },
  ];

  // Response time bar chart per dept
  const respData = ["IT", "HR", "Finance"].map(d => {
    const arr = tickets.filter(t => t.department === d && t.resolved_at)
      .map(t => (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) / 60000)
      .filter(n => n >= 0);
    return {
      department: d,
      avg: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
      fastest: arr.length ? Math.round(Math.min(...arr)) : 0,
      slowest: arr.length ? Math.round(Math.max(...arr)) : 0,
    };
  });

  // Dept performance table
  const perfRows = ["IT", "HR", "Finance"].map(d => {
    const dep = tickets.filter(t => t.department === d);
    const resolved = dep.filter(t => t.status === "resolved");
    const open = dep.filter(t => t.status !== "resolved");
    const arr = resolved.map(t => t.resolved_at
      ? (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000 : null)
      .filter((n): n is number => n !== null && n >= 0);
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return { dept: d, total: dep.length, open: open.length, resolved: resolved.length, avg, workload: open.length };
  });

  const insights = insightsQ.data;
  const emptyState = !ticketsQ.isLoading && allTickets.length === 0;

  if (emptyState) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Operational reporting & AI insights.</p>
        </header>
        <div className="glass rounded-3xl p-12 text-center text-sm text-muted-foreground">
          No analytics are available yet. Analytics and weekly insights will be generated automatically as ticket activity increases.
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Tickets", value: kpis.total.v, trend: kpis.total.t, icon: Ticket },
    { label: "Open Tickets", value: kpis.open.v, trend: kpis.open.t, icon: AlertCircle },
    { label: "Closed Tickets", value: kpis.closed.v, trend: kpis.closed.t, icon: CheckCircle2 },
    { label: "Avg Response Time", value: fmtMin(kpis.avg.v), trend: kpis.avg.t, icon: Clock },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Operational reporting & weekly AI insights.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="glass rounded-full p-1 flex text-xs">
            {(["today", "7d", "30d", "all"] as RangeKey[]).map(k => (
              <button key={k} onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-full font-medium transition ${range === k ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {k === "today" ? "Today" : k === "7d" ? "7 days" : k === "30d" ? "30 days" : "All"}
              </button>
            ))}
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value as any)}
            className="glass rounded-full px-3 py-1.5 text-xs font-medium bg-transparent">
            <option value="ALL">All departments</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((c, i) => {
          const t = trendIcon(c.trend);
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <c.icon className="h-4 w-4 text-primary" />
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${t.color}`}>
                  <t.Icon className="h-3 w-3" /> {Math.abs(c.trend)}%
                </span>
              </div>
              <div className="text-2xl font-bold mt-2">{c.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{c.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Volume + Pie */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Ticket volume</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.015 280)" />
              <XAxis dataKey="date" fontSize={11} stroke="oklch(0.5 0.04 270)" />
              <YAxis fontSize={11} stroke="oklch(0.5 0.04 270)" />
              <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.91 0.015 280)", borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="created" stroke={CHART_COLORS[0]} strokeWidth={2} name="Created" dot={false} />
              <Line type="monotone" dataKey="resolved" stroke={CHART_COLORS[3]} strokeWidth={2} name="Resolved" dot={false} />
              <Line type="monotone" dataKey="open" stroke={CHART_COLORS[2]} strokeWidth={2} name="Open" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Category distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3} label={(e: any) => `${e.name} ${Math.round((e.percent || 0) * 100)}%`}>
                {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Response time */}
      <div className="glass rounded-3xl p-6">
        <h3 className="font-semibold mb-4">Response time by department (minutes)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={respData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.015 280)" />
            <XAxis type="number" fontSize={11} stroke="oklch(0.5 0.04 270)" />
            <YAxis dataKey="department" type="category" fontSize={12} stroke="oklch(0.5 0.04 270)" />
            <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.91 0.015 280)", borderRadius: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="fastest" fill={CHART_COLORS[3]} name="Fastest" radius={[0, 6, 6, 0]} />
            <Bar dataKey="avg" fill={CHART_COLORS[0]} name="Average" radius={[0, 6, 6, 0]} />
            <Bar dataKey="slowest" fill={CHART_COLORS[2]} name="Slowest" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department performance table */}
      <div className="glass rounded-3xl p-6">
        <h3 className="font-semibold mb-4">Department performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Open</th>
                <th className="py-2 pr-4">Resolved</th>
                <th className="py-2 pr-4">Avg Response</th>
                <th className="py-2 pr-4">Workload</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.map(r => (
                <tr key={r.dept} className="border-b border-border/40">
                  <td className="py-2.5 pr-4 font-medium">{r.dept}</td>
                  <td className="py-2.5 pr-4">{r.total}</td>
                  <td className="py-2.5 pr-4">{r.open}</td>
                  <td className="py-2.5 pr-4">{r.resolved}</td>
                  <td className="py-2.5 pr-4">{fmtMin(r.avg)}</td>
                  <td className="py-2.5 pr-4">{r.workload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly AI Insight cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Weekly AI insights</h3>
        </div>
        {insightsQ.isLoading ? (
          <div className="text-sm text-muted-foreground">Generating insights…</div>
        ) : insights?.empty || !insights ? (
          <div className="text-sm text-muted-foreground">No insights available yet.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {insights.departments.map(d => {
              const t = trendIcon(d.wowTrendPct);
              return (
                <motion.div key={d.department} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{d.department}</div>
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${t.color}`}>
                      <t.Icon className="h-3 w-3" /> {Math.abs(d.wowTrendPct)}% WoW
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><div className="text-muted-foreground">Total</div><div className="font-semibold text-base">{d.total}</div></div>
                    <div><div className="text-muted-foreground">Resolved</div><div className="font-semibold text-base">{d.resolved}</div></div>
                    <div><div className="text-muted-foreground">Avg Response</div><div className="font-semibold">{fmtMin(d.avgResponseMinutes)}</div></div>
                    <div><div className="text-muted-foreground">Top Request</div><div className="font-semibold capitalize truncate" title={d.topRequest}>{d.topRequest}</div></div>
                  </div>
                  {d.insight && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-border/50 pt-3">"{d.insight}"</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

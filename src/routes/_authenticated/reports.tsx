import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { FileText, Download, FileSpreadsheet, Printer, Sparkles, Calendar } from "lucide-react";
import { listAllTickets } from "@/lib/tickets.functions";
import { getWeeklyInsights } from "@/lib/analytics.functions";
import { useAuth, type Department } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Aurora" }] }),
  component: ReportsPage,
});

const ALL_DEPTS: Department[] = ["IT", "HR", "Finance", "Operations"];
type RangeKey = "7d" | "30d" | "90d" | "all";

function rangeStart(key: RangeKey): number | null {
  const now = Date.now();
  if (key === "7d") return now - 7 * 86400000;
  if (key === "30d") return now - 30 * 86400000;
  if (key === "90d") return now - 90 * 86400000;
  return null;
}

function fmtMin(m: number | null): string {
  if (m === null) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

function ReportsPage() {
  const { role, department, fullName } = useAuth();
  const navigate = useNavigate();

  // Employees blocked
  useEffect(() => {
    if (role && role === "employee") navigate({ to: "/tickets", replace: true });
  }, [role, navigate]);

  const isSuper = role === "super_admin";
  const isDeptAdmin = role === "department_admin";

  const fnTickets = useServerFn(listAllTickets);
  const fnInsights = useServerFn(getWeeklyInsights);
  const [range, setRange] = useState<RangeKey>("30d");

  const ticketsQ = useQuery({ queryKey: ["reports-tickets"], queryFn: () => fnTickets() });
  const insightsQ = useQuery({
    queryKey: ["reports-insights", role, department],
    queryFn: () =>
      isDeptAdmin && department
        ? fnInsights({ data: { scope: "department", department } })
        : fnInsights({ data: { scope: "all" } }),
    staleTime: 5 * 60 * 1000,
  });

  const allTickets = ticketsQ.data?.tickets ?? [];
  // Department admin: lock to own dept (RLS also enforces server-side)
  const scopedAll = useMemo(
    () => (isDeptAdmin && department ? allTickets.filter(t => t.department === department) : allTickets),
    [allTickets, isDeptAdmin, department],
  );
  const visibleDepts: Department[] = isDeptAdmin && department ? [department] : ALL_DEPTS;

  const tickets = useMemo(() => {
    const start = rangeStart(range);
    return start === null ? scopedAll : scopedAll.filter(t => new Date(t.created_at).getTime() >= start);
  }, [scopedAll, range]);

  const summary = useMemo(() => {
    const responses = tickets
      .filter(t => t.resolved_at)
      .map(t => (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) / 60000)
      .filter(n => n >= 0);
    const avg = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null;
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status !== "resolved").length,
      resolved: tickets.filter(t => t.status === "resolved").length,
      escalated: tickets.filter(t => t.status === "escalated").length,
      critical: tickets.filter(t => t.priority === "critical").length,
      avgResponse: avg,
      slaPct: tickets.length === 0 ? 0 : Math.round((tickets.filter(t => t.status === "resolved").length / tickets.length) * 100),
    };
  }, [tickets]);

  const perDept = useMemo(() => visibleDepts.map(d => {
    const dep = tickets.filter(t => t.department === d);
    const resolved = dep.filter(t => t.status === "resolved");
    const arr = resolved.map(t => t.resolved_at
      ? (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) / 60000 : null)
      .filter((n): n is number => n !== null && n >= 0);
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const catCounts: Record<string, number> = {};
    for (const t of dep) {
      const c = String(t.predicted_category ?? "general");
      catCounts[c] = (catCounts[c] || 0) + 1;
    }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return {
      department: d,
      total: dep.length,
      open: dep.filter(t => t.status !== "resolved").length,
      resolved: resolved.length,
      escalated: dep.filter(t => t.status === "escalated").length,
      avg,
      topCategory: topCat,
      backlog: dep.filter(t => t.status !== "resolved").length,
    };
  }), [tickets, visibleDepts]);

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "All time";
  const scopeLabel = isDeptAdmin && department ? `${department} Department` : "Enterprise";
  const generatedAt = new Date().toLocaleString();

  const downloadCSV = () => {
    const rows: string[][] = [
      ["Aurora Operations Report"],
      ["Scope", scopeLabel],
      ["Period", rangeLabel],
      ["Generated", generatedAt],
      [],
      ["Summary"],
      ["Total Tickets", String(summary.total)],
      ["Open", String(summary.open)],
      ["Resolved", String(summary.resolved)],
      ["Escalated", String(summary.escalated)],
      ["Critical", String(summary.critical)],
      ["Avg Response", fmtMin(summary.avgResponse)],
      ["Resolution Rate %", String(summary.slaPct)],
      [],
      ["Department Breakdown"],
      ["Department", "Total", "Open", "Resolved", "Escalated", "Avg Response", "Top Category", "Backlog"],
      ...perDept.map(r => [r.department, String(r.total), String(r.open), String(r.resolved), String(r.escalated), fmtMin(r.avg), r.topCategory, String(r.backlog)]),
      [],
      ["Tickets"],
      ["Reference", "Created", "Department", "Priority", "Status", "Category", "Title", "Employee"],
      ...tickets.map(t => [
        String(t.reference_number ?? t.id),
        new Date(t.created_at).toISOString(),
        String(t.department),
        String(t.priority),
        String(t.status),
        String(t.predicted_category ?? ""),
        String(t.title ?? "").replace(/"/g, "'"),
        String(t.employee_name ?? ""),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora-report-${scopeLabel.replace(/\s+/g, "-").toLowerCase()}-${range}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const downloadExcel = () => {
    // Excel-compatible: tab-separated values with .xls extension opens in Excel.
    const rows: string[][] = [
      ["Department", "Total", "Open", "Resolved", "Escalated", "Avg Response", "Top Category", "Backlog"],
      ...perDept.map(r => [r.department, String(r.total), String(r.open), String(r.resolved), String(r.escalated), fmtMin(r.avg), r.topCategory, String(r.backlog)]),
    ];
    const html = `<html><head><meta charset="utf-8"></head><body><h2>Aurora Report — ${scopeLabel}</h2><p>${rangeLabel} · Generated ${generatedAt}</p><table border="1" cellpadding="6" cellspacing="0">${rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora-report-${range}-${Date.now()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exported");
  };

  const downloadPDF = () => {
    window.print();
  };

  const insights = insightsQ.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold">Reporting Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDeptAdmin ? `${department} department reports & AI executive summaries.` : "Enterprise reports, AI executive summaries and exports."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="glass rounded-full p-1 flex text-xs">
            {(["7d", "30d", "90d", "all"] as RangeKey[]).map(k => (
              <button key={k} onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-full font-medium transition ${range === k ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {k === "7d" ? "7d" : k === "30d" ? "30d" : k === "90d" ? "90d" : "All"}
              </button>
            ))}
          </div>
          <button onClick={downloadCSV} className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary/10">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={downloadExcel} className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary/10">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={downloadPDF} className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:opacity-90">
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </header>

      <div id="report-print" className="space-y-6">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Executive Report
              </div>
              <div className="font-display text-2xl font-bold mt-2">{scopeLabel} Operations Report</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> {rangeLabel} · Generated {generatedAt}
                {fullName && <> · Prepared for {fullName}</>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { l: "Total", v: summary.total },
            { l: "Open", v: summary.open },
            { l: "Resolved", v: summary.resolved },
            { l: "Escalated", v: summary.escalated },
            { l: "Critical", v: summary.critical },
            { l: "Avg Response", v: fmtMin(summary.avgResponse) },
            { l: "Resolution %", v: `${summary.slaPct}%` },
          ].map(c => (
            <div key={c.l} className="glass rounded-2xl p-4">
              <div className="text-2xl font-bold">{c.v}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{c.l}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">AI Executive Summary</h3>
          </div>
          {insightsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Generating executive summary…</div>
          ) : insights?.empty || !insights ? (
            <div className="text-sm text-muted-foreground">Additional ticket activity is required to generate an executive summary.</div>
          ) : isSuper && insights.enterprise ? (
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="italic text-muted-foreground">"{insights.enterprise.insight || "Summary will appear once AI analysis is available."}"</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs pt-3 border-t border-border/50">
                <div><div className="text-muted-foreground">Total</div><div className="font-bold text-lg">{insights.enterprise.total}</div></div>
                <div><div className="text-muted-foreground">Open</div><div className="font-bold text-lg">{insights.enterprise.open}</div></div>
                <div><div className="text-muted-foreground">Closed</div><div className="font-bold text-lg">{insights.enterprise.closed}</div></div>
                <div><div className="text-muted-foreground">Top Dept</div><div className="font-bold text-lg">{insights.enterprise.topDept}</div></div>
                <div><div className="text-muted-foreground">WoW Trend</div><div className="font-bold text-lg">{insights.enterprise.wowTrendPct}%</div></div>
              </div>
            </div>
          ) : insights.departments[0] ? (
            <p className="text-sm italic text-muted-foreground leading-relaxed">"{insights.departments[0].insight || "Summary will appear once AI analysis is available."}"</p>
          ) : (
            <div className="text-sm text-muted-foreground">No summary available.</div>
          )}
        </div>

        <div className="glass rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Department Intelligence</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Open</th>
                  <th className="py-2 pr-4">Resolved</th>
                  <th className="py-2 pr-4">Escalated</th>
                  <th className="py-2 pr-4">Avg Response</th>
                  <th className="py-2 pr-4">Top Category</th>
                  <th className="py-2 pr-4">Backlog</th>
                </tr>
              </thead>
              <tbody>
                {perDept.map(r => (
                  <tr key={r.department} className="border-b border-border/40">
                    <td className="py-2.5 pr-4 font-medium">{r.department}</td>
                    <td className="py-2.5 pr-4">{r.total}</td>
                    <td className="py-2.5 pr-4">{r.open}</td>
                    <td className="py-2.5 pr-4">{r.resolved}</td>
                    <td className="py-2.5 pr-4">{r.escalated}</td>
                    <td className="py-2.5 pr-4">{fmtMin(r.avg)}</td>
                    <td className="py-2.5 pr-4 capitalize">{r.topCategory}</td>
                    <td className="py-2.5 pr-4">{r.backlog}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {insights && !insights.empty && insights.departments.length > 0 && (
          <div className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">AI Recommendations & Observations</h3>
            </div>
            <div className="space-y-3">
              {insights.departments.map(d => (
                <div key={d.department} className="rounded-2xl bg-card/80 border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{d.department}</div>
                    <span className="text-xs text-muted-foreground">{d.total} tickets · WoW {d.wowTrendPct}%</span>
                  </div>
                  <p className="text-sm italic text-muted-foreground">"{d.insight || "Insufficient activity for AI recommendation."}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground text-center pt-4 print:block">
          Aurora Operations · Confidential · Distribution restricted to authorised personnel.
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          aside, nav, header.print\\:hidden { display: none !important; }
          .glass { background: white !important; border: 1px solid #e5e7eb !important; box-shadow: none !important; }
          #report-print { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

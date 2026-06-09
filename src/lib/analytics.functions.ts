import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Dept = "IT" | "HR" | "Finance";
const DEPTS: Dept[] = ["IT", "HR", "Finance"];

interface DeptStats {
  department: Dept;
  total: number;
  resolved: number;
  open: number;
  avgResponseMinutes: number | null;
  topRequest: string;
  wowTrendPct: number;
}

function summarizeDept(tickets: any[], dept: Dept): DeptStats {
  const deptTickets = tickets.filter(t => t.department === dept);
  const resolved = deptTickets.filter(t => t.status === "resolved");
  const open = deptTickets.filter(t => t.status !== "resolved");

  // avg response time = resolved_at - created_at (proxy when no first-response timestamp)
  const responses = resolved
    .map(t => t.resolved_at && t.created_at
      ? (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000
      : null)
    .filter((n): n is number => n !== null && n >= 0);
  const avg = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null;

  // Top request: most common first 4 words of title
  const titleCounts: Record<string, number> = {};
  for (const t of deptTickets) {
    const key = String(t.title || "").toLowerCase().split(/\s+/).slice(0, 3).join(" ");
    if (key) titleCounts[key] = (titleCounts[key] || 0) + 1;
  }
  const topRequest = Object.entries(titleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // WoW trend
  const now = Date.now();
  const wk = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = deptTickets.filter(t => now - new Date(t.created_at).getTime() <= wk).length;
  const prevWeek = deptTickets.filter(t => {
    const d = now - new Date(t.created_at).getTime();
    return d > wk && d <= 2 * wk;
  }).length;
  const wow = prevWeek === 0 ? (thisWeek > 0 ? 100 : 0) : ((thisWeek - prevWeek) / prevWeek) * 100;

  return {
    department: dept,
    total: deptTickets.length,
    resolved: resolved.length,
    open: open.length,
    avgResponseMinutes: avg,
    topRequest,
    wowTrendPct: Math.round(wow),
  };
}

async function aiInsight(prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an enterprise operations analyst. Produce concise, executive-friendly weekly summaries (2-4 sentences) with one clear recommendation. No markdown, no bullet points." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return String(data?.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    return "";
  }
}

export const getWeeklyInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ scope: z.enum(["all", "department"]).default("all") }).parse(i))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: tickets, error } = await supabase.from("tickets").select("*");
    if (error) throw new Error(error.message);
    const list = tickets ?? [];

    if (list.length === 0) {
      return { empty: true as const, departments: [], enterprise: null };
    }

    const perDept = DEPTS.map(d => summarizeDept(list, d));

    const departments = await Promise.all(perDept.map(async s => {
      const prompt = `Department: ${s.department}\nTotal tickets: ${s.total}\nResolved: ${s.resolved}\nOpen: ${s.open}\nAverage response time: ${s.avgResponseMinutes ? Math.round(s.avgResponseMinutes) + " minutes" : "n/a"}\nMost common request: ${s.topRequest}\nWeek-over-week change: ${s.wowTrendPct}%\n\nWrite an Operational Observation (1-2 sentences) and an AI Recommendation (1 sentence).`;
      const insight = await aiInsight(prompt);
      return { ...s, insight };
    }));

    const totals = {
      total: list.length,
      open: list.filter(t => t.status !== "resolved").length,
      closed: list.filter(t => t.status === "resolved").length,
      topDept: [...perDept].sort((a, b) => b.total - a.total)[0]?.department ?? "—",
      avgResponseMinutes: (() => {
        const all = perDept.map(p => p.avgResponseMinutes).filter((n): n is number => n !== null);
        return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
      })(),
    };

    const now = Date.now();
    const wk = 7 * 24 * 60 * 60 * 1000;
    const tw = list.filter(t => now - new Date(t.created_at).getTime() <= wk).length;
    const pw = list.filter(t => {
      const d = now - new Date(t.created_at).getTime();
      return d > wk && d <= 2 * wk;
    }).length;
    const wow = pw === 0 ? (tw > 0 ? 100 : 0) : Math.round(((tw - pw) / pw) * 100);

    const enterprisePrompt = `Organisation weekly briefing.\nTotal tickets: ${totals.total}\nOpen: ${totals.open}\nClosed: ${totals.closed}\nHighest volume department: ${totals.topDept}\nOverall average response time: ${totals.avgResponseMinutes ? totals.avgResponseMinutes + " minutes" : "n/a"}\nWeek-over-week change in ticket volume: ${wow}%\nPer-department snapshot: ${perDept.map(p => `${p.department} ${p.total} tickets (most common: ${p.topRequest})`).join("; ")}\n\nWrite an executive operational briefing (3-4 sentences) including one strategic recommendation.`;
    const enterpriseInsight = await aiInsight(enterprisePrompt);

    return {
      empty: false as const,
      departments,
      enterprise: { ...totals, wowTrendPct: wow, insight: enterpriseInsight },
    };
  });

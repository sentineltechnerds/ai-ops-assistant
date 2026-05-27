import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { listAllTickets, listMyTickets } from "@/lib/tickets.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "Ticket History — Aurora" }] }),
  component: Tickets,
});

function Tickets() {
  const { role } = useAuth();
  const fn = useServerFn(role === "admin" ? listAllTickets : listMyTickets);
  const { data } = useQuery({ queryKey: ["tickets-history", role], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [pri, setPri] = useState("all");
  const [stat, setStat] = useState("all");

  const tickets = (data?.tickets ?? []).filter(t =>
    (q === "" || t.title.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase())) &&
    (cat === "all" || t.predicted_category === cat) &&
    (pri === "all" || t.priority === pri) &&
    (stat === "all" || t.status === stat)
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Ticket history</h1>
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tickets…" className="w-full rounded-xl bg-card border border-border pl-10 pr-4 py-2.5 text-sm" />
        </div>
        {[
          { v: cat, setV: setCat, opts: ["all", "HR", "IT", "Finance", "Operations"] },
          { v: pri, setV: setPri, opts: ["all", "low", "medium", "high", "critical"] },
          { v: stat, setV: setStat, opts: ["all", "new", "in_progress", "escalated", "resolved"] },
        ].map((f, i) => (
          <select key={i} value={f.v} onChange={e => f.setV(e.target.value)} className="rounded-xl bg-card border border-border px-3 py-2.5 text-sm capitalize">
            {f.opts.map(o => <option key={o} value={o}>{o === "all" ? "All" : o.replace("_", " ")}</option>)}
          </select>
        ))}
      </div>
      <div className="glass rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Category</th><th className="text-left p-3">Priority</th><th className="text-left p-3">Status</th><th className="text-left p-3">Created</th></tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No tickets match.</td></tr> :
            tickets.map(t => (
              <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-md">{t.description}</div>
                </td>
                <td className="p-3"><span className="text-xs px-2 py-1 rounded-full bg-secondary">{t.predicted_category}</span></td>
                <td className="p-3 uppercase text-xs font-semibold">{t.priority}</td>
                <td className="p-3 capitalize text-xs">{t.status.replace("_", " ")}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

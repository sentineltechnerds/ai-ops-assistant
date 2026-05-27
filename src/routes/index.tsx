import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Brain, Workflow, ShieldCheck, BarChart3, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurora — AI Business Operations Assistant" },
      { name: "description", content: "Intelligently classify, prioritize, and route internal business requests through AI-powered operational workflows." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-xl transition">Sign in</Link>
          <Link to="/login" className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-xl hover:bg-foreground/90 transition">Get started</Link>
        </nav>
      </header>

      <main className="container mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              AI operations engine — live
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              The intelligent <span className="gradient-text">command center</span> for internal operations.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Aurora classifies, prioritizes, and routes every employee request automatically — so your operations team focuses on resolution, not triage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="group inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-2xl px-6 py-3.5 text-sm font-semibold shadow-glow hover:scale-[1.02] transition-transform">
                Submit a request <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 glass rounded-2xl px-6 py-3.5 text-sm font-semibold hover:bg-card transition">
                View Dashboard
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Gemini-powered triage</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Real-time routing</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Enterprise SSO</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="absolute -inset-8 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <div className="relative glass rounded-3xl p-6 shadow-glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Live Operations Stream</div>
                <span className="text-xs text-muted-foreground">Now</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: AlertTriangle, color: "text-critical", label: "Finance server offline", cat: "Finance · Critical", pulse: true },
                  { icon: Zap, color: "text-warning", label: "VPN connection failing", cat: "IT · High" },
                  { icon: Brain, color: "text-primary", label: "Onboarding documentation", cat: "HR · Medium" },
                  { icon: Workflow, color: "text-accent-foreground", label: "Boardroom projector", cat: "Operations · Medium" },
                ].map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className={`flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur p-3 border border-border/60 ${r.pulse ? "pulse-glow" : ""}`}>
                    <div className={`h-9 w-9 rounded-xl bg-secondary flex items-center justify-center ${r.color}`}>
                      <r.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">{r.cat}</div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Routed</span>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { v: "98.4%", l: "Accuracy" },
                  { v: "1.2s", l: "Avg triage" },
                  { v: "4", l: "Queues" },
                ].map(s => (
                  <div key={s.l} className="rounded-2xl bg-secondary/60 p-3 text-center">
                    <div className="text-lg font-bold gradient-text">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 shadow-glow float">
              <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI confidence</div>
              <div className="mt-2 text-2xl font-bold">94<span className="text-sm text-muted-foreground">%</span></div>
            </motion.div>
          </motion.div>
        </div>

        <section className="mt-32 grid md:grid-cols-3 gap-5">
          {[
            { icon: Brain, title: "AI classification", desc: "Gemini analyzes intent, department, and urgency in real time." },
            { icon: Workflow, title: "Smart routing", desc: "Tickets flow to HR, IT, Finance, or Facilities queues automatically." },
            { icon: BarChart3, title: "Operational visibility", desc: "Command-center analytics with priority queues and trend insights." },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass rounded-3xl p-7 hover:shadow-glow transition-shadow">
              <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-24 glass rounded-3xl p-10 md:p-14 text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
          <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold tracking-tight">Built for serious operations teams.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Role-based access, audit-ready ticket history, and graceful fallback when AI services are unavailable.</p>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-2xl px-7 py-3.5 text-sm font-semibold shadow-glow">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <Logo />
          <span>© {new Date().getFullYear()} Aurora Operations · Powered by AI</span>
        </div>
      </footer>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Aurora" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Analytics</h1>
      <p className="text-sm text-muted-foreground">Detailed analytics live on the main dashboard. <Link to="/dashboard" className="text-primary font-medium">Open dashboard →</Link></p>
    </div>
  ),
});

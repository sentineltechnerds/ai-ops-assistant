import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({ meta: [{ title: "Priority Queue — Aurora" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Priority Queue</h1>
      <p className="text-sm text-muted-foreground">The live priority queue is on the dashboard. <Link to="/dashboard" className="text-primary font-medium">Open dashboard →</Link></p>
    </div>
  ),
});

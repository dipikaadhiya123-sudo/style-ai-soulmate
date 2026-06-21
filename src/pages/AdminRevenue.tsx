import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

export default function AdminRevenue() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Revenue Analytics</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">This dashboard will show revenue trends, active subscribers, and monthly recurring revenue once payment data is available.</p>
      </div>
      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
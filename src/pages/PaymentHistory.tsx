import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";

export default function PaymentHistory() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <Receipt className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Payment History</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">View your past payments and download invoices.</p>
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No payments yet. Upgrade to a paid plan to get started.</p>
      </div>
      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
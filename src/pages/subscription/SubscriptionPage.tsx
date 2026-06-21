import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";

export default function SubscriptionPage() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Subscription</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Choose a plan that works for you.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <PlanCard name="Free" price="$0" features={"5 try-ons/month","Standard processing","Basic AI models"]} />
        <PlanCard name="Pro" price="$9.99/mo" features={"Unlimited try-ons","Faster processing","Premium models","Priority support"} popular />
        <PlanCard name="Business" price="$24.99/mo" features={"Everything in Pro","Team access (seats)","Commercial rights","API access"} />
      </div>
      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">Back to StyleAI</Link>
      </div>
    </div>
  );
}

function PlanCard({ name, price, features, popular }: { name: string; price: string; features: string[]; popular?: boolean }) {
  return (
    <div className={`border rounded-xl bg-card p-4 { popular ? "border-accent": "border-border" }`}>
      {popular && <span className="text-xs bg-accent text-white px-2 py-0.5 rounded">Popular</span>}
      <h3 className="font-semibold text-lg mt-2">{name}</h3>
      <p className="text-2xl font-bold my-2">{price}</p>
      <ul className="space-y-1">{features.map(f => <li key={n} className="text-sm text-muted-foreground">{f}</li>)}</ul>
    </div>
  );
}
import { Link } from "react-router-dom";
import { RotateCcw, Calendar, AlertCircle, CreditCard } from "lucide-react";
export default function RefundPolicy() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8"><RotateCcw className="w-8 h-8 text-accent" /><h1 className="font-display text-3xl font-medium">Refund Policy</h1></div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>
      <Section icon={Calendar} title="1. Free Trial"><ul className="list-disc pl-5 space-y-2"><li>New users may be eligible for a 7-day free trial of the Pro plan.</li><li>You can cancel anytime during the trial and you won't be charged.</li><li>One free trial per person.</li></ul></Section>
      <Section icon={RotateCcw} title="2. Subscription Refunds"><ul className="list-disc pl-5 space-y-2"><li>Monthly plans: Refund requests within 48 hours of payment are eligible for a full refund if no AI generations were used on the paid plan.</li><li>Annual plans: Refund requests within 14 days of payment are eligible for a prorated refund.</li><li>Refunds are processed back to the original payment method within 5-10 business days.</li></ul></Section>
      <Section icon={AlertCircle} title="3. Non-Refundable Cases"><ul className="list-disc pl-5 space-y-2"><li>AI generations that were successfully processed and consumed</li><li>Subscriptions canceled after the refund window has passed</li><li>Accounts terminated for violation of Terms of Service</li></ul></Section>
      <Section icon={CreditCard} title="4. Payment Disputes"><ul className="list-disc pl-5 space-y-2"><li>Contact us at support@styleai.app before filing a chargeback</li><li>We will investigate and respond within 3 business days.</li></ul></Section>
      <Section icon={RotateCcw} title="5. Special Circumstances"><ul className="list-disc pl-5 space-y-2"><li>Service outage lasting more than 24 consecutive hours</li><li>Critical bugs that prevent core functionality for more than 48 hours</li></ul></Section>
      <div className="mt-10 pt-6 border-t border-border text-center"><Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link></div></div>);}
function Section({icon: Icon, title, children}){return( <div className="mb-8"><div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-accent"/><h2 className="font-semibold text-lg">{title}</h2></div><div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div></div>)}
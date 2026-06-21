import { Link } from "react-router-dom";
import { Mail, MessageSquare } from "lucide-react";

export default function ContactUs() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Contact Us</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">We are here to help. Choose the best way to reach us.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
    <Card icon={Mail} title="General Support" email="support@styleai.app" desc="Account help, billing, features. 24h response."/>
    <Card icon={Mail} title="Privacy & Data" email="privacy@styleai.app" desc="Data deletion, consent questions. 48h response."/>
    <Card icon={Mail} title="Report Abuse" email="abuse@styleai.app" desc="Policy violations, abusive behavior."/>
    <Card icon={Mail} title="Appeals" email="appeals@styleai.app" desc="Content removal account action appeals."/>
    <Card icon={Mail} title="Copyright/DMCA" email="copyright@styleai.app" desc="DMCA takedowns, copyright claims."/>
    <Card icon={Mail} title="Press" email="hello@styleai.app" desc="Partnerships, press inquiries."/>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-4">
        <h2 className="font-semibold text-lg mb-2">First Officer (India)</h2>
        <p className="text-sm">GrievanceOfficer@styleai.app – Mumbai, Maharashtra, India</p>
      </div>

      <div className="center pt-6 border-t">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, email, desc }: { icon: any; title: string; email: string; desc: string }) {
  return (
    <a href={mailto:email} className="rounded-xl border border-border bg-card p-4 hover:border-accent/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-xs text-accent font-mono">{email}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{desc}</p>
    </a>
  );
}
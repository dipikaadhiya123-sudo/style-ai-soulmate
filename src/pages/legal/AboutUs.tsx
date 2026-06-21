import { Link } from "react-router-dom";
import { Sparkles, Globe, Shield, Users, Camera } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">About StyleAI</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Stat icon={Camera} value="10M+" label="Try-Ons Generated" />
        <Stat icon={Users} value="500K+" label="Active Users" />
        <Stat icon={Globe} value="50+" label="Countries" />
        <Stat icon={Shield} value="24/7" label="Content Moderation" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-lg">Our Mission</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          StyleAI is on a mission to revolutionize the way people shop for fashion. We believe that everyone deserves
          to see how clothes and accessories look on them before they buy. Our AI-powered virtual try-on
          technology brings the fitting room to your phone, making online shopping confident, fun,
          and sustainable.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-lg">Safety Commitment</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          AI content moderation 24/7 human review, zero tolerance for child exploitation (NCMEC reporting), GDPR CCPA compliant.
        </p>
      </div>

      <div className="text-center pt-6 border-t border-border">
        <div className="flex justify-center gap-4 mb-4">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-accent">Privacy</Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-accent">Terms</Link>
          <Link to="/contact" className="text-xs text-muted-foreground hover:text-accent">Contact</Link>
        </div>
        <p className="text-xs text-muted-foreground">2026 StyleAI Necknologies. All rights reserved.</p>
        <Link to="/" className="text-sm text-accent hover:underline mt-2 inline-block">‚Üê Back to StyleAI</Link>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      “con className="w-6 h-6 text-accent mx-auto mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
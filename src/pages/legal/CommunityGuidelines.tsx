import { Link } from "react-router-dom";
import { Users, Shield } from "lucide-react";

export default function CommunityGuidelines() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Community Guidelines</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">1. Core Principles</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li><strong>Respect Others:</strong> Do not use StyleAI to harass, bully, or impersonate others.</li>
          <li><strong>Protect Privacy:</strong> Only upload photos of yourself or people who have given explicit consent.</li>
          <li><strong>Be Authentic:</strong> Do not create fake accounts or impersonate others.</li>
          <li><strong>Create Responsibly:</strong> Follow our Content Moderation Policy.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">2. Prohibited Content</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No explicit or adult content, violence or gore, child exploitation (zero tolerance),
          hate speech, harassment, illegal activities, misinformation, copyright infringement,
          or spam/scams is strictly prohibited.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">3. Age Restrictions</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You must be at least 13 years old (or the minimum digital consent age in your country) to use StyleAI.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">4. Reporting and Appeals</h2>
        <p className="text-sm text-muted-foreground">
          Email abuse@styleai.app to report violations. Appeals within 30 days to appeals @styleai.app.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
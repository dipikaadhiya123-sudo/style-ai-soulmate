import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Terms of Service</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">By using StyleAI, you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">2. User Accounts</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>You must be at least 13 years old to use the Service.</li>
          <li>You are responsible for maintaining your account credentials.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">3. User Content & Ownership</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You retain full ownership of all photos and content you upload. We do NOT use your content to train AI models without explicit consent. Unsaved content is automatically deleted after 24 hours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">4. Prohibited Uses</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">No illegal, explicit, or harmful content. No uploading photos without consent. No reverse-engineering, scraping, or hacking. No spam, scams, or automated bots.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">5. Subscriptions & Payments</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">Free: 5 try-ons/month. Pro &amp; Business plans billed via Stripe or Razorpay. Cancel anytime; access continues till billing period end. Refunds per Refund Policy.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">6. Intellectual Property</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">StyleAI, logo, and UI design are owned by StyleAI. Business plan includes commercial rights. Free Pro plan: personal use only.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">7. AI Disclaimer</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">The Service is provided "AQ IS" without warranty. AI-generated results are visual approximations and may differ from actual products.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">8. Account Termination</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">You may delete account anytime from Profile. We may terminate accounts for violations with no refund.</p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">9. Dispute Resolution</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">Governed by laws of India. Disputes resolved in courts of Mumbai, Maharashtra. Contact legal@styleai.app for questions.</p>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
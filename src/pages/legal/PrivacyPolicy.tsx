import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-accent" />
        <h1 className="font-display text-3xl font-medium">Privacy Policy</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">1. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect email address and authentication data when you sign up. Photos you upload are temporarily stored
          to process AI generation. Payment information is processed by Stripe and Razorpay. We do NOT store credit card numbers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">2. Data Storage and Security</h2>
        <p className="text-sm text-muted-foreground">
          All data is transmitted via HTTPS/TLS. Row Level Security (RLS) ensures only you can access your photos.
          Storage is encrypted at rest using AES-256.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">3. Data Retention</h2>
        <p className="text-sm text-muted-foreground">
          Unsaved photos and results are automatically deleted after 24 hours. Saved content is retained until you delete it.
          Deleted accounts have all data permanently removed within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">4. Your Rights (GDPR, CCPA)</h2>
        <p className="text-sm text-muted-foreground">
          You have the right to access, delete, and port your data. AI training consent is opt-in only.
          We do not sell your personal information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">5. Childrens Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Not intended for children under 13. If you bfieve a child has provided personal data, contact us for deletion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">6. AI Disclaimer</h2>
        <p className="text-sm text-muted-foreground">
          AI try-on results are visual approximations. We do NOT use your photos to train AI models without your explicit opt-in consent.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
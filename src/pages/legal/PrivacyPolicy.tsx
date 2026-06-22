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
          Email, authentication data, photos for try-on processing, payment info via Stripe/Razorpay.
          We do NOT store credit card numbers. AI usage tracking for plan limits only.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">2. Data Storage &amp; Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          HTTPS/TLS encryption, Row Level Security (RLS), AES-256 encryption at rest, rate limiting.
          Only you can access your photos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">3. Data Retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Unsaved photos and AI results deleted after 24 hours. Saved content retained until you delete.
          Deleted accounts have all data permanently removed within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">4. Your Rights (GDPR, CCPA, App Stores)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Access, delete, port your data. AI training consent is opt-in only. We do NOT sell your data.
          Google Play and Apple App Store compliant. Response to requests within 48 hours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">5. Childrens Privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Not intended for children under 13 (or minimum digital consent age in your country).
          If you believe a child has provided personal data, contact us for deletion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">6. AI Generated Content Disclaimer</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          AI-generated results are visual approximations. Colors, textures, and fit may vary from actual products.
          We do NOT use your photos to train AI models without your explicit opt-in consent.
          AI processing is performed on secure servers; images are not retained by third-party providers beyond the session.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">7. Third-Party Services</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Supabase (database, storage), Stripe and Razorpay (payments), fal.ai and Google Gemini (AI models),
          Google OAuth (sign-in). Each has its own privacy policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">8. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Email: privacy@styleai.app. Response within 48 hours. We may update this policy; significant changes will be communicated.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <Link to="/" className="text-sm text-accent hover:underline">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";
import { Sparkles, Globe, Shield, Users, Camera } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="container max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-8 h-8 text-accent"/>
        <h1 className="font-display text-3xl font-medium">About StyleAI</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="font-semibold text-lg mb-3">Our Mission</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          StyleAI is on a mission to revolutionize the way people shop for fashion. Our AI-powered
          virtual try-on technology brings the fitting room to your phone, making online shopping confident,
          fun, and sustainable. Based in Mumbai, India, we serve users worldwide with localized payments
          (UPI, Razorpay for India; Stripe for international), and AI models optimized for diverse skin tones and
          body types.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="font-semibold text-lg mb-3">Our Technology</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Powered by fal.ai FASHN and Google Gemini, our AI engine analyzes your photo and the product to create
          photorealistic virtual try-on visualizations. The AI preserves your identity, skin tone, and body
          proportions while accurately rendering the garment on you.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="font-semibold text-lg mb-3">Safety Commitment</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          AI-powered content moderation screens all uploads. 24/7 human moderation team reviews flagged content.
          Zero-tolerance policy for CSAM with immediate ncmec reporting. GDPR and CCPA compliant data handling.
        </p>
      </div>

      <div className="mt-10 pt-6 border-t border-border text-center">
        <div className="flex justify-center gap-4 mb-4">
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-accent">Privacy</Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-accent">Terms</Link>
          <Link to="/contact" className="text-xs text-muted-foreground hover:text-accent">Contact</Link>
        </div>
        <p className="text-xs text-muted-foreground">2026 StyleAI Technologies. All rights reserved.</p>
        <Link to="/" className="text-sm text-accent hover:underline mt-2 inline-block">← Back to StyleAI</Link>
      </div>
    </div>
  );
}
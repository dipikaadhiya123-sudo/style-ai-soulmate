import { Link } from "react-router-dom";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Camera, MessageSquare, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "@/assets/hero.jpg";

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/stylist", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <span className="inline-block w-7 h-7 rounded-md bg-gradient-accent" />
          StyleAI
        </div>
        <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
      </header>

      <section className="container pt-8 pb-20 md:pt-20 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="space-y-7"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> AI-powered styling
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-medium leading-[0.95] tracking-tight text-balance">
            Your personal <em className="text-accent not-italic">stylist</em>, in your pocket.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md text-pretty">
            Upload a photo, pick the occasion, and get a curated outfit, style score, and looks
            tailored to your body, skin tone, and taste — in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-accent text-accent-foreground border-0 shadow-glow hover:opacity-95">
                Get started <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">I already have an account</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="relative"
        >
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-elev">
            <img
              src={heroImg}
              alt="Editorial fashion portrait — woman in warm earth-tone outfit"
              width={1280}
              height={1600}
              className="w-full h-full object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-5 -left-5 md:-left-10 bg-card border border-border rounded-xl p-4 shadow-elev w-56"
          >
            <div className="text-xs text-muted-foreground">Style score</div>
            <div className="font-display text-3xl font-semibold">9.2 <span className="text-base text-muted-foreground">/ 10</span></div>
            <div className="text-xs text-muted-foreground mt-1">Color harmony · Fit · Occasion</div>
          </motion.div>
        </motion.div>
      </section>

      <section className="container pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Wand2, t: "Virtual try-on", d: "Upload your photo and any product — paste a link or upload an image. See it on you in seconds." },
            { icon: Camera, t: "Photo studio", d: "Upload your face and full-body photos. We'll analyze skin tone, hair, and proportions." },
            { icon: Sparkles, t: "Curated outfits", d: "Get a head-to-toe look for any occasion — from beach wedding to office Monday." },
            { icon: MessageSquare, t: "Stylist chat", d: "Ask anything: 'Does navy suit my skin tone?' Get instant, context-aware answers." },
          ].map(({ icon: Icon, t, d }, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-medium mb-1.5">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="container py-10 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <span className="inline-block w-6 h-6 rounded-md bg-gradient-accent" />
              StyleAI
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">Your personal AI stylist — try on, style, and shop with confidence.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/refunds" className="hover:text-foreground transition-colors">Refunds</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link to="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
            <Link to="/copyright" className="hover:text-foreground transition-colors">Copyright</Link>
          </div>
        </div>
        <div className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} StyleAI. All rights reserved.</div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, BookmarkPlus, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const OCCASIONS = [
  { id: "casual", label: "Casual", emoji: "☕" },
  { id: "office", label: "Office", emoji: "💼" },
  { id: "party", label: "Party", emoji: "✨" },
  { id: "wedding", label: "Wedding", emoji: "💍" },
  { id: "date", label: "Date", emoji: "🌹" },
  { id: "kids", label: "Kids", emoji: "🎈" },
];

type Outfit = {
  id: string;
  title: string;
  items: { category: string; description: string; color: string }[];
  style_score: number;
  score_breakdown: { fit: number; color_harmony: number; occasion_match: number };
  rationale: string;
  suggestions: { category: string; tip: string }[];
  share_slug: string;
  saved: boolean;
};

export default function Stylist() {
  const { user } = useAuth();
  const [occasion, setOccasion] = useState("casual");
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setLoading(true);
    setOutfit(null);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-outfit", { body: { occasion } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutfit(data.outfit);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't generate outfit");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!outfit || !user) return;
    setSaving(true);
    const { error } = await supabase.from("outfits").update({ saved: true }).eq("id", outfit.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setOutfit({ ...outfit, saved: true });
      toast.success("Saved to your lookbook");
    }
  };

  const share = async () => {
    if (!outfit) return;
    const url = `${window.location.origin}/outfit/${outfit.share_slug}`;
    if (!outfit.saved) await save();
    try {
      if (navigator.share) await navigator.share({ title: outfit.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  return (
    <div className="container max-w-5xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">AI Stylist</h1>
        <p className="text-muted-foreground mb-8">Pick the occasion. We'll style you head to toe.</p>
      </motion.div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {OCCASIONS.map(o => (
          <button
            key={o.id}
            onClick={() => setOccasion(o.id)}
            className={cn(
              "p-4 rounded-xl border text-center transition-all",
              occasion === o.id
                ? "border-accent bg-accent/5 shadow-glow"
                : "border-border bg-card hover:border-foreground/30",
            )}
          >
            <div className="text-2xl mb-1">{o.emoji}</div>
            <div className="text-sm font-medium">{o.label}</div>
          </button>
        ))}
      </div>

      <Button
        onClick={generate}
        disabled={loading}
        size="lg"
        className="w-full md:w-auto bg-gradient-accent text-accent-foreground border-0 shadow-glow hover:opacity-95"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Styling you...</> : <><Sparkles className="w-4 h-4" /> Generate outfit</>}
      </Button>

      <AnimatePresence>
        {outfit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-10 grid lg:grid-cols-3 gap-6"
          >
            {/* Score card */}
            <div className="lg:col-span-1 bg-gradient-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Style score</div>
              <div className="font-display text-6xl font-medium leading-none mb-1">
                {outfit.style_score.toFixed(1)}
                <span className="text-2xl text-muted-foreground"> / 10</span>
              </div>
              <div className="space-y-2.5 mt-6">
                {Object.entries(outfit.score_breakdown).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">{v.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-accent" style={{ width: `${v * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={save} disabled={saving || outfit.saved} variant="outline" className="flex-1">
                  {outfit.saved ? <><Check className="w-4 h-4" /> Saved</> : <><BookmarkPlus className="w-4 h-4" /> Save</>}
                </Button>
                <Button onClick={share} variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </div>

            {/* Outfit details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft">
                <h2 className="font-display text-2xl font-medium mb-1">{outfit.title}</h2>
                <p className="text-sm text-muted-foreground mb-5">{outfit.rationale}</p>
                <div className="space-y-3">
                  {outfit.items.map((it, i) => (
                    <div key={i} className="flex gap-4 items-start py-3 border-t border-border/60 first:border-t-0 first:pt-0">
                      <div
                        className="w-10 h-10 rounded-lg border border-border shrink-0"
                        style={{ background: it.color }}
                        title={it.color}
                      />
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.category}</div>
                        <div className="font-medium">{it.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {outfit.suggestions?.length > 0 && (
                <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft">
                  <h3 className="font-display text-xl font-medium mb-4">Bonus tips</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {outfit.suggestions.map((s, i) => (
                      <div key={i} className="p-4 rounded-xl bg-background/50 border border-border">
                        <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">{s.category}</div>
                        <div className="text-sm">{s.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/chat" className="text-sm text-accent hover:underline">Want to refine this look? Chat with the stylist →</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

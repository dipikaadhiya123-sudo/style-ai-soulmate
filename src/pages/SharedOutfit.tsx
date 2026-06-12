import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SharedOutfitData = {
  occasion: string;
  title: string | null;
  items: { category: string; description: string; color: string }[];
  style_score: number | null;
  rationale: string | null;
  suggestions: { category: string; tip: string }[] | null;
};

export default function SharedOutfit() {
  const { slug } = useParams();
  const [outfit, setOutfit] = useState<SharedOutfitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.functions.invoke("get-shared", {
        body: { kind: "outfit", slug },
      });
      setOutfit((data?.outfit as SharedOutfitData | null) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>;

  if (!outfit) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl mb-2">Outfit not found</h1>
          <p className="text-muted-foreground mb-6">This look isn't available.</p>
          <Link to="/"><Button>Try StyleAI</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="inline-block w-7 h-7 rounded-md bg-gradient-accent" /> StyleAI
        </Link>
        <Link to="/auth"><Button variant="outline" size="sm">Try it</Button></Link>
      </header>

      <main className="container max-w-3xl py-10">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{outfit.occasion}</div>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-3">{outfit.title}</h1>
        <div className="flex items-baseline gap-2 mb-8">
          <span className="font-display text-3xl font-medium">{Number(outfit.style_score).toFixed(1)}</span>
          <span className="text-muted-foreground">/ 10 style score</span>
        </div>

        <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft mb-6">
          <p className="text-pretty mb-5">{outfit.rationale}</p>
          <div className="space-y-3">
            {outfit.items.map((it, i) => (
              <div key={i} className="flex gap-4 items-start py-3 border-t border-border/60 first:border-t-0 first:pt-0">
                <div className="w-10 h-10 rounded-lg border border-border shrink-0" style={{ background: it.color }} />
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
            <h2 className="font-display text-xl font-medium mb-4">Bonus tips</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {outfit.suggestions.map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">{s.category}</div>
                  <div className="text-sm">{s.tip}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-sm text-muted-foreground">
          Styled with <Link to="/" className="text-accent font-medium hover:underline">StyleAI</Link>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ShoppingBag, ExternalLink, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BeforeAfter from "@/components/BeforeAfter";

type ShopResult = {
  primary_query: string;
  retailers: { name: string; url: string }[];
  candidates: {
    title: string; category?: string; color?: string;
    features?: string[]; price_range_usd?: string;
    keywords?: string[]; confidence?: number;
    retailers: { name: string; url: string }[];
  }[];
};

export default function SharedLook() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [look, setLook] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [shopLoading, setShopLoading] = useState(false);
  const [shop, setShop] = useState<ShopResult | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("looks")
        .select("photo_path, item_label, category, description, highlights, result_image_path")
        .eq("share_slug", slug)
        .eq("saved", true)
        .maybeSingle();
      if (data) {
        setLook(data);
        const { data: signed } = await supabase.storage
          .from("tryon-photos")
          .createSignedUrl(data.photo_path, 3600);
        setPhotoUrl(signed?.signedUrl ?? null);
        if (data.result_image_path) {
          const { data: r } = await supabase.storage
            .from("tryon-results")
            .createSignedUrl(data.result_image_path, 3600);
          setResultUrl(r?.signedUrl ?? null);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const runShop = async (target: string, category?: string) => {
    setShopLoading(true);
    setShop(null);
    try {
      const { data, error } = await supabase.functions.invoke("reverse-search", {
        body: { imageUrl: target, category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setShop(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't find retailers");
    } finally {
      setShopLoading(false);
    }
  };

  // Auto-run when ?shop=1 is in the URL
  useEffect(() => {
    if (params.get("shop") !== "1") return;
    const target = resultUrl || photoUrl;
    if (!target || shopLoading || shop) return;
    runShop(target, look?.category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, resultUrl, photoUrl, look]);

  const shareWithShop = async () => {
    const url = `${window.location.origin}/look/${slug}?shop=1`;
    if (navigator.share) {
      try { await navigator.share({ title: look?.item_label ?? "My try-on", url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Shop link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!look || !photoUrl) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl mb-2">Look not found</h1>
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

      <main className="container max-w-2xl py-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{look.category}</div>
        <h1 className="font-display text-3xl md:text-4xl font-medium mb-6">{look.item_label}</h1>

        <BeforeAfter beforeUrl={photoUrl} afterUrl={resultUrl} description={look.description} itemLabel={look.item_label} />

        <div className="flex flex-wrap gap-2 mt-5">
          <Button
            onClick={() => {
              const target = resultUrl || photoUrl;
              if (target) {
                runShop(target, look.category);
                setParams({ shop: "1" }, { replace: true });
              }
            }}
            disabled={shopLoading}
            className="bg-gradient-accent text-accent-foreground border-0"
          >
            {shopLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding retailers...</>
              : <><ShoppingBag className="w-4 h-4" /> Shop this look</>}
          </Button>
          <Button onClick={shareWithShop} variant="outline">
            <Share2 className="w-4 h-4" /> Share with shop
          </Button>
        </div>

        {look.highlights?.length > 0 && (
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {(look.highlights as any[]).map((h, i) => (
              <div key={i} className="p-4 rounded-xl bg-gradient-card border border-border">
                <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">{h.label}</div>
                <div className="text-sm">{h.detail}</div>
              </div>
            ))}
          </div>
        )}

        {shop && (
          <section className="mt-8 rounded-2xl border border-border bg-gradient-card p-5">
            <div className="text-sm font-medium mb-1">Identified as</div>
            <div className="text-base mb-4 text-muted-foreground">{shop.primary_query}</div>

            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Quick search</div>
            <div className="flex flex-wrap gap-2 mb-5">
              {shop.retailers.map(r => (
                <a key={r.name} href={r.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    {r.name} <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              ))}
            </div>

            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Likely matches</div>
            <div className="space-y-3">
              {shop.candidates.map((c, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-medium text-sm">{c.title}</div>
                    {typeof c.confidence === "number" && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                        {Math.round(c.confidence * 100)}% match
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {[c.color, c.category, c.price_range_usd].filter(Boolean).join(" · ")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.retailers.slice(0, 5).map(r => (
                      <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                        className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-foreground/40 hover:bg-secondary/60 transition-colors inline-flex items-center gap-1">
                        {r.name} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              Prices and availability vary — links open the retailer's search for the identified item.
            </p>
          </section>
        )}

        <div className="text-center mt-12 text-sm text-muted-foreground">
          Styled with <Link to="/" className="text-accent font-medium hover:underline">StyleAI</Link>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BeforeAfter from "@/components/BeforeAfter";

export default function SharedLook() {
  const { slug } = useParams();
  const [look, setLook] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        <div className="text-center mt-12 text-sm text-muted-foreground">
          Styled with <Link to="/" className="text-accent font-medium hover:underline">StyleAI</Link>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, Image as ImageIcon, Link2, Sparkles, Shirt, Footprints, Watch,
  X, Upload, Loader2, Save, Share2, Search, Download, ShoppingBag, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfter from "@/components/BeforeAfter";

type Category = "clothes" | "footwear" | "accessories";

const categories: { id: Category; label: string; icon: any }[] = [
  { id: "clothes", label: "Clothes", icon: Shirt },
  { id: "footwear", label: "Footwear", icon: Footprints },
  { id: "accessories", label: "Accessories", icon: Watch },
];

type ProductHit = { id: string; title: string; thumbnail: string; url: string };

export default function TryOn() {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [itemPreview, setItemPreview] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [category, setCategory] = useState<Category>("clothes");
  const [urlInput, setUrlInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ProductHit[]>([]);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const [findingShops, setFindingShops] = useState(false);
  const [shopResult, setShopResult] = useState<null | {
    primary_query: string;
    retailers: { name: string; url: string }[];
    candidates: {
      title: string; category?: string; color?: string;
      features?: string[]; price_range_usd?: string;
      keywords?: string[]; confidence?: number;
      retailers: { name: string; url: string }[];
    }[];
  }>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const onPhoto = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    resetResult();
  };

  const onItemFile = async (file: File) => {
    // Convert to data URL so the edge function can fetch it
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setItemImageUrl(url);
      setItemPreview(url);
      resetResult();
    };
    reader.readAsDataURL(file);
  };

  const loadFromUrl = () => {
    if (!urlInput.trim()) return;
    setItemImageUrl(urlInput.trim());
    setItemPreview(urlInput.trim());
    setUrlInput("");
    resetResult();
  };

  const resetResult = () => {
    setResultUrl(null);
    setResultPath(null);
    setSavedSlug(null);
    setShopResult(null);
  };

  const findWhereToBuy = async () => {
    const target = resultUrl || itemImageUrl;
    if (!target) return toast.error("No image to search");
    setFindingShops(true);
    setShopResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("reverse-search", {
        body: { imageUrl: target, category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setShopResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Reverse search failed");
    } finally {
      setFindingShops(false);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-products", {
        body: { query: searchQuery.trim(), category },
      });
      if (error) throw error;
      setHits(data?.results ?? []);
      if (!data?.results?.length) toast.info("No products found — try different keywords");
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const pickHit = (h: ProductHit) => {
    setItemImageUrl(h.thumbnail);
    setItemPreview(h.thumbnail);
    if (!itemLabel) setItemLabel(h.title.slice(0, 80));
    resetResult();
  };

  const generate = async () => {
    if (!user) return toast.error("Please sign in.");
    if (!photoFile) return toast.error("Add a photo of yourself.");
    if (!itemImageUrl && !itemLabel.trim()) {
      return toast.error("Upload a product image or describe the item.");
    }

    setGenerating(true);
    resetResult();
    try {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/tryon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tryon-photos")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type || "image/jpeg" });
      if (upErr) throw upErr;
      setPhotoPath(path);

      const { data, error } = await supabase.functions.invoke("tryon-generate", {
        body: {
          photoPath: path,
          items: [{
            imageUrl: itemImageUrl ?? undefined,
            label: itemLabel.trim() || undefined,
            // category omitted — backend auto-detects
          }],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultUrl(data.resultUrl);
      setResultPath(data.resultPath);
      // Backfill detected label/category for save metadata
      if (data?.detected?.[0]) {
        if (!itemLabel.trim()) setItemLabel(data.detected[0].label);
        const c = data.detected[0].category;
        if (c === "footwear") setCategory("footwear");
        else if (["bag","necklace","earrings","ring","bracelet","watch","sunglasses","hat","scarf"].includes(c)) setCategory("accessories");
        else setCategory("clothes");

      }
      toast.success(
        data?.detected?.[0]
          ? `Detected: ${data.detected[0].label} (${data.detected[0].category})`
          : "Try-on rendered"
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };


  const save = async () => {
    if (!user || !resultPath || !photoPath) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("looks")
        .insert({
          user_id: user.id,
          photo_path: photoPath,
          item_image_url: itemImageUrl,
          item_label: itemLabel.trim(),
          category,
          description: `AI-rendered ${category}: ${itemLabel.trim()}`,
          highlights: [],
          result_image_path: resultPath,
        })
        .select("share_slug")
        .single();
      if (error) throw error;
      setSavedSlug(data.share_slug);
      toast.success("Saved to your lookbook");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!savedSlug) return;
    const url = `${window.location.origin}/look/${savedSlug}?shop=1`;
    if (navigator.share) {
      try { await navigator.share({ title: itemLabel, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="container max-w-4xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Beta
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">Virtual Try-On</h1>
        <p className="text-muted-foreground mb-8 max-w-xl">
          Upload your photo, pick a product, and we'll render an AI try-on you can compare side by side.
        </p>
      </motion.div>

      {/* Category */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-3">Category</div>
        <div className="grid grid-cols-3 gap-2">
          {categories.map(c => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                  active ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        {/* Your photo */}
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Your photo</div>
            {photoPreview && (
              <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); resetResult(); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PreviewBox url={photoPreview} placeholder="Full-body or portrait" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" onClick={() => photoInput.current?.click()}>
              <ImageIcon className="w-4 h-4" /> Gallery
            </Button>
            <Button variant="outline" onClick={() => cameraInput.current?.click()}>
              <Camera className="w-4 h-4" /> Camera
            </Button>
          </div>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
        </div>

        {/* Item */}
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Item</div>
            {itemPreview && (
              <button onClick={() => { setItemPreview(null); setItemImageUrl(null); resetResult(); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PreviewBox url={itemPreview} placeholder={`Optional ${category.slice(0, -1)} image`} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" onClick={() => itemInput.current?.click()}>
              <Upload className="w-4 h-4" /> Upload
            </Button>
            <div className="flex gap-1">
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste URL" className="h-10" />
              <Button variant="outline" size="icon" onClick={loadFromUrl} aria-label="Load URL">
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Input
            value={itemLabel}
            onChange={e => setItemLabel(e.target.value)}
            placeholder="Describe the item — required"
            className="mt-3"
          />
          <input ref={itemInput} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onItemFile(e.target.files[0])} />
        </div>
      </div>

      {/* Product image search */}
      <div className="rounded-2xl border border-border bg-gradient-card p-4 mb-6">
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Search product images
        </div>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runSearch()}
            placeholder={`e.g. "black leather ankle boots"`}
            className="h-10"
          />
          <Button onClick={runSearch} disabled={searching} variant="outline">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {hits.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
            {hits.map(h => (
              <button
                key={h.id}
                onClick={() => pickHit(h)}
                className={cn(
                  "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  itemImageUrl === h.thumbnail ? "border-accent" : "border-border hover:border-foreground/40",
                )}
                title={h.title}
              >
                <img src={h.thumbnail} alt={h.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={generate}
        disabled={generating}
        size="lg"
        className="w-full md:w-auto bg-gradient-accent text-accent-foreground border-0 mb-10"
      >
        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering...</> : <><Sparkles className="w-4 h-4" /> Try Now</>}
      </Button>

      {resultUrl && photoPreview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-medium mb-4">Before / After</h2>
          <BeforeAfter beforeUrl={photoPreview} afterUrl={resultUrl} itemLabel={itemLabel} />

          <div className="flex flex-wrap gap-2 mt-6">
            {!savedSlug ? (
              <Button onClick={save} disabled={saving} className="bg-gradient-accent text-accent-foreground border-0">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save look</>}
              </Button>
            ) : (
              <Button onClick={share} variant="outline">
                <Share2 className="w-4 h-4" /> Share link
              </Button>
            )}
            <a href={resultUrl} download="tryon.png" target="_blank" rel="noreferrer">
              <Button variant="outline"><Download className="w-4 h-4" /> Download</Button>
            </a>
            <Button onClick={findWhereToBuy} disabled={findingShops} variant="outline">
              {findingShops ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</> : <><ShoppingBag className="w-4 h-4" /> Find where to buy</>}
            </Button>
          </div>

          {shopResult && (
            <div className="mt-6 rounded-2xl border border-border bg-gradient-card p-5">
              <div className="text-sm font-medium mb-1">Identified as</div>
              <div className="text-base mb-4 text-muted-foreground">{shopResult.primary_query}</div>

              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Quick search</div>
              <div className="flex flex-wrap gap-2 mb-5">
                {shopResult.retailers.map(r => (
                  <a key={r.name} href={r.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">{r.name} <ExternalLink className="w-3 h-3" /></Button>
                  </a>
                ))}
              </div>

              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Likely matches</div>
              <div className="space-y-3">
                {shopResult.candidates.map((c, i) => (
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
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function PreviewBox({ url, placeholder }: { url: string | null; placeholder: string }) {
  return (
    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-background/40 border border-border flex items-center justify-center">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="text-center px-6 text-sm text-muted-foreground">{placeholder}</div>}
    </div>
  );
}

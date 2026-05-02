import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, Link2, Sparkles, Shirt, Footprints, Watch, X, Upload, Loader2, Save, Share2 } from "lucide-react";
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

type LookResult = {
  description: string;
  highlights: { label: string; detail: string }[];
};

export default function TryOn() {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImageObjectUrl, setItemImageObjectUrl] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [category, setCategory] = useState<Category>("clothes");
  const [urlInput, setUrlInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [look, setLook] = useState<LookResult | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  const onPhoto = (file: File) => {
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setLook(null);
    setSavedSlug(null);
  };

  const onItemFile = (file: File) => {
    setItemImageFile(file);
    setItemImageObjectUrl(URL.createObjectURL(file));
    setItemImageUrl(null);
    setLook(null);
    setSavedSlug(null);
  };

  const loadFromUrl = () => {
    if (!urlInput.trim()) return;
    setItemImageUrl(urlInput.trim());
    setItemImageObjectUrl(urlInput.trim());
    setItemImageFile(null);
    setUrlInput("");
    setLook(null);
    setSavedSlug(null);
  };

  const generate = async () => {
    if (!user) return toast.error("Please sign in.");
    if (!photoFile) return toast.error("Add a photo of yourself.");
    if (!itemLabel.trim()) return toast.error("Describe the item (e.g. 'black leather ankle boots').");

    setGenerating(true);
    try {
      // Upload photo to private bucket
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/tryon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tryon-photos")
        .upload(path, photoFile, { upsert: true });
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke("describe-look", {
        body: {
          photoPath: path,
          itemLabel: itemLabel.trim(),
          category,
          itemImageUrl: itemImageUrl ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLook({ description: data.description, highlights: data.highlights ?? [] });
      // Stash the path on a hidden field via state
      (window as any).__tryonPath = path;
      toast.success("Look generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!user || !look) return;
    const path = (window as any).__tryonPath;
    if (!path) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("looks")
        .insert({
          user_id: user.id,
          photo_path: path,
          item_image_url: itemImageUrl,
          item_label: itemLabel.trim(),
          category,
          description: look.description,
          highlights: look.highlights,
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
    const url = `${window.location.origin}/look/${savedSlug}`;
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
        <p className="text-muted-foreground mb-10 max-w-xl">
          Upload your photo and an item. We'll describe how the look would come together — no garment rendering, just a visual before/after with the AI's styling read.
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
            {photoUrl && (
              <button onClick={() => { setPhotoUrl(null); setPhotoFile(null); setLook(null); setSavedSlug(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PreviewBox url={photoUrl} placeholder="Full-body or portrait" />
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
            {itemImageObjectUrl && (
              <button onClick={() => { setItemImageObjectUrl(null); setItemImageFile(null); setItemImageUrl(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PreviewBox url={itemImageObjectUrl} placeholder={`Optional ${category.slice(0, -1)} image`} />
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

      <Button
        onClick={generate}
        disabled={generating}
        size="lg"
        className="w-full md:w-auto bg-gradient-accent text-accent-foreground border-0 mb-10"
      >
        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Try Now</>}
      </Button>

      {look && photoUrl && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-medium mb-4">Before / After</h2>
          <BeforeAfter photoUrl={photoUrl} description={look.description} itemLabel={itemLabel} />

          {look.highlights.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              {look.highlights.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-gradient-card border border-border">
                  <div className="text-xs uppercase tracking-wider text-accent font-medium mb-1">{h.label}</div>
                  <div className="text-sm">{h.detail}</div>
                </div>
              ))}
            </div>
          )}

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
          </div>
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

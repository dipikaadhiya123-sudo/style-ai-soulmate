import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ImageIcon, Sparkles, X, Upload, Loader2, Save, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfter from "@/components/BeforeAfter";

export default function TryOn() {
  const { user } = useAuth();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [itemFile, setItemFile] = useState<File | null>(null);
  const [itemDataUrl, setItemDataUrl] = useState<string | null>(null);
  const [itemPreview, setItemPreview] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ label: string; category: string } | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    if (itemPreview?.startsWith("blob:")) URL.revokeObjectURL(itemPreview);
  }, [photoPreview, itemPreview]);

  const resetResult = () => {
    setResultUrl(null);
    setResultPath(null);
    setSavedSlug(null);
    setDetected(null);
  };

  const onPhoto = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    resetResult();
  };

  const onItem = (file: File) => {
    setItemFile(file);
    setItemPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setItemDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    resetResult();
  };

  const generate = async () => {
    if (!user) return toast.error("Please sign in.");
    if (!photoFile) return toast.error("Add your photo.");
    if (!itemDataUrl) return toast.error("Add the product photo.");

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
          items: [{ imageUrl: itemDataUrl }],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultUrl(data.resultUrl);
      setResultPath(data.resultPath);
      if (data?.detected?.[0]) setDetected(data.detected[0]);
      toast.success("Try-on ready");
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
      const cat = detected?.category ?? "clothes";
      const uiCat =
        cat === "footwear" ? "footwear"
        : ["clothes", "outfit"].includes(cat) ? "clothes"
        : "accessories";
      const label = detected?.label ?? "Try-on look";
      const { data, error } = await supabase
        .from("looks")
        .insert({
          user_id: user.id,
          photo_path: photoPath,
          item_image_url: null,
          item_label: label,
          category: uiCat,
          description: `AI-rendered ${cat}: ${label}`,
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
    const url = `${window.location.origin}/look/${savedSlug}`;
    if (navigator.share) {
      try { await navigator.share({ title: detected?.label ?? "My try-on", url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const canGenerate = !!photoFile && !!itemDataUrl && !generating;

  return (
    <div className="container max-w-3xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Virtual Try-On
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">
          Try it on in one tap
        </h1>
        <p className="text-muted-foreground mb-8 max-w-xl">
          Upload your photo and the product photo. We'll do the rest.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-6">
        <UploadTile
          label="Your photo"
          preview={photoPreview}
          placeholder="Tap to add"
          onClear={() => { setPhotoFile(null); setPhotoPreview(null); resetResult(); }}
          onPick={() => photoInput.current?.click()}
          onCamera={() => cameraInput.current?.click()}
        />
        <UploadTile
          label="Product photo"
          preview={itemPreview}
          placeholder="Tap to add"
          onClear={() => { setItemFile(null); setItemPreview(null); setItemDataUrl(null); resetResult(); }}
          onPick={() => itemInput.current?.click()}
        />
      </div>

      <input ref={photoInput} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
      <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden"
        onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
      <input ref={itemInput} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onItem(e.target.files[0])} />

      <Button
        onClick={generate}
        disabled={!canGenerate}
        size="lg"
        className="w-full bg-gradient-accent text-accent-foreground border-0 mb-10 h-14 text-base"
      >
        {generating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Rendering your try-on…</>
          : <><Sparkles className="w-5 h-5" /> Try it on</>}
      </Button>

      {resultUrl && photoPreview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-medium mb-4">Before / After</h2>
          <BeforeAfter beforeUrl={photoPreview} afterUrl={resultUrl} itemLabel={detected?.label ?? ""} />

          <div className="flex flex-wrap gap-2 mt-6">
            {!savedSlug ? (
              <Button onClick={save} disabled={saving} className="bg-gradient-accent text-accent-foreground border-0">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save look</>}
              </Button>
            ) : (
              <Button onClick={share} variant="outline">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            )}
            <a href={resultUrl} download="tryon.png" target="_blank" rel="noreferrer">
              <Button variant="outline"><Download className="w-4 h-4" /> Download</Button>
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function UploadTile({
  label, preview, placeholder, onClear, onPick, onCamera,
}: {
  label: string;
  preview: string | null;
  placeholder: string;
  onClear: () => void;
  onPick: () => void;
  onCamera?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{label}</div>
        {preview && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        onClick={onPick}
        className={cn(
          "w-full aspect-[4/5] rounded-xl overflow-hidden border border-dashed border-border bg-background/40 flex items-center justify-center transition-colors hover:border-accent/60",
          preview && "border-solid",
        )}
      >
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground px-4 text-center">
              <Upload className="w-5 h-5" />
              <span className="text-sm">{placeholder}</span>
            </div>
          )}
      </button>
      <div className={cn("grid gap-2 mt-3", onCamera ? "grid-cols-2" : "grid-cols-1")}>
        <Button variant="outline" size="sm" onClick={onPick}>
          <ImageIcon className="w-4 h-4" /> Gallery
        </Button>
        {onCamera && (
          <Button variant="outline" size="sm" onClick={onCamera}>
            <Camera className="w-4 h-4" /> Camera
          </Button>
        )}
      </div>
    </div>
  );
}

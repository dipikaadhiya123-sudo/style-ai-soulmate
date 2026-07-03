import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, ImageIcon, Sparkles, X, Upload, Loader2, Save, Share2, Download, Link2, AlertCircle, History, Trash2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfter from "@/components/BeforeAfter";
import AvailabilityPanel from "@/components/AvailabilityPanel";
import RetailerFallback, { retailerList } from "@/components/RetailerFallback";
import { useTryOnHistory, fileToDataUrl } from "@/hooks/useTryOnHistory";

export default function TryOn() {
  const { user } = useAuth();
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useTryOnHistory(user?.id);
  const [showAvailability, setShowAvailability] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [itemFile, setItemFile] = useState<File | null>(null);
  const [itemDataUrl, setItemDataUrl] = useState<string | null>(null);
  const [itemPreview, setItemPreview] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlStatus, setUrlStatus] = useState<"idle" | "checking" | "reachable" | "error">("idle");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ label: string; category: string } | null>(null);

  const validateUrlFormat = useCallback((url: string) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Link must start with http:// or https://";
      }
      return null;
    } catch {
      return "Please enter a valid URL, e.g. https://example.com/image.jpg";
    }
  }, []);

  const isImageUrlReachable = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => reject(new Error("Image took too long to load — the link may be unreachable or blocked.")), 15000);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = () => { clearTimeout(timeout); reject(new Error("Could not load image from that link. Check the URL or try a direct .jpg/.png link.")); };
      img.src = url;
    });
  }, []);

  const checkUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError(null);
      setUrlStatus("idle");
      return;
    }
    const formatError = validateUrlFormat(trimmed);
    if (formatError) {
      setUrlError(formatError);
      setUrlStatus("error");
      return;
    }
    setUrlStatus("checking");
    setUrlError(null);
    try {
      await isImageUrlReachable(trimmed);
      setUrlStatus("reachable");
      setUrlError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "That link doesn't seem to work.";
      setUrlError(msg);
      setUrlStatus("error");
    }
  }, [validateUrlFormat, isImageUrlReachable]);

  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProductUrlChange = (value: string) => {
    setProductUrl(value);
    setUrlError(null);
    setUrlStatus("idle");
    if (value) {
      setItemFile(null);
      setItemPreview(null);
      setItemDataUrl(null);
    }
    resetResult();
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
    const trimmed = value.trim();
    if (trimmed) {
      urlTimeoutRef.current = setTimeout(() => checkUrl(trimmed), 600);
    }
  };

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    if (itemPreview?.startsWith("blob:")) URL.revokeObjectURL(itemPreview);
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
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
    setProductUrl("");
    setUrlError(null);
    setUrlStatus("idle");
    const reader = new FileReader();
    reader.onload = () => setItemDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    resetResult();
  };

  const generate = async () => {
    if (!user) return toast.error("Please sign in.");
    if (!photoFile) return toast.error("Add your photo.");
    const url = productUrl.trim();
    const hasUrl = /^https?:\/\//i.test(url);
    if (!itemDataUrl && !hasUrl) return toast.error("Add the product photo or paste a link.");

    if (hasUrl && !itemDataUrl) {
      const formatError = validateUrlFormat(url);
      if (formatError) {
        setUrlError(formatError);
        setUrlStatus("error");
        return toast.error(formatError);
      }
      if (urlStatus === "error" && urlError) {
        return toast.error(urlError);
      }
      setUrlStatus("checking");
      try {
        await isImageUrlReachable(url);
        setUrlStatus("reachable");
        setUrlError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "That image link is unreachable.";
        setUrlError(msg);
        setUrlStatus("error");
        return toast.error(msg);
      }
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

      const item: Record<string, string> = {};
      if (itemDataUrl) item.imageUrl = itemDataUrl;
      else if (hasUrl) item.productUrl = url;

      const { data, error } = await supabase.functions.invoke("tryon-generate", {
        body: { photoPath: path, items: [item] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultUrl(data.resultUrl);
      setResultPath(data.resultPath);
      const det = data?.detected?.[0];
      if (det) setDetected(det);

      // Persist to local history so users can reopen this Before/After later.
      try {
        const beforeDataUrl = await fileToDataUrl(photoFile);
        addHistory({
          beforeUrl: beforeDataUrl,
          afterUrl: data.resultUrl,
          label: det?.label ?? "Try-on look",
          category: det?.category,
          sourceUrl: hasUrl ? url : undefined,
        });
      } catch (e) {
        console.warn("history save skipped", e);
      }

      setShowAvailability(false);
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

  const restoreFromHistory = (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    setPhotoPreview(entry.beforeUrl);
    setResultUrl(entry.afterUrl);
    setResultPath(null); // can't re-save; only view
    setSavedSlug(null);
    setDetected(entry.label ? { label: entry.label, category: entry.category ?? "clothes" } : null);
    if (entry.sourceUrl) setProductUrl(entry.sourceUrl);
    setShowAvailability(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
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

  // Only require valid http(s) format — many product pages block hotlinking
  // so the client-side Image() probe will fail even though the backend can
  // scrape og:image successfully. Reachability is advisory, not a hard gate.
  const canGenerateUrl =
    /^https?:\/\//i.test(productUrl.trim()) && validateUrlFormat(productUrl.trim()) === null;
  const canGenerate = !!photoFile && (!!itemDataUrl || canGenerateUrl) && !generating;
  const canGenerateFromLink = !!photoFile && canGenerateUrl && !generating;

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

      <div className={cn(
        "rounded-2xl border p-4 mb-6 transition-colors",
        urlError ? "border-destructive/60 bg-destructive/5" : "border-border bg-gradient-card"
      )}>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="product-link" className="text-sm font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" /> Paste image link
          </label>
          {productUrl && (
            <button
              type="button"
              onClick={() => { setProductUrl(""); setUrlError(null); setUrlStatus("idle"); resetResult(); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Paste any product or image URL (Myntra, Amazon, Zara, or a direct .jpg/.png link).
        </p>
        <div className="flex gap-2">
          <Input
            id="product-link"
            value={productUrl}
            onChange={(e) => onProductUrlChange(e.target.value)}
            onBlur={() => checkUrl(productUrl.trim())}
            placeholder="https://example.com/product-image.jpg"
            className={cn("h-12 flex-1", urlError && "border-destructive focus-visible:ring-destructive")}
            inputMode="url"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  onProductUrlChange(text.trim());
                }
              } catch {
                toast.error("Clipboard unavailable — paste manually");
              }
            }}
          >
            Paste
          </Button>
        </div>

        {urlError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{urlError}</span>
          </div>
        )}

        {urlStatus === "checking" && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking if that image can be reached…
          </div>
        )}

        {urlStatus === "reachable" && productUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={productUrl.trim()}
              alt="Link preview"
              referrerPolicy="no-referrer"
              onError={() => {
                setUrlError("Preview failed to load. The link may be blocked by the site; try copying the image address directly.");
                setUrlStatus("error");
              }}
              className="w-14 h-14 rounded-lg object-cover border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground truncate">{productUrl.trim()}</span>
          </div>
        )}

        {urlStatus === "error" && productUrl && (
          <p className="mt-3 text-xs text-muted-foreground">
            Heads up: the preview couldn't load, but you can still try — we'll fetch the product image on our servers.
          </p>
        )}

        {canGenerateUrl && (
          <Button
            type="button"
            onClick={generate}
            disabled={!canGenerateFromLink}
            className="mt-4 w-full h-12 bg-gradient-accent text-accent-foreground border-0"
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your try-on…</>
              : !photoFile
                ? <><Sparkles className="w-4 h-4" /> Add your photo to generate</>
                : <><Sparkles className="w-4 h-4" /> Generate try-on from link</>}
          </Button>
        )}
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

          <div className="grid grid-cols-2 gap-3 mb-5">
            <figure className="rounded-2xl overflow-hidden border border-border bg-background">
              <img src={photoPreview} alt="Before" className="w-full aspect-[4/5] object-cover" />
              <figcaption className="text-[11px] uppercase tracking-widest text-muted-foreground px-3 py-2">Before</figcaption>
            </figure>
            <figure className="rounded-2xl overflow-hidden border border-border bg-background">
              <img src={resultUrl} alt="After" className="w-full aspect-[4/5] object-cover" />
              <figcaption className="text-[11px] uppercase tracking-widest text-accent px-3 py-2">After{detected?.label ? ` · ${detected.label}` : ""}</figcaption>
            </figure>
          </div>

          <div className="text-xs text-muted-foreground mb-2">Drag the slider to compare</div>
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

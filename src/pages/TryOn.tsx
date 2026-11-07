import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, ImageIcon, Sparkles, X, Upload, Loader2, Save, Share2, Download, Link2, AlertCircle, History, Trash2, Store, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfter from "@/components/BeforeAfter";
import AvailabilityPanel from "@/components/AvailabilityPanel";
import RetailerFallback, { retailerList } from "@/components/RetailerFallback";
import { useTryOnHistory, fileToDataUrl } from "@/hooks/useTryOnHistory";
import { BASIC_PREVIEW_DAILY_LIMIT, getDailyBasicPreviewCount, isRealAiTryOnUnlocked, useDailyBasicPreview } from "@/lib/basicPreviewUsage";
import { composeBasicPreviewImage, basicPreviewReasonCopy } from "@/lib/basicPreviewImage";

type ProductCandidate = { imageUrl: string; title: string; sourceDomain: string; score: number };

export default function TryOn() {
  const { user } = useAuth();
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useTryOnHistory(user?.id);
  const [showAvailability, setShowAvailability] = useState(false);
  const [basicPreviewCount, setBasicPreviewCount] = useState(() => getDailyBasicPreviewCount(user?.id));

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [itemFile, setItemFile] = useState<File | null>(null);
  const [itemDataUrl, setItemDataUrl] = useState<string | null>(null);
  const [itemPreview, setItemPreview] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlStatus, setUrlStatus] = useState<"idle" | "checking" | "reachable" | "error">("idle");

  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [basicPreview, setBasicPreview] = useState<{ garmentUrl: string | null; reason: string } | null>(null);
  const [basicFallbackUrl, setBasicFallbackUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ label: string; category: string } | null>(null);

  useEffect(() => {
    setBasicPreviewCount(getDailyBasicPreviewCount(user?.id));
  }, [user?.id]);

  // Product-match confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(0);
  const [pendingLabel, setPendingLabel] = useState<string>("");

  const extractHttpUrl = useCallback((value: string) => {
    const match = value.match(/https?:\/\/[^\s<>'"]+/i);
    return match?.[0]?.replace(/[),.;]+$/, "") ?? null;
  }, []);

  const validateProductInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const url = extractHttpUrl(trimmed);
    if (!url && /^www\./i.test(trimmed)) return "Link must start with https://";
    if (!url) return trimmed.length >= 3 ? null : "Enter a product link or product name.";
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Link must start with http:// or https://";
      }
      return null;
    } catch {
      return "Please enter a valid URL, e.g. https://example.com/image.jpg";
    }
  }, [extractHttpUrl]);

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
    const formatError = validateProductInput(trimmed);
    if (formatError) {
      setUrlError(formatError);
      setUrlStatus("error");
      return;
    }
    const extractedUrl = extractHttpUrl(trimmed);
    if (!extractedUrl) {
      setUrlError(null);
      setUrlStatus("idle");
      return;
    }
    const isDirectImage = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(extractedUrl);
    if (!isDirectImage) {
      setUrlError(null);
      setUrlStatus("idle");
      return;
    }
    setUrlStatus("checking");
    setUrlError(null);
    try {
      await isImageUrlReachable(extractedUrl);
      setUrlStatus("reachable");
      setUrlError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "That link doesn't seem to work.";
      setUrlError(msg);
      setUrlStatus("error");
    }
  }, [validateProductInput, extractHttpUrl, isImageUrlReachable]);

  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProductUrlChange = (value: string) => {
    setProductUrl(value);
    setUrlError(null);
    setUrlStatus("idle");
    if (value) {
      setItemFile(null);
      setItemPreviewUrl(null);
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

  // Track object URLs outside state so replacing one photo never revokes the
  // other's live preview (the shared-deps cleanup effect used to do exactly
  // that — it killed the "Before" image whenever a product photo was added).
  const objectUrlsRef = useRef<{ photo: string | null; item: string | null }>({ photo: null, item: null });

  const setPhotoPreviewUrl = useCallback((url: string | null) => {
    const prev = objectUrlsRef.current.photo;
    if (prev && prev !== url && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
    objectUrlsRef.current.photo = url;
    setPhotoPreview(url);
  }, []);

  const setItemPreviewUrl = useCallback((url: string | null) => {
    const prev = objectUrlsRef.current.item;
    if (prev && prev !== url && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
    objectUrlsRef.current.item = url;
    setItemPreview(url);
  }, []);

  useEffect(() => () => {
    if (objectUrlsRef.current.photo?.startsWith("blob:")) URL.revokeObjectURL(objectUrlsRef.current.photo);
    if (objectUrlsRef.current.item?.startsWith("blob:")) URL.revokeObjectURL(objectUrlsRef.current.item);
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
  }, []);

  const resetResult = () => {
    setBasicPreview(null);
    setBasicFallbackUrl(null);
    setResultUrl(null);
    setResultPath(null);
    setSavedSlug(null);
    setDetected(null);
  };

  const onPhoto = (file: File) => {
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    resetResult();
  };

  const onItem = (file: File) => {
    setItemFile(file);
    setItemPreviewUrl(URL.createObjectURL(file));
    setProductUrl("");
    setUrlError(null);
    setUrlStatus("idle");
    const reader = new FileReader();
    reader.onload = () => setItemDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    resetResult();
  };

  const parseFunctionError = async (error: unknown): Promise<{ message: string; status?: number; body?: any }> => {
    let backendMsg: string | undefined;
    let backendStatus: number | undefined;
    let body: any = null;
    try {
      const res: Response | undefined = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") {
        backendStatus = res.status;
        body = await res.clone().json().catch(() => null);
        backendMsg = body?.error || body?.message;
      }
    } catch { /* ignore */ }
    const fallback = (error as { message?: string })?.message ?? "Request failed";
    return { message: backendMsg ? `${backendMsg}${backendStatus ? ` (HTTP ${backendStatus})` : ""}` : fallback, status: backendStatus, body };
  };

  // For product-name / product-URL flows, resolve candidates first and let the
  // user confirm the correct garment before spending an AI generation credit.
  const startGenerate = async () => {
    if (!user) return toast.error("Please sign in.");
    if (!isRealAiTryOnUnlocked(basicPreviewCount)) {
      return toast.message("Use all 5 free Basic Previews today to unlock realistic AI try-on.");
    }
    if (!photoFile) return toast.error("Add your photo.");
    const productInput = productUrl.trim();
    const url = extractHttpUrl(productInput);
    const inputError = productInput ? validateProductInput(productInput) : null;
    const hasProductInput = !!productInput && !inputError;
    if (!itemDataUrl && !hasProductInput) return toast.error("Add the product photo, paste a link, or type the product name.");

    // Direct upload → no ambiguity, generate straight away.
    if (itemDataUrl) {
      return runGeneration({ imageUrl: itemDataUrl, label: undefined });
    }

    // Product URL or product name → resolve candidates first.
    setResolving(true);
    setPendingLabel(productInput);
    try {
      const item: Record<string, string> = {};
      if (url) {
        item.productUrl = url;
        const pastedLabel = productInput.replace(url, "").trim();
        if (pastedLabel) item.label = pastedLabel;
      } else {
        item.label = productInput;
      }
      const { data, error } = await supabase.functions.invoke("tryon-generate", {
        body: { resolveOnly: true, items: [item] },
      });
      if (error) {
        const parsed = await parseFunctionError(error);
        // LOW_PRODUCT_MATCH_CONFIDENCE arrives with candidates — still show them.
        if (parsed.body?.candidates?.length) {
          setCandidates(parsed.body.candidates);
          setSelectedCandidateIdx(0);
          setConfirmOpen(true);
          toast.warning("We're not 100% sure — pick the closest match or paste the product link.");
          return;
        }
        throw new Error(parsed.message);
      }
      if (data?.success === false) {
        if (data.candidates?.length) {
          setCandidates(data.candidates);
          setSelectedCandidateIdx(0);
          setConfirmOpen(true);
          toast.warning(data.error ?? "Pick the closest match or paste the product link.");
          return;
        }
        throw new Error(data.error ?? "Couldn't find that product.");
      }
      const list: ProductCandidate[] = data?.candidates ?? (data?.best ? [data.best] : []);
      if (!list.length) throw new Error("No product image found.");
      setCandidates(list);
      setSelectedCandidateIdx(0);
      setConfirmOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't resolve that product");
    } finally {
      setResolving(false);
    }
  };

  const runGeneration = async (chosen: { imageUrl: string; label?: string }) => {
    if (!user || !photoFile) return;
    if (!isRealAiTryOnUnlocked(basicPreviewCount)) {
      return toast.message("Use all 5 free Basic Previews today to unlock realistic AI try-on.");
    }
    setGenerating(true);
    setResultUrl(null);
    setResultPath(null);
    setSavedSlug(null);
    setDetected(null);
    try {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/tryon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tryon-photos")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type || "image/jpeg" });
      if (upErr) throw upErr;
      setPhotoPath(path);

      const item: Record<string, string> = { imageUrl: chosen.imageUrl };
      if (chosen.label) item.label = chosen.label;

      const { data, error } = await supabase.functions.invoke("tryon-generate", {
        body: { photoPath: path, items: [item] },
      });
      if (error) {
        const parsed = await parseFunctionError(error);
        throw new Error(parsed.message);
      }
      if (data?.error) throw new Error(data.error);

      if (data?.basicPreview) {
        const garment = data.garmentUrl ?? chosen.imageUrl ?? itemPreview ?? null;
        setBasicPreview({ garmentUrl: garment, reason: data.reason });
        toast.message("Realistic AI try-on is busy — made a free Basic Preview instead");
        await showComposedPreview(garment, data.reason, chosen.label);
        return;
      }

      setResultUrl(data.resultUrl);
      setResultPath(data.resultPath);
      setBasicPreview(null);
      const det = data?.detected?.[0];
      if (det) setDetected(det);

      try {
        const beforeDataUrl = await fileToDataUrl(photoFile);
        const productInput = productUrl.trim();
        const url = extractHttpUrl(productInput);
        addHistory({
          beforeUrl: beforeDataUrl,
          afterUrl: data.resultUrl,
          label: det?.label ?? chosen.label ?? (productInput && !url ? productInput : "Try-on look"),
          category: det?.category,
          sourceUrl: url ?? undefined,
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

  const confirmAndGenerate = () => {
    const c = candidates[selectedCandidateIdx];
    if (!c) return;
    setConfirmOpen(false);
    runGeneration({ imageUrl: c.imageUrl, label: pendingLabel || c.title });
  };

  // Real-time fallback image: composes "your photo + product photo" on a local
  // canvas (no AI, no bill), uploads it so it can be saved and shared like a
  // normal result. Falls back silently to the labeled card if composition fails.
  const showComposedPreview = async (garmentUrl: string | null, reason: string, label?: string) => {
    if (!user || !photoPreview || !garmentUrl) return;
    try {
      const composed = await composeBasicPreviewImage(photoPreview, garmentUrl, reason);
      if (!composed) return;
      const path = `${user.id}/basic-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("tryon-results")
        .upload(path, composed.blob, { contentType: "image/jpeg", upsert: true });
      if (!error) setResultPath(path);
      setResultUrl(composed.dataUrl);
      setBasicFallbackUrl(composed.dataUrl);
      try {
        const beforeDataUrl = await fileToDataUrl(photoFile!);
        addHistory({
          beforeUrl: beforeDataUrl,
          afterUrl: composed.dataUrl,
          label: label ?? "Basic Preview (no AI)",
          sourceUrl: extractedProductUrl ?? undefined,
        });
      } catch { /* history is optional */ }
    } catch (e) {
      console.warn("Basic preview image failed — showing labeled card only", e);
    }
  };

  const runBasicPreview = async () => {
    if (!user) return toast.error("Please sign in to use Basic Preview.");
    if (!photoPreview) return toast.error("Add your photo first.");

    const directImageUrl = extractedProductUrl && /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(extractedProductUrl)
      ? extractedProductUrl
      : null;
    const garmentUrl = itemDataUrl ?? itemPreview ?? directImageUrl;
    if (!garmentUrl) return toast.error("For a free Basic Preview, upload a product photo or paste a direct image link.");

    const usage = useDailyBasicPreview(user.id);
    setBasicPreviewCount(usage.count);
    if (!usage.allowed) {
      return toast.error("You’ve used all 5 free Basic Previews for today on this device.");
    }

    resetResult();
    setBasicPreview({ garmentUrl, reason: "NO_AI" });
    toast.success("Basic Preview ready — no AI or paid service used.");
    await showComposedPreview(garmentUrl, "NO_AI");
  };

  // Kept as an alias so existing button handlers work.
  const generate = startGenerate;

  const save = async (opts?: { silent?: boolean }): Promise<string | null> => {
    if (!user || !resultPath || !photoPath) return null;
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
          description: basicPreview ? `Basic Preview (no AI): ${label}` : `AI-rendered ${cat}: ${label}`,
          highlights: [],
          result_image_path: resultPath,
        })
        .select("share_slug")
        .single();
      if (error) throw error;
      setSavedSlug(data.share_slug);
      if (!opts?.silent) toast.success("Saved to your lookbook");
      return data.share_slug as string;
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const restoreFromHistory = (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    setPhotoPreviewUrl(entry.beforeUrl);
    setResultUrl(entry.afterUrl);
    setResultPath(null); // can't re-save; only view
    setSavedSlug(null);
    setDetected(entry.label ? { label: entry.label, category: entry.category ?? "clothes" } : null);
    if (entry.sourceUrl) setProductUrl(entry.sourceUrl);
    setShowAvailability(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const share = async () => {
    let slug = savedSlug;
    if (!slug) {
      if (!resultPath) {
        // Result expired or came from history — share the after-image URL directly.
        if (!resultUrl) return toast.error("Nothing to share yet");
        if (navigator.share) {
          try { await navigator.share({ title: detected?.label ?? "My try-on", url: resultUrl }); return; } catch {}
        }
        await navigator.clipboard.writeText(resultUrl);
        toast.success("Image link copied");
        return;
      }
      // Auto-save first so we get a real public share slug.
      const s = await save({ silent: true });
      if (!s) return;
      slug = s;
    }
    const url = `${window.location.origin}/look/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: detected?.label ?? "My try-on", url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  const productInput = productUrl.trim();
  const extractedProductUrl = extractHttpUrl(productInput);
  const canGenerateProductInput = productInput.length > 0 && validateProductInput(productInput) === null;
  const canUseRealTryOn = isRealAiTryOnUnlocked(basicPreviewCount);
  const canGenerate = !!photoFile && (!!itemDataUrl || canGenerateProductInput) && !generating && canUseRealTryOn;
  const canGenerateFromLink = !!photoFile && canGenerateProductInput && !generating && canUseRealTryOn;
  const directProductImageUrl = extractedProductUrl && /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(extractedProductUrl)
    ? extractedProductUrl
    : null;
  const canBasicPreview = !!photoFile && (!!itemDataUrl || !!itemPreview || !!directProductImageUrl);
  const basicPreviewRemaining = Math.max(0, BASIC_PREVIEW_DAILY_LIMIT - basicPreviewCount);

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
          Upload your photo, then add a product photo, paste a link, or type a product name. We'll do the rest.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-6">
        <UploadTile
          label="Your photo"
          preview={photoPreview}
          placeholder="Tap to add"
          onClear={() => { setPhotoFile(null); setPhotoPreviewUrl(null); resetResult(); }}
          onPick={() => photoInput.current?.click()}
          onCamera={() => cameraInput.current?.click()}
        />
        <UploadTile
          label="Product photo"
          preview={itemPreview}
          placeholder="Tap to add"
          onClear={() => { setItemFile(null); setItemPreviewUrl(null); setItemDataUrl(null); resetResult(); }}
          onPick={() => itemInput.current?.click()}
        />
      </div>

      <div className={cn(
        "rounded-2xl border p-4 mb-6 transition-colors",
        urlError ? "border-destructive/60 bg-destructive/5" : "border-border bg-gradient-card"
      )}>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="product-link" className="text-sm font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" /> Paste link or product name
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
          Paste a product page link, Instagram/Pinterest image link, or just the product name.
        </p>
        <div className="flex gap-2">
          <Input
            id="product-link"
            value={productUrl}
            onChange={(e) => onProductUrlChange(e.target.value)}
            onBlur={() => checkUrl(productUrl.trim())}
            placeholder="Myntra/Ajio link or A-line dress"
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

        {urlStatus === "reachable" && extractedProductUrl && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={extractedProductUrl}
              alt="Link preview"
              referrerPolicy="no-referrer"
              onError={() => {
                setUrlError("Preview failed to load. The link may be blocked by the site; try copying the image address directly.");
                setUrlStatus("error");
              }}
              className="w-14 h-14 rounded-lg object-cover border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground truncate">{extractedProductUrl}</span>
          </div>
        )}

        {urlStatus === "error" && extractedProductUrl && (
          <p className="mt-3 text-xs text-muted-foreground">
            Heads up: the preview couldn't load, but you can still try — we'll fetch the product image on our servers.
          </p>
        )}

        {canGenerateProductInput && (
          <Button
            type="button"
            onClick={generate}
            disabled={!canGenerateFromLink || resolving}
            className="mt-4 w-full h-12 bg-gradient-accent text-accent-foreground border-0"
          >
            {resolving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding the product…</>
              : generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your try-on…</>
                : !photoFile
                  ? <><Sparkles className="w-4 h-4" /> Add your photo to generate</>
                  : <><Sparkles className="w-4 h-4" /> Find product & try on</>}
          </Button>
        )}
        {canGenerateProductInput && !canUseRealTryOn && (
          <p className="mt-3 text-xs text-muted-foreground">
            Use all 5 free Basic Previews today to unlock realistic AI try-on. The daily count is stored on this device.
          </p>
        )}
      </div>


      <input ref={photoInput} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
      <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden"
        onChange={e => e.target.files?.[0] && onPhoto(e.target.files[0])} />
      <input ref={itemInput} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && onItem(e.target.files[0])} />

      {/* Dev-only diagnostic panel (hidden in production builds). */}
      {import.meta.env.DEV && (productInput || itemDataUrl || detected) && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 mb-6 text-xs font-mono space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Debug (dev only)</div>
          <div>Photo: <span className="text-foreground">{photoFile ? `${photoFile.name} (${Math.round(photoFile.size/1024)}KB)` : "—"}</span></div>
          <div>Garment source: <span className="text-foreground">
            {itemDataUrl ? "uploaded image" : extractedProductUrl ? "pasted URL" : productInput ? "product name (search)" : "—"}
          </span></div>
          {extractedProductUrl && <div className="truncate">URL → <span className="text-accent">{extractedProductUrl}</span></div>}
          {!extractedProductUrl && productInput && <div>Query → <span className="text-accent">{productInput}</span></div>}
          {detected && <div>Backend resolved → <span className="text-accent">{detected.category}</span> · {detected.label}</div>}
        </div>
      )}

      {/* Progress indicator during generation */}
      {(generating || resolving) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-border bg-gradient-card p-5 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-sm font-medium">
              {resolving ? "Finding the right product…" : "Rendering your try-on…"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-accent"
              initial={{ width: "10%" }}
              animate={{ width: ["10%", "45%", "70%", "90%"] }}
              transition={{
                duration: 8,
                times: [0, 0.3, 0.7, 1],
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This usually takes 10–20 seconds. Please don't close the page.
          </p>
        </motion.div>
      )}

      {/* Single unified generate action — shows whenever a garment upload is present
          (the paste card has its own button for the URL/name flow). */}
      {canBasicPreview && !generating && !resolving && (
        <Button
          type="button"
          variant="outline"
          onClick={runBasicPreview}
          disabled={!user || basicPreviewRemaining === 0}
          className="w-full mb-3 h-12"
        >
          <ImageIcon className="w-4 h-4" /> Basic Preview (Free, no AI)
          <span className="ml-auto text-xs text-muted-foreground">{basicPreviewRemaining}/5 today</span>
        </Button>
      )}

      <p className="text-xs text-muted-foreground mb-6">
        {canUseRealTryOn
          ? "Realistic AI try-on is unlocked. It uses metered AI services and may create costs for the app owner; no customer checkout is configured."
          : `Use ${BASIC_PREVIEW_DAILY_LIMIT - basicPreviewCount} more free Basic Preview${BASIC_PREVIEW_DAILY_LIMIT - basicPreviewCount === 1 ? "" : "s"} today to unlock realistic AI try-on.`}
      </p>

      {itemDataUrl && !generating && !resolving && (
        <Button
          onClick={generate}
          disabled={!canGenerate}
          size="lg"
          className="w-full bg-gradient-accent text-accent-foreground border-0 mb-10 h-14 text-base"
        >
          {generating
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Rendering your try-on…</>
            : !photoFile
              ? <><Sparkles className="w-5 h-5" /> Add your photo to generate</>
              : !canUseRealTryOn
                ? <><Sparkles className="w-5 h-5" /> Unlock after 5 free previews</>
                : <><Sparkles className="w-5 h-5" /> Generate realistic AI try-on</>}
        </Button>
      )}


      {basicPreview && photoPreview && !resultUrl && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest rounded-full border border-border px-2 py-0.5 text-muted-foreground">Basic Preview</span>
            <h2 className="font-display text-xl font-medium">You + this item</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            This is not a realistic AI try-on. It places your photo beside the product photo; it does not change the clothes in your image.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <PhotoFigure src={photoPreview} alt="Your photo" caption="Before · Your photo" />
            <PhotoFigure src={basicPreview.garmentUrl} alt="Product photo" caption="Product photo" contain />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {basicPreviewRemaining} free previews left today on this device. This count is stored in your browser and can be reset or bypassed on another device.
          </p>
          {itemDataUrl && <Button variant="outline" className="mt-4 w-full" onClick={generate} disabled={generating}>
            <Sparkles className="w-4 h-4" /> Try realistic AI try-on again
          </Button>}
        </motion.div>
      )}

      {resultUrl && photoPreview && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h2 className="font-display text-2xl font-medium">Before / After</h2>
            {basicPreview && (
              <span className="text-[11px] uppercase tracking-widest rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                Basic Preview — free, no AI
              </span>
            )}
          </div>
          {basicPreview && (
            <p className="text-xs text-muted-foreground mb-4">
              {basicPreviewReasonCopy(basicPreview.reason)} This is not a realistic AI try-on — your photo and the
              product photo are shown together; the clothes in your image were not changed.
            </p>
          )}

          <div className={cn("grid gap-3 mb-5", basicFallbackUrl && resultUrl !== basicFallbackUrl ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
            <PhotoFigure src={photoPreview} alt="Before" caption="Before" />
            <PhotoFigure src={resultUrl} alt={basicPreview ? "Basic Preview" : "Real AI try-on result"} caption={basicPreview ? "Basic Preview · not realistic AI" : `Real AI try-on${detected?.label ? ` · ${detected.label}` : ""}`} />
            {basicFallbackUrl && resultUrl !== basicFallbackUrl && (
              <PhotoFigure src={basicFallbackUrl} alt="Basic Preview fallback" caption="Basic Preview fallback · not realistic AI" />
            )}
          </div>
          {basicFallbackUrl && resultUrl !== basicFallbackUrl && (
            <p className="text-xs text-muted-foreground mb-4">
              Both results are shown: the realistic AI image and your earlier Basic Preview. The Basic Preview only places your photo beside the product; it does not change your clothes.
            </p>
          )}

          <div className="text-xs text-muted-foreground mb-2">Drag the slider to compare</div>
          <BeforeAfter beforeUrl={photoPreview} afterUrl={resultUrl} itemLabel={detected?.label ?? ""} />



          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={share}
              disabled={saving || (!resultPath && !resultUrl)}
              className="bg-gradient-accent text-accent-foreground border-0"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing link…</>
                : <><Share2 className="w-4 h-4" /> Share</>}
            </Button>
            {resultPath && !savedSlug && (
              <Button onClick={() => save()} disabled={saving} variant="outline">
                <Save className="w-4 h-4" /> Save look
              </Button>
            )}
            <a href={resultUrl} download="tryon.png" target="_blank" rel="noreferrer">
              <Button variant="outline"><Download className="w-4 h-4" /> Download</Button>
            </a>
            <Button variant="outline" onClick={() => setShowAvailability((s) => !s)}>
              <Store className="w-4 h-4" /> {showAvailability ? "Hide stores" : "Find in stores"}
            </Button>
            {basicPreview && (itemDataUrl || canGenerateFromLink) && (
              <Button variant="outline" onClick={generate} disabled={generating}>
                <Sparkles className="w-4 h-4" /> Try realistic AI try-on again
              </Button>
            )}
          </div>

          {showAvailability && detected?.label && (
            <div className="mt-6 space-y-4">
              <AvailabilityPanel
                query={detected.label}
                category={detected.category}
                retailers={retailerList(detected.label)}
              />
              <RetailerFallback query={detected.label} title="Not seeing it? Search retailers directly" />
            </div>
          )}
        </motion.div>
      )}

      {history.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <h2 className="font-display text-xl font-medium">Recent try-ons</h2>
              <span className="text-xs text-muted-foreground">({history.length})</span>
            </div>
            <button
              onClick={() => { if (confirm("Clear all try-on history?")) clearHistory(); }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {history.map((h) => (
              <div key={h.id} className="group relative rounded-2xl overflow-hidden border border-border bg-background">
                <button onClick={() => restoreFromHistory(h.id)} className="block w-full text-left">
                  <div className="grid grid-cols-2 aspect-[8/5]">
                    <img src={h.beforeUrl} alt="Before" className="w-full h-full object-cover" />
                    <img src={h.afterUrl} alt="After" className="w-full h-full object-cover"
                         onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.35"; }} />
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-xs font-medium truncate">{h.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => removeHistory(h.id)}
                  aria-label="Remove"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            History is saved on this device. Result images may expire after ~1 hour — save a look to keep it forever.
          </p>
        </section>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Is this the correct product?</DialogTitle>
            <DialogDescription>
              We found the closest matches for “{pendingLabel}”. Pick the right one before we spend a try-on credit.
            </DialogDescription>
          </DialogHeader>

          {candidates[selectedCandidateIdx] && (
            <div className="rounded-xl border border-border overflow-hidden">
              <img
                src={candidates[selectedCandidateIdx].imageUrl}
                alt={candidates[selectedCandidateIdx].title}
                referrerPolicy="no-referrer"
                className="w-full aspect-square object-contain bg-muted"
              />
              <div className="p-3 text-xs">
                <div className="font-medium line-clamp-2">{candidates[selectedCandidateIdx].title}</div>
                <div className="text-muted-foreground mt-0.5">
                  {candidates[selectedCandidateIdx].sourceDomain} · match {candidates[selectedCandidateIdx].score}
                </div>
              </div>
            </div>
          )}

          {candidates.length > 1 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Other matches</div>
              <div className="grid grid-cols-4 gap-2">
                {candidates.map((c, i) => (
                  <button
                    key={c.imageUrl}
                    type="button"
                    onClick={() => setSelectedCandidateIdx(i)}
                    className={cn(
                      "relative rounded-lg overflow-hidden border aspect-square bg-muted",
                      i === selectedCandidateIdx ? "border-accent ring-2 ring-accent/40" : "border-border"
                    )}
                    title={`${c.title} · ${c.sourceDomain} · ${c.score}`}
                  >
                    <img src={c.imageUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    {i === selectedCandidateIdx && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => { setConfirmOpen(false); itemInput.current?.click(); }}
            >
              <Upload className="w-4 h-4" /> Upload garment instead
            </Button>
            <Button
              onClick={confirmAndGenerate}
              disabled={!candidates.length}
              className="bg-gradient-accent text-accent-foreground border-0"
            >
              <Sparkles className="w-4 h-4" /> Yes, try it on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function PhotoFigure({ src, alt, caption, contain = false }: { src: string; alt: string; caption: string; contain?: boolean }) {
  return (
    <figure className="rounded-xl overflow-hidden border border-border bg-muted">
      <div className="aspect-[3/4] w-full">
        <img src={src} alt={alt} loading="lazy" className={`w-full h-full ${contain ? "object-contain" : "object-cover"}`} />
      </div>
      <figcaption className="px-2 py-1.5 text-[11px] text-muted-foreground text-center">{caption}</figcaption>
    </figure>
  );
}

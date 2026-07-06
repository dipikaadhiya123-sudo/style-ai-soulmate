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

type ProductCandidate = { imageUrl: string; title: string; sourceDomain: string; score: number };

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
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ label: string; category: string } | null>(null);

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

      setResultUrl(data.resultUrl);
      setResultPath(data.resultPath);
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
          description: `AI-rendered ${cat}: ${label}`,
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
  const canGenerate = !!photoFile && (!!itemDataUrl || canGenerateProductInput) && !generating;
  const canGenerateFromLink = !!photoFile && canGenerateProductInput && !generating;

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

      {/* Single unified generate action — shows whenever a garment upload is present
          (the paste card has its own button for the URL/name flow). */}
      {itemDataUrl && (
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
              : <><Sparkles className="w-5 h-5" /> Generate try-on</>}
        </Button>
      )}


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

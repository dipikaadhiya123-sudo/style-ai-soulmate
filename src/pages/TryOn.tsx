import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Image as ImageIcon, Link2, Sparkles, Shirt, Footprints, Watch, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Category = "clothes" | "footwear" | "accessories";

const categories: { id: Category; label: string; icon: any }[] = [
  { id: "clothes", label: "Clothes", icon: Shirt },
  { id: "footwear", label: "Footwear", icon: Footprints },
  { id: "accessories", label: "Accessories", icon: Watch },
];

export default function TryOn() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [itemUrl, setItemUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("clothes");
  const [urlInput, setUrlInput] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const onFile = (file: File, target: "photo" | "item") => {
    const url = URL.createObjectURL(file);
    if (target === "photo") setPhotoUrl(url);
    else setItemUrl(url);
  };

  const loadFromUrl = () => {
    if (!urlInput.trim()) return;
    setItemUrl(urlInput.trim());
    setUrlInput("");
    toast.success("Item image loaded");
  };

  const tryNow = () => {
    if (!photoUrl || !itemUrl) {
      toast.error("Add both a photo of you and an item first.");
      return;
    }
    toast.info("Virtual try-on rendering coming soon — preview is a stub for now.", { duration: 4000 });
  };

  return (
    <div className="container max-w-4xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Beta
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">Virtual Try-On</h1>
        <p className="text-muted-foreground mb-10 max-w-xl">
          Upload your photo and an item — clothes, footwear, or accessories. Realistic rendering is in active development; for now you can stage your inputs.
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
                  active
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60",
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
              <button onClick={() => setPhotoUrl(null)} className="text-muted-foreground hover:text-foreground">
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
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0], "photo")}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0], "photo")}
          />
        </div>

        {/* Item */}
        <div className="rounded-2xl border border-border bg-gradient-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Item to try on</div>
            {itemUrl && (
              <button onClick={() => setItemUrl(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <PreviewBox url={itemUrl} placeholder={`Pick a ${category.slice(0, -1)} image`} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" onClick={() => itemInput.current?.click()}>
              <Upload className="w-4 h-4" /> Upload
            </Button>
            <div className="flex gap-1">
              <Input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Paste image URL"
                className="h-10"
              />
              <Button variant="outline" size="icon" onClick={loadFromUrl} aria-label="Load URL">
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <input
            ref={itemInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0], "item")}
          />
        </div>
      </div>

      <Button
        onClick={tryNow}
        size="lg"
        className="w-full md:w-auto bg-gradient-accent text-accent-foreground border-0"
      >
        <Sparkles className="w-4 h-4" /> Try Now
      </Button>

      <div className="mt-10 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        <div className="font-medium text-foreground mb-2">What's coming</div>
        <ul className="space-y-1 list-disc pl-5">
          <li>Pose detection, body segmentation, garment warping</li>
          <li>Realistic fabric draping, lighting and shadow matching</li>
          <li>Tight / loose fit simulation and side-view support</li>
          <li>Before / after slider, save & share to your Lookbook</li>
        </ul>
      </div>
    </div>
  );
}

function PreviewBox({ url, placeholder }: { url: string | null; placeholder: string }) {
  return (
    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-background/40 border border-border flex items-center justify-center">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="text-center px-6 text-sm text-muted-foreground">{placeholder}</div>
      )}
    </div>
  );
}

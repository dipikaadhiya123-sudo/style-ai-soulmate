import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin, Store, CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type StockStatus = "in_stock" | "limited" | "out_of_stock" | "call_to_confirm";

type OnlineEntry = {
  store: string;
  url: string;
  currency?: string;
  price?: number;
  sizes: { size: string; status: StockStatus }[];
};
type OfflineEntry = { store: string; city: string; address: string; status: StockStatus; phone?: string };

interface Props {
  query: string;
  category?: string;
  retailers: { name: string; url: string }[];
}

const ALL_SIZES = ["XS", "S", "M", "L", "XL"];

export default function AvailabilityPanel({ query, category, retailers }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ online: OnlineEntry[]; offline: OfflineEntry[]; checked_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedStores, setSelectedStores] = useState<string[]>(retailers.slice(0, 6).map((r) => r.name));

  const storeUrlMap = useMemo(() => Object.fromEntries(retailers.map((r) => [r.name, r.url])), [retailers]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("check-availability", {
        body: { query, category, stores: selectedStores, sizes: ALL_SIZES },
      });
      if (err) throw err;
      if (res?.error) throw new Error(res.error);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data && !loading) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const statusBadge = (s: StockStatus) => {
    const map: Record<StockStatus, { cls: string; label: string; Icon: any }> = {
      in_stock: { cls: "text-emerald-500", label: "In stock", Icon: CheckCircle2 },
      limited: { cls: "text-amber-500", label: "Limited", Icon: AlertCircle },
      out_of_stock: { cls: "text-muted-foreground", label: "Out of stock", Icon: AlertCircle },
      call_to_confirm: { cls: "text-muted-foreground", label: "Call to confirm", Icon: Clock },
    };
    const m = map[s];
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium ${m.cls}`}>
        <m.Icon className="w-3 h-3" /> {m.label}
      </span>
    );
  };

  const toggleStore = (name: string) => {
    setSelectedStores((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-gradient-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-medium">Availability</div>
          <div className="text-xs text-muted-foreground">
            {data ? `Updated ${new Date(data.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live indicative stock"}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSize(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedSize === s ? "border-foreground bg-secondary" : "border-border hover:border-foreground/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {retailers.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground pt-1">Stores</div>
            <div className="flex flex-wrap gap-1.5">
              {retailers.map((r) => (
                <button
                  key={r.name}
                  onClick={() => toggleStore(r.name)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedStores.includes(r.name)
                      ? "border-foreground bg-secondary"
                      : "border-border opacity-60 hover:opacity-100"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking stock across stores...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
            <Store className="w-3 h-3" /> Online stores · size {selectedSize}
          </div>
          <div className="space-y-1.5 mb-5">
            {data.online.length === 0 && (
              <div className="text-xs text-muted-foreground">No online matches found.</div>
            )}
            {data.online.map((o) => {
              const sizeStatus = o.sizes.find((s) => s.size === selectedSize)?.status ?? "out_of_stock";
              const url = storeUrlMap[o.store] || o.url;
              return (
                <a
                  key={o.store}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border hover:border-foreground/40 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{o.store}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    {typeof o.price === "number" && (
                      <span className="text-xs text-muted-foreground">
                        {o.currency ?? "₹"}
                        {o.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {statusBadge(sizeStatus)}
                </a>
              );
            })}
          </div>

          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Physical stores
          </div>
          <div className="space-y-1.5">
            {data.offline.map((s) => (
              <div
                key={s.store + s.city}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {s.store} <span className="text-muted-foreground font-normal">· {s.city}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{s.address}</div>
                </div>
                {statusBadge(s.status)}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-4">
            Indicative AI-estimated availability — confirm with the store before visiting.
          </p>
        </>
      )}
    </section>
  );
}

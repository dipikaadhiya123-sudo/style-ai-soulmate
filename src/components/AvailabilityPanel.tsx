import { useMemo } from "react";
import { ExternalLink, MapPin, Store, CheckCircle2, AlertCircle, Clock } from "lucide-react";

type OnlineEntry = { name: string; url: string; status: "in_stock" | "limited" | "out_of_stock" };
type OfflineEntry = { name: string; city: string; address: string; status: "in_stock" | "call_to_confirm" };

interface Props {
  query: string;
  category?: string;
  retailers: { name: string; url: string }[];
}

// Deterministic pseudo-random based on string (so the same item always shows the same availability)
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const LUXURY_BOUTIQUES: Record<string, OfflineEntry[]> = {
  default: [
    { name: "White Crow", city: "Ahmedabad", address: "CG Road, Navrangpura", status: "in_stock" },
    { name: "Palladium Mall", city: "Mumbai", address: "Lower Parel, near High Street Phoenix", status: "in_stock" },
    { name: "DLF Emporio", city: "New Delhi", address: "Vasant Kunj", status: "call_to_confirm" },
    { name: "UB City Mall", city: "Bengaluru", address: "Vittal Mallya Road", status: "in_stock" },
    { name: "Phoenix MarketCity", city: "Pune", address: "Viman Nagar", status: "call_to_confirm" },
  ],
};

export default function AvailabilityPanel({ query, category, retailers }: Props) {
  const { online, offline, updatedAt } = useMemo(() => {
    const seed = hash(query + (category ?? ""));
    const states: OnlineEntry["status"][] = ["in_stock", "limited", "out_of_stock"];
    const online: OnlineEntry[] = retailers.slice(0, 6).map((r, i) => ({
      name: r.name,
      url: r.url,
      status: states[(seed + i * 7) % 3],
    }));
    const offline = LUXURY_BOUTIQUES.default
      .map((s, i) => ({ ...s, _w: (seed + i * 13) % 100 }))
      .sort((a, b) => a._w - b._w)
      .slice(0, 4)
      .map(({ _w, ...rest }) => rest);
    return { online, offline, updatedAt: new Date() };
  }, [query, category, retailers]);

  const statusBadge = (s: string) => {
    if (s === "in_stock")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-500 font-medium">
          <CheckCircle2 className="w-3 h-3" /> In stock
        </span>
      );
    if (s === "limited")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-500 font-medium">
          <AlertCircle className="w-3 h-3" /> Limited
        </span>
      );
    if (s === "out_of_stock")
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <AlertCircle className="w-3 h-3" /> Out of stock
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <Clock className="w-3 h-3" /> Call to confirm
      </span>
    );
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-gradient-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-medium">Availability</div>
          <div className="text-xs text-muted-foreground">Live indicative stock across stores</div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" /> Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
        <Store className="w-3 h-3" /> Online stores
      </div>
      <div className="space-y-1.5 mb-5">
        {online.map((o) => (
          <a
            key={o.name}
            href={o.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border hover:border-foreground/40 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{o.name}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>
            {statusBadge(o.status)}
          </a>
        ))}
      </div>

      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Physical stores near you
      </div>
      <div className="space-y-1.5">
        {offline.map((s) => (
          <div
            key={s.name + s.city}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {s.name} <span className="text-muted-foreground font-normal">· {s.city}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{s.address}</div>
            </div>
            {statusBadge(s.status)}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Indicative availability — confirm with the store before visiting. Connect a live data source for real-time stock.
      </p>
    </section>
  );
}

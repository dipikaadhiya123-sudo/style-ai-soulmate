import { ExternalLink, Store } from "lucide-react";

type Retailer = { name: string; build: (q: string) => string };

const RETAILERS: Retailer[] = [
  { name: "Google Shopping", build: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
  { name: "Amazon.in",       build: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  { name: "Myntra",          build: (q) => `https://www.myntra.com/${encodeURIComponent(q.replace(/\s+/g, "-").toLowerCase())}` },
  { name: "Ajio",            build: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}` },
  { name: "Flipkart",        build: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
  { name: "Nykaa Fashion",   build: (q) => `https://www.nykaafashion.com/nk/pages/search-details.jsp?q=${encodeURIComponent(q)}` },
  { name: "Tata CLiQ",       build: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}` },
];

export function retailerList(query: string) {
  return RETAILERS.map((r) => ({ name: r.name, url: r.build(query) }));
}

export default function RetailerFallback({ query, title = "Find this in stores" }: { query: string; title?: string }) {
  const items = retailerList(query);
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Store className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Opens the retailer's search for “{query}”. Use this if live availability data isn't loading.
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((r) => (
          <a key={r.name} href={r.url} target="_blank" rel="noreferrer noopener"
             className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-accent/60 hover:text-accent transition-colors">
            {r.name} <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

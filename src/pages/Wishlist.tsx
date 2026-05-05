import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BellRing, ExternalLink, Trash2, RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string; title: string; image_url: string | null; source_url: string;
  retailer: string | null; currency: string;
  current_price: number | null; target_price: number | null;
  last_checked_at: string | null;
};

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", source_url: "", target_price: "", retailer: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wishlist_items").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to save items"); return; }
    if (!form.title || !form.source_url) { toast.error("Title and link required"); return; }
    setAdding(true);
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: user.id,
      title: form.title,
      source_url: form.source_url,
      retailer: form.retailer || null,
      target_price: form.target_price ? Number(form.target_price) : null,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Added — we'll watch the price for you");
    setForm({ title: "", source_url: "", target_price: "", retailer: "" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const checkNow = async (id: string) => {
    toast.info("Checking price...");
    const { error } = await supabase.functions.invoke("check-price-drops", { body: { itemId: id } });
    if (error) { toast.error(error.message); return; }
    toast.success("Checked");
    load();
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <Bell className="w-10 h-10 mx-auto mb-4 text-accent" />
        <h1 className="font-display text-3xl mb-2">Price-drop alerts</h1>
        <p className="text-muted-foreground mb-6">Sign in to save items and get notified the moment a discount hits your target price.</p>
        <Link to="/auth"><Button className="bg-gradient-accent text-accent-foreground border-0">Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center gap-3 mb-2">
        <BellRing className="w-6 h-6 text-accent" />
        <h1 className="font-display text-3xl font-medium">Wishlist & price alerts</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        We re-check your saved products every 30 minutes and ping you when the price drops to (or below) your target.
      </p>

      <form onSubmit={add} className="bg-gradient-card border border-border rounded-2xl p-5 mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Product name</Label>
            <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sabyasachi heart necklace" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="url">Product link</Label>
            <Input id="url" type="url" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://www.nykaafashion.com/..." />
          </div>
          <div>
            <Label htmlFor="retailer">Retailer (optional)</Label>
            <Input id="retailer" value={form.retailer} onChange={e => setForm({ ...form, retailer: e.target.value })} placeholder="Nykaa Luxe, Darveys..." />
          </div>
          <div>
            <Label htmlFor="target">Target price (₹)</Label>
            <Input id="target" type="number" min="0" value={form.target_price} onChange={e => setForm({ ...form, target_price: e.target.value })} placeholder="3999" />
          </div>
        </div>
        <Button type="submit" disabled={adding} className="bg-gradient-accent text-accent-foreground border-0">
          <Plus className="w-4 h-4" /> {adding ? "Adding..." : "Watch this product"}
        </Button>
      </form>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No items yet — add your first product above.</div>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <div key={it.id} className="rounded-xl border border-border p-4 bg-gradient-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {it.retailer ?? new URL(it.source_url).hostname.replace("www.", "")}
                  </div>
                  <div className="text-sm mt-2">
                    {it.current_price != null
                      ? <>Now <span className="font-medium">{it.currency} {it.current_price}</span></>
                      : <span className="text-muted-foreground">Not checked yet</span>}
                    {it.target_price != null && (
                      <span className="text-muted-foreground"> · target {it.currency} {it.target_price}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <a href={it.source_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="w-3 h-3" /> Open</Button>
                  </a>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => checkNow(it.id)} aria-label="Check now">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)} aria-label="Remove">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

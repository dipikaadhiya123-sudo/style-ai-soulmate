import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shirt, Trash2, Share2, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Look = {
  id: string;
  photo_path: string;
  result_image_path: string;
  item_label: string;
  category: string;
  description: string;
  share_slug: string;
  created_at: string;
};

export default function MyLooks() {
  const { user } = useAuth();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, { before: string; after: string }>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("looks")
      .select("*")
      .eq("saved", true)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Look[];
    setLooks(rows);
    setLoading(false);

    // Fetch signed URLs for before/after images
    const entries = await Promise.all(
      rows.map(async (r) => {
        const [beforeRes, afterRes] = await Promise.all([
          supabase.storage.from("tryon-photos").createSignedUrl(r.photo_path, 3600),
          supabase.storage.from("tryon-results").createSignedUrl(r.result_image_path, 3600),
        ]);
        return [r.id, { before: beforeRes.data?.signedUrl ?? "", after: afterRes.data?.signedUrl ?? "" }] as const;
      })
    );
    setUrls(Object.fromEntries(entries));
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("looks").delete().eq("id", id);
    setLooks((l) => l.filter((x) => x.id !== id));
    toast.success("Look removed");
  };

  const share = async (slug: string, label: string) => {
    const url = `${window.location.origin}/look/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: label, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  if (loading) return null;

  return (
    <div className="container max-w-5xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-3">
          <Shirt className="w-3.5 h-3.5" /> Saved Looks
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2">My Looks</h1>
        <p className="text-muted-foreground mb-10">Your saved virtual try-on results.</p>
      </motion.div>

      {looks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Shirt className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No looks saved yet.</p>
          <Link to="/tryon">
            <Button className="bg-gradient-accent text-accent-foreground border-0">
              <Sparkles className="w-4 h-4" /> Try on something
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {looks.map((look, i) => {
            const u = urls[look.id];
            return (
              <motion.div
                key={look.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-gradient-card border border-border rounded-2xl overflow-hidden shadow-soft flex flex-col"
              >
                {u && u.before && u.after ? (
                  <div className="grid grid-cols-2 aspect-[8/5]">
                    <img src={u.before} alt="Before" className="w-full h-full object-cover" />
                    <img src={u.after} alt="After" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[8/5] bg-muted animate-pulse" />
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{look.category}</div>
                  <h3 className="font-display text-lg font-medium leading-tight mb-1">{look.item_label}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{look.description}</p>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => share(look.share_slug, look.item_label)} variant="outline" size="sm" className="flex-1">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </Button>
                    {u?.after && (
                      <a href={u.after} download={`${look.item_label}.png`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /></Button>
                      </a>
                    )}
                    <Button onClick={() => remove(look.id)} variant="ghost" size="sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

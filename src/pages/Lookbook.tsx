import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookHeart, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Lookbook() {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("outfits")
      .select("*")
      .eq("user_id", user.id)
      .eq("saved", true)
      .order("created_at", { ascending: false });
    setOutfits(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("outfits").delete().eq("id", id);
    setOutfits(o => o.filter(x => x.id !== id));
    toast.success("Removed");
  };

  const share = async (slug: string, title: string) => {
    const url = `${window.location.origin}/outfit/${slug}`;
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  return (
    <div className="container max-w-5xl py-10">
      <h1 className="font-display text-4xl md:text-5xl font-medium mb-2">Lookbook</h1>
      <p className="text-muted-foreground mb-10">Your saved outfits.</p>

      {loading ? null : outfits.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <BookHeart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No outfits saved yet.</p>
          <Link to="/stylist"><Button className="bg-gradient-accent text-accent-foreground border-0">Style your first outfit</Button></Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {outfits.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{o.occasion}</div>
                  <h3 className="font-display text-lg font-medium leading-tight">{o.title}</h3>
                </div>
                <div className="font-display text-xl font-medium">{Number(o.style_score).toFixed(1)}</div>
              </div>
              <div className="flex gap-1.5 mb-3">
                {(o.items as any[])?.slice(0, 6).map((it: any, idx: number) => (
                  <div key={idx} className="w-7 h-7 rounded-md border border-border" style={{ background: it.color }} title={it.description} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">{o.rationale}</p>
              <div className="flex gap-2">
                <Button onClick={() => share(o.share_slug, o.title)} variant="outline" size="sm" className="flex-1">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
                <Button onClick={() => remove(o.id)} variant="ghost" size="sm">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

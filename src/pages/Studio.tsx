import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Profile = {
  face_photo_path: string | null;
  body_photo_path: string | null;
  ai_analysis: any;
};

export default function Studio() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [bodyUrl, setBodyUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState<"face" | "body" | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("face_photo_path, body_photo_path, ai_analysis")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        if (data.face_photo_path) {
          const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(data.face_photo_path, 3600);
          if (signed) setFaceUrl(signed.signedUrl);
        }
        if (data.body_photo_path) {
          const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(data.body_photo_path, 3600);
          if (signed) setBodyUrl(signed.signedUrl);
        }
      }
    })();
  }, [user]);

  const upload = async (kind: "face" | "body", file: File) => {
    if (!user) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("user-photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const update = kind === "face" ? { face_photo_path: path } : { body_photo_path: path };
      const field = kind === "face" ? "face_photo_path" : "body_photo_path";
      const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(path, 3600);
      if (kind === "face") setFaceUrl(signed?.signedUrl ?? null);
      else setBodyUrl(signed?.signedUrl ?? null);
      setProfile(p => ({ ...(p as Profile), [field]: path }));
      toast.success(`${kind === "face" ? "Face" : "Body"} photo uploaded`);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const analyze = async () => {
    if (!profile?.face_photo_path && !profile?.body_photo_path) {
      toast.error("Upload at least one photo first.");
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-photos", { body: {} });
      if (error) throw error;
      setProfile(p => ({ ...(p as Profile), ai_analysis: data.analysis }));
      toast.success("Analysis updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">Photo Studio</h1>
        <p className="text-muted-foreground mb-10">Upload a face and full-body photo so we can tailor styling to you.</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <PhotoCard
          label="Face photo"
          icon={User}
          url={faceUrl}
          uploading={uploading === "face"}
          onPick={file => upload("face", file)}
        />
        <PhotoCard
          label="Full-body photo"
          icon={Camera}
          url={bodyUrl}
          uploading={uploading === "body"}
          onPick={file => upload("body", file)}
        />
      </div>

      <Button onClick={analyze} disabled={analyzing} className="bg-gradient-accent text-accent-foreground border-0 mb-8">
        {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze with AI</>}
      </Button>

      {profile?.ai_analysis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft"
        >
          <h2 className="font-display text-2xl font-medium mb-4">AI Analysis</h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {Object.entries(profile.ai_analysis).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/60 py-2">
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-medium text-right max-w-[60%]">{String(v)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PhotoCard({
  label,
  icon: Icon,
  url,
  uploading,
  onPick,
}: {
  label: string;
  icon: any;
  url: string | null;
  uploading: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <label
      className={cn(
        "relative aspect-[4/5] rounded-2xl overflow-hidden border-2 border-dashed border-border bg-gradient-card flex flex-col items-center justify-center cursor-pointer transition-all hover:border-accent/50",
        url && "border-solid",
      )}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && onPick(e.target.files[0])}
      />
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="text-center px-6">
          <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <div className="font-medium mb-1">{label}</div>
          <div className="text-xs text-muted-foreground">Tap to upload</div>
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      )}
      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur rounded-full px-3 py-1 text-xs font-medium">
        {label}
      </div>
    </label>
  );
}

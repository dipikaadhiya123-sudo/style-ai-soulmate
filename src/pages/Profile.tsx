import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data);
    })();
  }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
        skin_tone: profile.skin_tone,
        hair_type: profile.hair_type,
        body_shape: profile.body_shape,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (!profile) return null;

  return (
    <div className="container max-w-2xl py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-2">Profile</h1>
        <p className="text-muted-foreground mb-10">{user?.email}</p>
      </motion.div>

      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-soft space-y-5">
        <Field label="Name" value={profile.display_name ?? ""} onChange={v => setProfile({ ...profile, display_name: v })} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Height (cm)" type="number" value={profile.height_cm ?? ""} onChange={v => setProfile({ ...profile, height_cm: v })} />
          <Field label="Weight (kg)" type="number" value={profile.weight_kg ?? ""} onChange={v => setProfile({ ...profile, weight_kg: v })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Skin tone" value={profile.skin_tone ?? ""} onChange={v => setProfile({ ...profile, skin_tone: v })} />
          <Field label="Hair type" value={profile.hair_type ?? ""} onChange={v => setProfile({ ...profile, hair_type: v })} />
          <Field label="Body shape" value={profile.body_shape ?? ""} onChange={v => setProfile({ ...profile, body_shape: v })} />
        </div>
        <Button onClick={save} disabled={saving} className="bg-gradient-accent text-accent-foreground border-0 w-full">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <Button onClick={signOut} variant="ghost" className="mt-8 text-destructive hover:text-destructive">
        <LogOut className="w-4 h-4" /> Sign out
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

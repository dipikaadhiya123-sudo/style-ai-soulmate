import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SKIN_TONES = ["Fair", "Light", "Medium", "Olive", "Tan", "Deep", "Dark"];
const HAIR_TYPES = ["Straight", "Wavy", "Curly", "Coily", "Bald"];
const BODY_SHAPES = ["Slim", "Athletic", "Average", "Curvy", "Plus"];
const STYLE_TAGS = ["Minimal", "Classic", "Streetwear", "Bohemian", "Edgy", "Romantic", "Sporty", "Preppy", "Glam"];
const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    display_name: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    skin_tone: "",
    hair_type: "",
    body_shape: "",
    style_prefs: [] as string[],
  });

  const update = (k: string, v: any) => setData(d => ({ ...d, [k]: v }));
  const toggleStyle = (s: string) =>
    setData(d => ({
      ...d,
      style_prefs: d.style_prefs.includes(s) ? d.style_prefs.filter(x => x !== s) : [...d.style_prefs, s],
    }));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name || null,
        gender: data.gender || null,
        height_cm: data.height_cm ? Number(data.height_cm) : null,
        weight_kg: data.weight_kg ? Number(data.weight_kg) : null,
        skin_tone: data.skin_tone || null,
        hair_type: data.hair_type || null,
        body_shape: data.body_shape || null,
        style_prefs: data.style_prefs,
        onboarded: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All set. Let's style you.");
    navigate("/studio", { replace: true });
  };

  const steps = [
    {
      title: "What should we call you?",
      sub: "We'll use this for your profile.",
      content: (
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={data.display_name} onChange={e => update("display_name", e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <ChipGroup options={GENDERS} value={data.gender} onChange={v => update("gender", v)} />
          </div>
        </div>
      ),
    },
    {
      title: "Your measurements",
      sub: "Helps us recommend the right cuts and proportions.",
      content: (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label>Height (cm)</Label>
            <Input type="number" value={data.height_cm} onChange={e => update("height_cm", e.target.value)} placeholder="170" />
          </div>
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input type="number" value={data.weight_kg} onChange={e => update("weight_kg", e.target.value)} placeholder="65" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Body shape</Label>
            <ChipGroup options={BODY_SHAPES} value={data.body_shape} onChange={v => update("body_shape", v)} />
          </div>
        </div>
      ),
    },
    {
      title: "Skin & hair",
      sub: "We'll match colors that flatter you.",
      content: (
        <div className="space-y-5 max-w-md">
          <div className="space-y-2">
            <Label>Skin tone</Label>
            <ChipGroup options={SKIN_TONES} value={data.skin_tone} onChange={v => update("skin_tone", v)} />
          </div>
          <div className="space-y-2">
            <Label>Hair type</Label>
            <ChipGroup options={HAIR_TYPES} value={data.hair_type} onChange={v => update("hair_type", v)} />
          </div>
        </div>
      ),
    },
    {
      title: "Your style",
      sub: "Pick a few that feel like you.",
      content: (
        <div className="flex flex-wrap gap-2 max-w-lg">
          {STYLE_TAGS.map(s => {
            const on = data.style_prefs.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStyle(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-all",
                  on
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:border-foreground/40",
                )}
              >
                {on && <Check className="inline w-3.5 h-3.5 mr-1.5" />}
                {s}
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-2xl py-10 md:py-20">
        <div className="mb-10">
          <div className="flex gap-1.5 mb-2">
            {steps.map((_, i) => (
              <div key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-border")} />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-medium mb-2 text-balance">{current.title}</h1>
            <p className="text-muted-foreground mb-8">{current.sub}</p>
            {current.content}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-12">
          <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {isLast ? (
            <Button onClick={finish} disabled={saving} className="bg-gradient-accent text-accent-foreground border-0">
              {saving ? "Saving..." : "Finish"} <Check className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => setStep(s => s + 1)} className="bg-gradient-accent text-accent-foreground border-0">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm border transition-all",
            value === o
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border hover:border-foreground/40",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function ConsentModal({ show, onAccept, onDecline }: { show: boolean; onAccept: () => void; onDecline: () => void }) {
  const [loading, setLoading] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  if (!show) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_consent").upsert({ user_id: user.id, consent_type: "photo_upload", accepted: true, version: "1.0" });
        if (aiConsent) {
          await supabase.from("user_consent").upsert({ user_id: user.id, consent_type: "ai_training", accepted: true, version: "1.0" });
        }
      }
    } catch (_e) { }
    setLoading(false);
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><Camera className="w-5 h-5 text-accent" /></div>
          <div><h2 className="font-semibold text-lg">Photo Upload Consent</h2><p className="text-xs text-muted-foreground">Required before uploading</p></div></div>
        <div className="space-y-3 mb-6 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5" /><p><strong>You own your photos.</strong> All content you upload remains your property.</p></div>
          <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5" /><p><strong>Private & secure.</strong> Photos are encrypted and only visible to you.</p></div>
          <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5" /><p><strong>Auto-deletion.</strong> Unsaved photos deleted after 24 hours.</p></div>
        </div>
        <label className="flex items-start gap-3 cursor-pointer mb-4"><input type="checkbox" checked={aiConsent} onChange={(e) => setAiConsent(e.target.checked)} className="mt-1 w-4 h-4" /><div><p className="text-sm font-medium">Help improve StyleAI</p><p className="text-xs text-muted-foreground">Allow anonymized try-on results to improve our AI models. Your photos are never shared.</p></div></label>
        <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={onDecline}>Cancel</Button><Button className="flex-1 bg-gradient-accent text-white border-0" onClick={handleAccept} disabled={loading}>{loading ? "Saving" : "Is Understand - Continue"}</Button></div>
      </motion.div></div>);
}
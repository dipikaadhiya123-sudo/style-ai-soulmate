import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Does navy suit my skin tone?",
  "What should I wear to a beach wedding?",
  "How do I style oversized blazers?",
  "Color palette for my undertone?",
];

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data as Msg[]);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming || !user) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    // Save user message
    supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: userMsg.content }).then();

    try {
      const { data: sess } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stylist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
      });

      if (resp.status === 429) { toast.error("Slow down — rate limit hit. Try again in a moment."); setStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add funds in workspace usage."); setStreaming(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      setMessages(m => [...m, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      // Persist assistant message
      if (acc) supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: acc }).then();
    } catch (err: any) {
      toast.error(err?.message ?? "Chat failed");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="container max-w-3xl py-6 md:py-10 flex flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <div className="mb-4">
        <h1 className="font-display text-3xl md:text-4xl font-medium">Stylist Chat</h1>
        <p className="text-sm text-muted-foreground">Ask anything about your style.</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="grid sm:grid-cols-2 gap-2 mt-6">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left p-4 rounded-xl bg-gradient-card border border-border hover:border-accent/50 transition-all text-sm shadow-soft"
              >
                <Sparkles className="inline w-3.5 h-3.5 text-accent mr-1.5" />
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1",
                )}
              >
                {m.role === "assistant" ? <ReactMarkdown>{m.content || "…"}</ReactMarkdown> : m.content}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(input); }}
        className="sticky bottom-0 flex gap-2 bg-background/80 backdrop-blur pt-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your stylist…"
          className="flex-1 h-12 rounded-full border border-border bg-card px-5 outline-none focus:ring-2 focus:ring-accent text-sm"
        />
        <Button type="submit" disabled={streaming || !input.trim()} size="icon" className="h-12 w-12 rounded-full bg-gradient-accent text-accent-foreground border-0">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}

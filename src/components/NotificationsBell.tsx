import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type N = { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export default function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20);
    setItems((data ?? []) as N[]);
  };

  useEffect(() => {
    if (!user) { setItems([]); return; }
    load();
  }, [user]);

  const unread = items.filter(i => !i.read).length;

  const markRead = async () => {
    if (unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    setItems(prev => prev.map(i => ({ ...i, read: true })));
  };

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={(o) => o && markRead()}>
      <DropdownMenuTrigger className="relative inline-flex w-9 h-9 items-center justify-center rounded-md hover:bg-secondary/60">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </div>
        ) : items.map(n => (
          <DropdownMenuItem key={n.id} asChild>
            {n.link ? (
              <a href={n.link} target="_blank" rel="noreferrer" className="flex flex-col items-start gap-0.5 py-2">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </a>
            ) : (
              <div className="flex flex-col items-start gap-0.5 py-2">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </div>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/wishlist" className="text-sm">Manage wishlist</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

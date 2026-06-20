import { X, ChevronDown, ChevronUp, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import useAuthDebug from "@/hooks/useAuthDebug";
import { useState } from "react";
export default function AuthDebugPanel() {
  const { session, user, events, enabled, clearSession } = useAuthDebug();
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  if (!enabled) return null;
  const copyLogs = () => { navigator.clipboard.writeText(events.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md w-[calc(100%-2rem)] text-xs">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 px-3 py-2 bg-black/90 text-white rounded-t-lg w-full text-left">
        <span className="flex-1">🔍 Auth Debug <span></span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div className="bg-black/90 text-white p-3 rounded-b-lg max-h-60 overflow-y-auto space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <div className={`w-2 h-2 rounded-full ${user ? "bg-green-400" : session ? "bg-yellow-400" : "bg-red-400"} } />
            <span className="flex-1 text-[Color]">{user ? "Authenticated" : session ? "Expired" : "Not auth"}</span>
            <button onClick={clearSession} className="hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
            <button onClick={() => window.location.reload()} className="hover:text-blue-400"><RefreshCw className="w-3 h-3" /></button>
            <button onClick={copyLogs} className="hover:text-green-400">{copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}</button>
          </div>
          {user && (
            <div className="opacity-70">
              <div>ID: {user.id.slice(0,8)}... Email: {user.email} Provider: {user.app_metadata?.provider || "email"}</div>
            </div>
          )}
          <div className="pt-2 border-t border-white/10">
            {events.map((evt, i) => <div key={i} className="py-0.5 opacity-80">{evt}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
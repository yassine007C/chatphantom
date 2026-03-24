import { useGetInbox } from "@workspace/api-client-react";
import { getAuthReq } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox as InboxIcon, MessageCircle, Clock, Ghost } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/lib/auth";
import { useEffect } from "react";

export default function Inbox() {
  const { isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const { data, isLoading } = useGetInbox({ request: getAuthReq(), query: { enabled: isAuthenticated } });

  if (authLoading || isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse mb-8" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 glass-card rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 text-primary rounded-xl">
          <InboxIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-display font-bold">Your Inbox</h1>
      </div>

      {!data?.conversations || data.conversations.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center border-dashed border-white/20">
          <Ghost className="w-16 h-16 text-white/20 mb-4" />
          <h3 className="text-xl font-bold mb-2">No messages yet</h3>
          <p className="text-muted-foreground mb-6">Share your profile link to start receiving anonymous messages.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {data.conversations.map((conv, i) => (
              <Link key={conv.id} href={`/inbox/${conv.id}`}>
                <motion.a
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 rounded-2xl flex items-center gap-4 group hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative block"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <Ghost className="w-6 h-6" />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white/90">Anonymous Phantom</h3>
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true }) : 'Never'}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage || "Start the conversation..."}
                    </p>
                  </div>
                </motion.a>
              </Link>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

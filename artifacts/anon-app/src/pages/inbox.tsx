import { useMemo, useState } from "react";
import { useGetInbox, useGetSentConversations } from "@workspace/api-client-react";
import { getAuthReq, useCurrentUser, GUEST_ID_KEY } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox as InboxIcon, Send, Clock, Ghost } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

type Tab = "received" | "sent";

export default function Inbox() {
  const { isAuthenticated, isLoading: authLoading } = useCurrentUser();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("received");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const guestId = useMemo(() => {
    let sid = localStorage.getItem(GUEST_ID_KEY);
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem(GUEST_ID_KEY, sid);
    }
    return sid;
  }, []);

  const { data: receivedData, isLoading: receivedLoading } = useGetInbox({
    request: getAuthReq(),
    query: { enabled: isAuthenticated }
  });

  const { data: sentData, isLoading: sentLoading } = useGetSentConversations(
    { guestSessionId: guestId },
    { query: { enabled: !!guestId } }
  );

  const isLoading = authLoading || (tab === "received" ? receivedLoading : sentLoading);

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse mb-8" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 glass-card rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const receivedConvs = receivedData?.conversations ?? [];
  const sentConvs = sentData?.conversations ?? [];
  const currentConvs = tab === "received" ? receivedConvs : sentConvs;

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/20 text-primary rounded-xl">
          <InboxIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-display font-bold">Inbox</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-6 border border-white/10">
        <button
          onClick={() => setTab("received")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            tab === "received"
              ? "bg-primary/20 text-primary border border-primary/30 shadow"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <InboxIcon className="w-4 h-4" />
          Received
          {receivedConvs.filter((c) => c.unreadCount > 0).length > 0 && (
            <span className="w-5 h-5 bg-primary text-white text-xs font-bold flex items-center justify-center rounded-full">
              {receivedConvs.filter((c) => c.unreadCount > 0).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            tab === "sent"
              ? "bg-accent/20 text-accent border border-accent/30 shadow"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Send className="w-4 h-4" />
          Sent Anonymously
          {sentConvs.filter((c) => c.unreadCount > 0).length > 0 && (
            <span className="w-5 h-5 bg-accent text-white text-xs font-bold flex items-center justify-center rounded-full">
              {sentConvs.filter((c) => c.unreadCount > 0).length}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 glass-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : currentConvs.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center border-dashed border-white/20">
          <Ghost className="w-16 h-16 text-white/20 mb-4" />
          {tab === "received" ? (
            <>
              <h3 className="text-xl font-bold mb-2">No messages yet</h3>
              <p className="text-muted-foreground">Share your profile link to start receiving anonymous messages.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-2">No sent messages</h3>
              <p className="text-muted-foreground mb-4">Visit someone's profile to send them an anonymous message.</p>
              <Link href="/directory">
                <a className="text-accent hover:underline text-sm font-medium">Browse users →</a>
              </Link>
            </>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {currentConvs.map((conv, i) => {
              const href = tab === "received" ? `/inbox/${conv.id}` : `/sent/${conv.id}`;
              const hasUnread = conv.unreadCount > 0;
              return (
                <Link key={conv.id} href={href}>
                  <motion.a
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-5 rounded-2xl flex items-center gap-4 group hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative block"
                  >
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                        tab === "received"
                          ? "bg-white/5 border-white/10 group-hover:text-primary group-hover:bg-primary/10"
                          : "bg-white/5 border-white/10 group-hover:text-accent group-hover:bg-accent/10"
                      } text-muted-foreground`}>
                        {tab === "received" ? <Ghost className="w-6 h-6" /> : <Send className="w-5 h-5" />}
                      </div>
                      {hasUnread && (
                        <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold flex items-center justify-center rounded-full shadow-lg ${tab === "received" ? "bg-primary" : "bg-accent"}`}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-white/90">
                          {tab === "received"
                            ? (conv.anonymousAlias || "Anonymous")
                            : ((conv as any).ownerUsername ? `@${(conv as any).ownerUsername}` : "Unknown user")}
                        </h3>
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true }) : "Never"}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${hasUnread ? "text-white font-medium" : "text-muted-foreground"}`}>
                        {conv.lastMessage || "Start the conversation..."}
                      </p>
                    </div>
                  </motion.a>
                </Link>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

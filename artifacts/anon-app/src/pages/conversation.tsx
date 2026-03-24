import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetConversation, useReplyToConversation } from "@workspace/api-client-react";
import { getAuthReq } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Send, ArrowLeft, Ghost, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  const convId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGetConversation(convId, { 
    request: getAuthReq(),
    query: { refetchInterval: 5000 } // Poll for real-time feel
  });

  useEffect(() => {
    // Mark messages as read by invalidating unread count
    if (data) {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/unread-count"] });
    }
  }, [data, queryClient]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const replyMutation = useReplyToConversation({
    request: getAuthReq(),
    mutation: {
      onSuccess: () => {
        setReply("");
        queryClient.invalidateQueries({ queryKey: [`/api/inbox/${convId}`] });
      }
    }
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate({ conversationId: convId, data: { body: reply } });
  };

  if (isLoading) return <div className="text-center py-20 animate-pulse">Decrypting messages...</div>;
  if (!data) return <div className="text-center py-20 text-destructive">Conversation not found</div>;

  return (
    <div className="max-w-3xl mx-auto w-full h-[calc(100vh-8rem)] flex flex-col glass-card rounded-[2rem] overflow-hidden border-white/10 shadow-2xl">
      {/* Header */}
      <div className="h-20 border-b border-white/5 bg-white/5 flex items-center px-6 shrink-0 z-10 backdrop-blur-md">
        <Link href="/inbox">
          <Button variant="ghost" size="icon" className="rounded-full mr-4 hover:bg-white/10 text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white leading-tight">Anonymous</h2>
            <p className="text-xs text-primary/80 font-medium">Encrypted Session</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {data.messages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No messages yet.</div>
        ) : (
          data.messages.map((msg, i) => {
            const isOwner = msg.isFromOwner;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isOwner && (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center mb-1">
                      <Ghost className="w-4 h-4 text-white/50" />
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-2xl ${
                    isOwner 
                      ? 'bg-gradient-to-br from-primary to-accent text-white rounded-br-sm shadow-lg shadow-primary/20' 
                      : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                  }`}>
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{msg.body}</p>
                  </div>

                  {isOwner && (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center mb-1">
                      <UserIcon className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] text-muted-foreground mt-1 px-10 ${isOwner ? 'text-right' : 'text-left'}`}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Reply Input */}
      <div className="p-4 bg-background/50 border-t border-white/5 backdrop-blur-md shrink-0">
        <form onSubmit={handleReply} className="flex gap-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            className="min-h-[56px] max-h-32 bg-white/5 border-white/10 rounded-2xl resize-none py-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReply(e);
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!reply.trim() || replyMutation.isPending}
            className="w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetSentConversation, useReplyAsSender } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Send, ArrowLeft, Ghost, User as UserIcon, ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GUEST_ID_KEY } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { useImageUpload } from "@/hooks/useImageUpload";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SentConversation() {
  const { id } = useParams<{ id: string }>();
  const convId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [replyImage, setReplyImage] = useState<{ objectPath: string; previewUrl: string } | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const guestId = useMemo(() => {
    let sid = localStorage.getItem(GUEST_ID_KEY);
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem(GUEST_ID_KEY, sid);
    }
    return sid;
  }, []);

  const { data, isLoading } = useGetSentConversation(convId, { guestSessionId: guestId }, {
    query: { refetchInterval: 5000, enabled: !!guestId }
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const replyMutation = useReplyAsSender({
    mutation: {
      onSuccess: () => {
        setReply("");
        setReplyImage(null);
        queryClient.invalidateQueries({ queryKey: [`/api/sent/${convId}`] });
      }
    }
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() && !replyImage) return;
    replyMutation.mutate({
      conversationId: convId,
      data: { body: reply || " ", guestSessionId: guestId, imageUrl: replyImage?.objectPath ?? undefined } as any
    });
  };

  const handleImageChange = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setReplyImage(result);
  };

  if (isLoading) return <div className="text-center py-20 animate-pulse text-muted-foreground">Loading thread...</div>;
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
          <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white leading-tight">
              {(data?.conversation as any)?.ownerUsername ? `@${(data.conversation as any).ownerUsername}` : "Unknown user"}
            </h2>
            <p className="text-xs text-accent/80 font-medium">
              You appear as <span className="font-semibold">{data?.conversation?.anonymousAlias || "Anonymous"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {data.messages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No messages yet.</div>
        ) : (
          data.messages.map((msg) => {
            const isMine = !msg.isFromOwner;
            const imageUrl = (msg as any).imageUrl;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mb-1">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div className={`rounded-2xl overflow-hidden ${
                    isMine
                      ? 'bg-gradient-to-br from-accent to-primary text-white rounded-br-sm shadow-lg shadow-accent/20'
                      : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                  }`}>
                    {imageUrl && (
                      <img
                        src={`${BASE}/api/storage${imageUrl}`}
                        alt="Image"
                        className="max-w-xs max-h-60 object-cover w-full"
                      />
                    )}
                    {msg.body.trim() && (
                      <p className="whitespace-pre-wrap text-base leading-relaxed p-4">{msg.body}</p>
                    )}
                  </div>

                  {isMine && (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center mb-1">
                      <Ghost className="w-4 h-4 text-white/50" />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] text-muted-foreground mt-1 px-10 ${isMine ? 'text-right' : 'text-left'}`}>
                  {isMine ? 'You (anonymous)' : 'Them'} · {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Reply Input */}
      <div className="p-4 bg-background/50 border-t border-white/5 backdrop-blur-md shrink-0">
        {replyImage && (
          <div className="relative inline-block mb-2">
            <img src={replyImage.previewUrl} alt="Attachment" className="max-h-24 rounded-xl border border-white/10 object-cover" />
            <button type="button" onClick={() => setReplyImage(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
        <form onSubmit={handleReply} className="flex gap-2">
          <label className="cursor-pointer flex items-center justify-center w-12 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])} disabled={isUploading} />
            {isUploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
          </label>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply anonymously..."
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
            disabled={(!reply.trim() && !replyImage) || replyMutation.isPending || isUploading}
            className="w-14 h-14 rounded-2xl bg-accent hover:bg-accent/90 text-white shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

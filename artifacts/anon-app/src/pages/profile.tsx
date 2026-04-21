import { useState, useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useGetUserProfile, useSendAnonymousMessage, useUpdateAvatar } from "@workspace/api-client-react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import { Ghost, Send, ImageIcon, X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GUEST_ID_KEY, useCurrentUser, getAuthReq } from "@/lib/auth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Avatar({ username, avatarUrl, size = "lg" }: { username: string; avatarUrl?: string | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-24 h-24" : "w-10 h-10";
  const text = size === "lg" ? "text-3xl" : "text-base";
  if (avatarUrl) {
    return (
      <div className={`${dim} rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_40px_rgba(139,92,246,0.3)]`}>
        <img src={`${BASE}/api/storage${avatarUrl}`} alt={username} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${dim} bg-gradient-to-tr from-primary to-accent rounded-full p-0.5 shadow-[0_0_40px_rgba(139,92,246,0.3)]`}>
      <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
        <span className={`${text} font-bold text-white uppercase`}>{username.charAt(0)}</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [messageImage, setMessageImage] = useState<{ objectPath: string; previewUrl: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading, error } = useGetUserProfile(username);
  const { uploadImage, isUploading } = useImageUpload();

  const isOwnProfile = currentUser?.username === username;

  const guestId = useMemo(() => {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  }, []);

  const sendMutation = useSendAnonymousMessage({
    mutation: {
      onSuccess: () => {
        setMessage("");
        setMessageImage(null);
        toast({
          title: "Message Sent!",
          description: `Your anonymous message to ${username} has been delivered.`,
          className: "bg-green-500/20 border-green-500/50 text-white"
        });
      },
      onError: (err: any) => {
        toast({ title: "Failed to send", description: err.error || "An error occurred", variant: "destructive" });
      }
    }
  });

  const avatarMutation = useUpdateAvatar({
    request: getAuthReq(),
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/" + username] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Avatar updated!", description: "Your profile picture has been changed." });
      },
      onError: () => {
        toast({ title: "Upload failed", description: "Could not update your profile picture.", variant: "destructive" });
      }
    }
  });

  const handleAvatarChange = async (file: File) => {
    const result = await uploadImage(file);
    if (result) {
      avatarMutation.mutate({ data: { avatarUrl: result.objectPath } });
    }
  };

  const handleMessageImageChange = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setMessageImage(result);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !messageImage) return;
    sendMutation.mutate({
      username,
      data: { body: message || " ", guestSessionId: guestId, imageUrl: messageImage?.objectPath ?? undefined } as any
    });
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground animate-pulse">Summoning profile...</div>;

  if (error || !profile) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <Ghost className="w-16 h-16 text-white/10 mb-4" />
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-muted-foreground">The phantom you are looking for has vanished.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 sm:p-10 rounded-[2rem] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        {/* Avatar */}
        <div className="relative inline-block mx-auto mb-6">
          <Avatar username={profile.username} avatarUrl={(profile as any).avatarUrl} size="lg" />
          {isOwnProfile && (
            <>
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading || avatarMutation.isPending}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/80 transition-colors border-2 border-background"
              >
                {isUploading || avatarMutation.isPending
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Camera className="w-4 h-4 text-white" />
                }
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
              />
            </>
          )}
        </div>

        <h1 className="text-3xl font-display font-bold text-white mb-2">@{profile.username}</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          {isOwnProfile ? "This is your profile — share it to receive messages!" : "Send me an anonymous message!"}
        </p>

        {!isOwnProfile && (
          <form onSubmit={handleSend} className="space-y-4 relative z-10">
            <Textarea
              placeholder="Type your secret message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-black/40 border-white/10 rounded-2xl resize-none min-h-[120px] text-lg p-5 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50 text-center"
              maxLength={1000}
            />

            {/* Image preview */}
            {messageImage && (
              <div className="relative inline-block">
                <img src={messageImage.previewUrl} alt="Attachment" className="max-h-40 rounded-xl border border-white/10 object-cover" />
                <button
                  type="button"
                  onClick={() => setMessageImage(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleMessageImageChange(e.target.files[0])}
                  disabled={isUploading}
                />
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors text-sm">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isUploading ? "Uploading..." : "Attach Image"}
                </div>
              </label>
            </div>

            <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1">
              <LockIcon className="w-3 h-3" /> 100% anonymous & encrypted
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={(!message.trim() && !messageImage) || sendMutation.isPending || isUploading}
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-lg h-14 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-[1.02]"
            >
              {sendMutation.isPending ? "Encrypting & Sending..." : "Send Anonymously"}
              <Send className="w-5 h-5 ml-2" />
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function LockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

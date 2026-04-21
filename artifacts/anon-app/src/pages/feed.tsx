import { useState, useRef } from "react";
import { useGetFeed, useCreatePost } from "@workspace/api-client-react";
import { useCurrentUser, getAuthReq } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Send, User as UserIcon, Ghost, ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function AvatarBubble({ username, avatarUrl, isAnonymous }: { username?: string | null; avatarUrl?: string | null; isAnonymous: boolean }) {
  if (!isAnonymous && avatarUrl) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
        <img src={`${BASE}/api/storage${avatarUrl}`} alt={username || ""} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isAnonymous ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
      {isAnonymous ? <Ghost className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
    </div>
  );
}

export default function Feed() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [postImage, setPostImage] = useState<{ objectPath: string; previewUrl: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const { data, isLoading } = useGetFeed(
    { page: 1, limit: 50 },
    { request: getAuthReq() }
  );

  const createMutation = useCreatePost({
    request: getAuthReq(),
    mutation: {
      onSuccess: () => {
        setContent("");
        setPostImage(null);
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
        toast({ title: "Post published!", description: "Your thought is out in the wild." });
      },
      onError: (err: any) => {
        toast({ title: "Failed to post", description: err.error || "An error occurred", variant: "destructive" });
      }
    }
  });

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !postImage) return;
    createMutation.mutate({ data: { content: content || " ", isAnonymous, imageUrl: postImage?.objectPath ?? undefined } as any });
  };

  const handleImageChange = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setPostImage(result);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Global Feed</h1>
      </div>

      {user && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handlePost}
          className="glass-card p-5 sm:p-6 rounded-3xl space-y-4 border-t border-t-white/10"
        >
          <Textarea
            placeholder="What's on your mind? Confess something..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-black/20 border-white/10 rounded-2xl resize-none min-h-[100px] text-lg placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
            maxLength={1000}
          />

          {/* Image preview */}
          {postImage && (
            <div className="relative inline-block">
              <img src={postImage.previewUrl} alt="Attachment" className="max-h-48 rounded-xl border border-white/10 object-cover" />
              <button
                type="button"
                onClick={() => setPostImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center space-x-3 bg-white/5 py-2 px-4 rounded-full border border-white/5">
                <Switch
                  id="anonymous-mode"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="anonymous-mode" className="flex items-center gap-2 cursor-pointer font-medium">
                  {isAnonymous ? (
                    <><Ghost className="w-4 h-4 text-primary" /> Anonymously</>
                  ) : (
                    <><UserIcon className="w-4 h-4 text-blue-400" /> As {user.username}</>
                  )}
                </Label>
              </div>
              <label className="cursor-pointer">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  disabled={isUploading}
                />
                <div className="flex items-center gap-1.5 py-2 px-3 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors text-sm">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isUploading ? "Uploading..." : "Image"}
                </div>
              </label>
            </div>
            <Button
              type="submit"
              disabled={(!content.trim() && !postImage) || createMutation.isPending || isUploading}
              className="w-full sm:w-auto rounded-full bg-white text-black hover:bg-white/90 font-semibold px-6"
            >
              {createMutation.isPending ? "Publishing..." : "Publish"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.form>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 glass-card rounded-3xl animate-pulse" />
          ))
        ) : data?.posts?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Ghost className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>It's quiet here. Be the first to confess.</p>
          </div>
        ) : (
          <AnimatePresence>
            {data?.posts?.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 rounded-3xl flex flex-col group hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AvatarBubble username={post.username} avatarUrl={(post as any).avatarUrl} isAnonymous={post.isAnonymous} />
                  <div>
                    <p className="font-semibold text-white">
                      {post.isAnonymous ? 'Anonymous Phantom' : post.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {post.content.trim() && (
                  <p className="text-lg text-white/90 whitespace-pre-wrap leading-relaxed mb-3">
                    {post.content}
                  </p>
                )}
                {(post as any).imageUrl && (
                  <img
                    src={`${BASE}/api/storage${(post as any).imageUrl}`}
                    alt="Post image"
                    className="rounded-2xl max-h-80 object-cover w-full border border-white/10"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

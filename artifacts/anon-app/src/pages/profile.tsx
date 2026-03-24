import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetUserProfile, useSendAnonymousMessage } from "@workspace/api-client-react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import { Ghost, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GUEST_ID_KEY } from "@/lib/auth";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  
  const { data: profile, isLoading, error } = useGetUserProfile(username);

  // Generate or retrieve persistent guest ID to group messages for anonymous users
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
        toast({ 
          title: "Message Sent!", 
          description: `Your anonymous message to ${username} has been delivered.`,
          className: "bg-green-500/20 border-green-500/50 text-white"
        });
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to send", 
          description: err.error || "An error occurred", 
          variant: "destructive" 
        });
      }
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate({ 
      username, 
      data: { body: message, guestSessionId: guestId } 
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
        {/* Decorative background blur inside card */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
        
        <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-primary to-accent rounded-full p-1 mb-6 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
          <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white uppercase">{profile.username.charAt(0)}</span>
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-white mb-2">@{profile.username}</h1>
        <p className="text-muted-foreground mb-8 text-lg">Send me an anonymous message!</p>

        <form onSubmit={handleSend} className="space-y-4 relative z-10">
          <Textarea
            placeholder="Type your secret message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-black/40 border-white/10 rounded-2xl resize-none min-h-[120px] text-lg p-5 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50 text-center"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1">
            <LockIcon className="w-3 h-3" /> 100% anonymous & encrypted
          </p>
          <Button 
            type="submit" 
            size="lg"
            disabled={!message.trim() || sendMutation.isPending}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-lg h-14 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-[1.02]"
          >
            {sendMutation.isPending ? "Encrypting & Sending..." : "Send Anonymously"}
            <Send className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function LockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

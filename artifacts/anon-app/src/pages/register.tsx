import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Ghost } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.clear(); // Clear cache to reset auth state
        toast({ title: "Identity Created.", description: "Welcome to the shadows." });
        setLocation("/feed");
      },
      onError: (err: any) => {
        toast({ 
          title: "Registration Failed", 
          description: err.error || "An error occurred", 
          variant: "destructive" 
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { username, email, password } });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-10 rounded-[2rem] border border-white/10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)]">
            <Ghost className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-display font-bold text-center text-white mb-2">Join Phantom</h1>
        <p className="text-center text-muted-foreground mb-8">Create your anonymous link.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/30 border-white/10 h-12 rounded-xl focus-visible:ring-primary"
              minLength={3}
              maxLength={30}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/30 border-white/10 h-12 rounded-xl focus-visible:ring-primary"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/30 border-white/10 h-12 rounded-xl focus-visible:ring-primary"
              minLength={6}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-lg mt-4 border-0 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Creating..." : "Sign Up"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-foreground transition-colors font-medium">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

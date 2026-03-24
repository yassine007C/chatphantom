import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Ghost } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        queryClient.clear(); // Clear cache to reset auth state
        toast({ title: "Welcome back, phantom.", description: "Successfully logged in." });
        setLocation("/feed");
      },
      onError: (err: any) => {
        toast({ 
          title: "Access Denied", 
          description: err.error || "Invalid credentials", 
          variant: "destructive" 
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { usernameOrEmail, password } });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-10 rounded-[2rem] border border-white/10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <Ghost className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h1 className="text-3xl font-display font-bold text-center text-white mb-2">Log In</h1>
        <p className="text-center text-muted-foreground mb-8">Re-enter the shadows.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="usernameOrEmail">Username or Email</Label>
            <Input 
              id="usernameOrEmail"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
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
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-white text-black font-bold hover:bg-white/90 text-lg mt-4"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Authenticating..." : "Log In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:text-primary-foreground transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Lock, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-24 text-center">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary-foreground/80 text-sm font-medium mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          The new way to communicate anonymously
        </div>
        
        <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6">
          Speak Freely.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-fuchsia-500 to-accent text-glow">
            Stay Hidden.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Receive anonymous messages, share unfiltered thoughts on the public feed, and discover what people really think. Zero tracking, complete freedom.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-semibold bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-1">
              Get Your Link <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/feed">
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-semibold border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-300 hover:-translate-y-1">
              Explore Public Feed
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Decorative Image */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-4xl mt-24 relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 animate-float"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Abstract deep space aesthetic"
          className="w-full h-[400px] object-cover opacity-80"
        />
      </motion.div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full text-left">
        {[
          {
            title: "Absolute Privacy",
            desc: "Senders are completely untraceable. We use client-side unique sessions to protect identities.",
            icon: Lock,
            color: "text-blue-400"
          },
          {
            title: "Public Confessions",
            desc: "Drop your thoughts into the global feed anonymously, or claim them with your username.",
            icon: MessageSquare,
            color: "text-purple-400"
          },
          {
            title: "Instant Setup",
            desc: "Create an account in 10 seconds. Get your unique link and start receiving messages instantly.",
            icon: Zap,
            color: "text-pink-400"
          }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-3xl"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 ${feat.color}`}>
              <feat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-3">{feat.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

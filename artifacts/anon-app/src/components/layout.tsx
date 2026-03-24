import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useCurrentUser, clearToken, getAuthReq } from "@/lib/auth";
import { useGetUnreadCount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ghost, Home, Users, Inbox, User as UserIcon, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useCurrentUser();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: unreadData } = useGetUnreadCount({
    query: {
      enabled: isAuthenticated,
      refetchInterval: 15000,
    },
    request: getAuthReq(),
  });

  const handleLogout = () => {
    clearToken();
    queryClient.clear();
    setLocation("/");
  };

  const navLinks = [
    { href: "/feed", label: "Feed", icon: Home, show: true },
    { href: "/directory", label: "Directory", icon: Users, show: true },
    { 
      href: "/inbox", 
      label: "Inbox", 
      icon: Inbox, 
      show: isAuthenticated,
      badge: unreadData?.count ? unreadData.count : 0
    },
    { href: user ? `/u/${user.username}` : "#", label: "My Profile", icon: UserIcon, show: isAuthenticated },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 glass border-b-0 border-white/5 h-16 flex items-center px-4 md:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
              <Ghost className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              Phantom
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.filter(l => l.show).map((link) => {
              const isActive = location === link.href;
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive ? "text-white bg-white/10" : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {!!link.badge && link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-lg shadow-accent/50 animate-in zoom-in">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth Actions Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setLocation("/login")}>
                  Log in
                </Button>
                <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10" onClick={() => setLocation("/register")}>
                  Sign up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-white/70 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 top-16 z-40 glass border-b border-white/10 md:hidden flex flex-col p-4 gap-2"
        >
          {navLinks.filter(l => l.show).map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/80 hover:text-white font-medium"
              >
                <Icon className="w-5 h-5" />
                {link.label}
                {!!link.badge && link.badge > 0 && (
                  <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="h-px bg-white/10 my-2" />
          {isAuthenticated ? (
            <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 text-destructive font-medium">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-center" onClick={() => { setLocation("/login"); setIsMobileMenuOpen(false); }}>Log in</Button>
              <Button className="w-full justify-center bg-white text-black hover:bg-white/90" onClick={() => { setLocation("/register"); setIsMobileMenuOpen(false); }}>Sign up</Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

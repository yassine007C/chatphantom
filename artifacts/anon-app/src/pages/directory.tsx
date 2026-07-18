import { useGetUsers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";

export default function Directory() {
  const { data, isLoading } = useGetUsers();

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex flex-col items-center mb-12 text-center">
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">User Directory</h1>
        <p className="text-muted-foreground max-w-lg">
          Find people and send them untraceable anonymous messages. They won't know it was you.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 glass-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data?.users.map((user, i) => (
            <Link key={user.id} href={`/u/${user.username}`}>
              <motion.a
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 rounded-2xl flex items-center justify-between group hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer block"
              >
                <div className="flex items-center gap-3">
                  {/* 🌟 الغلاف الدائري المحسن للصورة */}
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0">
                    <img 
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // إذا كانت الصورة الأساسية معطوبة، استبدلها بصورة الحرف الأول فوراً
                        if (!e.currentTarget.src.includes('ui-avatars')) {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.username}&background=random`;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-primary transition-colors">@{user.username}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors group-hover:translate-x-1" />
              </motion.a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

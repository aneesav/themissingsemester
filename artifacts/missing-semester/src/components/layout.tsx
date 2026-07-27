import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { BookOpen, Settings, ShieldAlert, LogOut } from "lucide-react";
import { useGetCurrentUser, useSyncUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";
import { useEffect, useState } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  
  // Sync user on mount if signed in
  const syncUserMutation = useSyncUser();
  const [hasSynced, setHasSynced] = useState(false);
  
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasSynced) {
      // Mark synced immediately so a failure can't re-trigger this effect
      // in a loop (the mutation object identity changes every render).
      setHasSynced(true);
      syncUserMutation.mutate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, hasSynced]);

  const { data: dbUser, isError: userError } = useGetCurrentUser({
    query: {
      enabled: isLoaded && isSignedIn,
      retry: false,
      queryKey: getGetCurrentUserQueryKey()
    }
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
    if (userError) {
      // 401 from API usually
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, userError, setLocation]);

  if (!isLoaded || (!isSignedIn && window.location.pathname !== "/")) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse">Loading environment...</div></div>;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/10 relative">
      <div className="noise-overlay" />
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card shrink-0 flex flex-col shadow-sm z-10 relative">
        <div className="p-6 pb-2">
          <Link href="/dashboard" className="flex items-center gap-3 mb-6 transition-opacity hover:opacity-80 text-foreground">
            <BrandMark className="w-7 h-7" />
            <BrandWordmark className="text-lg" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem href="/dashboard" icon={<BookOpen size={18} />} label="Curriculum" />
          <NavItem href="/settings" icon={<Settings size={18} />} label="Settings & Keys" />
          
          {dbUser?.role === "admin" && (
            <div className="pt-6 pb-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Admin</p>
              <NavItem href="/admin" icon={<ShieldAlert size={18} />} label="Platform Dashboard" />
            </div>
          )}
        </nav>

        <div className="p-4 border-t mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {dbUser?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{dbUser?.name || "Loading..."}</span>
              <span className="text-xs text-muted-foreground truncate">{dbUser?.email}</span>
            </div>
          </div>
          <button 
            onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-0 flex flex-col min-w-0 h-[100dvh] overflow-y-auto">
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(`${href}/`);
  
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? "bg-primary/5 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

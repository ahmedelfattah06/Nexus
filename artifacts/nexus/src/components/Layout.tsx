import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderOpen, Code2, Timer, Sparkles, Moon, Sun,
  Menu, Zap, Repeat2, Bookmark, BookOpen, Brain, Target, Smile,
  BarChart3, Globe, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, lang, setLang, isRTL } = useLanguage();

  const navItems = [
    { href: "/dashboard", label: t.nav.cockpit, icon: LayoutDashboard },
    { href: "/workspaces", label: t.nav.workspaces, icon: FolderOpen },
    { href: "/snippets", label: t.nav.snippets, icon: Code2 },
    { href: "/focus", label: t.nav.focus, icon: Timer },
    { href: "/nex", label: t.nav.nex, icon: Sparkles },
    null,
    { href: "/habits", label: t.nav.habits, icon: Repeat2 },
    { href: "/goals", label: t.nav.goals, icon: Target },
    { href: "/mood", label: t.nav.mood, icon: Smile },
    { href: "/analytics", label: t.nav.analytics, icon: BarChart3 },
    null,
    { href: "/bookmarks", label: t.nav.bookmarks, icon: Bookmark },
    { href: "/reading", label: t.nav.reading, icon: BookOpen },
    { href: "/flashcards", label: t.nav.flashcards, icon: Brain },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="font-serif text-xl text-sidebar-foreground tracking-tight flex-1">{t.appName}</span>
        {/* Close button for mobile */}
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto" data-testid="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item === null) {
            return <div key={idx} className="mx-2 my-1.5 h-px bg-sidebar-border" />;
          }
          const { href, label, icon: Icon } = item;
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}>
              <div
                data-testid={`nav-${label}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors mb-0.5",
                  isRTL ? "flex-row-reverse text-right" : "flex-row text-left",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            isRTL ? "flex-row-reverse" : ""
          )}
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">{t.common.language}</span>
        </button>
        <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
          <UserButton />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className={cn("h-8 w-8", isRTL ? "mr-auto" : "ml-auto")}
            data-testid="theme-toggle"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-sidebar-border flex-shrink-0 border-e">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — slides in from the inline-start side */}
      <aside
        className={cn(
          "fixed inset-y-0 z-30 flex flex-col w-56 bg-sidebar border-sidebar-border md:hidden transition-transform duration-200",
          isRTL ? "right-0 border-s" : "left-0 border-e",
          sidebarOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-border md:hidden",
          isRTL ? "flex-row-reverse" : ""
        )}>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-serif text-lg">{t.appName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

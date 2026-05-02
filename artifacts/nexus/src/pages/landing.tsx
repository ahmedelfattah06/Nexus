import { Link } from "wouter";
import { Zap, FileText, CheckSquare, Code2, Timer, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Sparkles,
    title: "AI Assistant — Nex",
    description: "Ask anything. Get help organizing notes, planning projects, and writing code.",
  },
  {
    icon: FileText,
    title: "Smart Pages",
    description: "Write notes and documentation in rich markdown, organized by workspace.",
  },
  {
    icon: CheckSquare,
    title: "Kanban Tasks",
    description: "Visual task boards that help you ship, not just plan.",
  },
  {
    icon: Code2,
    title: "Code Snippets",
    description: "Your personal snippet library, always at hand when you need it.",
  },
  {
    icon: Timer,
    title: "Focus Mode",
    description: "Pomodoro timer with session tracking to keep your streak alive.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl tracking-tight">Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" data-testid="nav-sign-in">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" data-testid="nav-get-started">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Claude AI
        </div>
        <h1 className="text-6xl md:text-7xl font-serif leading-tight mb-6">
          Your second brain,{" "}
          <span className="text-primary">supercharged</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          A productivity workspace built for developers and students. Notes, tasks, code snippets, focus mode, and an AI assistant that actually helps.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 px-6" data-testid="hero-get-started">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="px-6" data-testid="hero-sign-in">
              Sign in
            </Button>
          </Link>
        </div>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-serif text-lg mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2025 Nexus — Built with ⚡
      </footer>
    </div>
  );
}

import { Link } from "wouter";
import { Zap, FileText, CheckSquare, Code2, Timer, Sparkles, ArrowRight, Globe, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LandingPage() {
  const { t, lang, setLang, isRTL } = useLanguage();

  const features = [
    { icon: Sparkles, title: t.landing.features.ai.title, description: t.landing.features.ai.desc },
    { icon: FileText, title: t.landing.features.pages.title, description: t.landing.features.pages.desc },
    { icon: CheckSquare, title: t.landing.features.tasks.title, description: t.landing.features.tasks.desc },
    { icon: Code2, title: t.landing.features.snippets.title, description: t.landing.features.snippets.desc },
    { icon: Timer, title: t.landing.features.focus.title, description: t.landing.features.focus.desc },
    { icon: Repeat2, title: t.landing.features.habits.title, description: t.landing.features.habits.desc },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl tracking-tight">{t.appName}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <Globe className="w-3.5 h-3.5" />
            {t.common.language}
          </button>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" data-testid="nav-sign-in">{t.landing.signIn}</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" data-testid="nav-get-started">{t.landing.cta}</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          {t.landing.poweredBy}
        </div>
        <h1 className="text-6xl md:text-7xl font-serif leading-tight mb-6">
          {t.landing.hero}{" "}
          <span className="text-primary">{t.landing.heroHighlight}</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          {t.landing.heroSub}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 px-6" data-testid="hero-get-started">
              {t.landing.cta} <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="px-6" data-testid="hero-sign-in">
              {t.landing.signIn}
            </Button>
          </Link>
        </div>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow text-start"
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
        © 2025 {t.appName} — Built with ⚡
      </footer>
    </div>
  );
}

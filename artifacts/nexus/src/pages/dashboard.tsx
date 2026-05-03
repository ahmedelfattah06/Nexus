import { useGetDashboardStats, useGetRecentPages, useGetTodayTasks, useGetDailyQuote } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { Zap, FileText, CheckSquare, Flame, TrendingUp, ArrowRight, Clock, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-serif mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { t, lang } = useLanguage();
  const stats = useGetDashboardStats();
  const recentPages = useGetRecentPages();
  const todayTasks = useGetTodayTasks();
  const dailyQuote = useGetDailyQuote();
  const todayTaskList: any[] = Array.isArray(todayTasks.data) ? todayTasks.data : (todayTasks.data as any)?.data ?? [];
  const recentPageList: any[] = Array.isArray(recentPages.data) ? recentPages.data : (recentPages.data as any)?.data ?? [];

  const firstName = user?.firstName || user?.username || "";
  const hour = new Date().getHours();
  const greeting =
    lang === "ar"
      ? hour < 12 ? "صباح الخير" : hour < 17 ? "مساء الخير" : "مساء النور"
      : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateStr = new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif" data-testid="dashboard-greeting">
          {greeting}{firstName ? `, ${firstName}` : ""} ✦
        </h1>
        <p className="text-muted-foreground mt-1">{dateStr}</p>
      </div>

      {/* Daily Quote */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 items-start">
            <Quote className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{t.dashboard.dailyQuote}</p>
              {dailyQuote.isLoading ? (
                <Skeleton className="h-5 w-64" />
              ) : (
                <>
                  <p className="font-serif text-base italic">"{dailyQuote.data?.quote}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {dailyQuote.data?.author}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              label={t.dashboard.stats.tasksCompleted}
              value={stats.data?.tasksCompletedThisWeek ?? 0}
              icon={CheckSquare}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              label={t.dashboard.stats.notesWritten}
              value={stats.data?.notesWritten ?? 0}
              icon={FileText}
              color="bg-accent text-accent-foreground"
            />
            <StatCard
              label={t.dashboard.stats.streak}
              value={`${stats.data?.streakDays ?? 0}🔥`}
              icon={Flame}
              color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            />
            <StatCard
              label={t.dashboard.stats.focusSessions}
              value={stats.data?.flowScore ?? 0}
              icon={TrendingUp}
              color="bg-secondary text-secondary-foreground"
            />
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-serif font-normal">{t.dashboard.weeklyBriefing}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/habits">
                <div className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                  <p className="text-xs text-muted-foreground mb-1">{t.nav.habits}</p>
                  <p className="text-xl font-serif">🎯</p>
                  <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{t.habits.emptyHint}</p>
                </div>
              </Link>
              <Link href="/goals">
                <div className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                  <p className="text-xs text-muted-foreground mb-1">{t.nav.goals}</p>
                  <p className="text-xl font-serif">🏆</p>
                  <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{t.goals.emptyHint}</p>
                </div>
              </Link>
              <Link href="/reading">
                <div className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                  <p className="text-xs text-muted-foreground mb-1">{t.nav.reading}</p>
                  <p className="text-xl font-serif">📚</p>
                  <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{t.reading.emptyHint}</p>
                </div>
              </Link>
              <Link href="/mood">
                <div className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                  <p className="text-xs text-muted-foreground mb-1">{t.nav.mood}</p>
                  <p className="text-xl font-serif">😊</p>
                  <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{t.mood.emptyHint}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-serif font-normal">Today</CardTitle>
            <Link href="/workspaces">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="view-all-tasks">
                All <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : todayTaskList.length === 0 ? (
              <div className="text-center py-6">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.dashboard.noRecentPages}</p>
              </div>
            ) : (
              todayTaskList.map((task) => (
                <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50" data-testid={`today-task-${task.id}`}>
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p className="text-sm leading-snug">{task.title}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-serif font-normal flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {t.dashboard.recentPages}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPages.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : recentPageList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t.dashboard.noRecentPages}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentPageList.map((page) => (
                  <div key={page.id} className="flex items-center justify-between py-3" data-testid={`recent-page-${page.id}`}>
                    <div>
                      <p className="text-sm font-medium">{page.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {page.workspaceName && <span className="mr-2">{page.workspaceName}</span>}
                        {page.updatedAt && new Date(page.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/workspaces/${page.workspaceId}/pages`}>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                        {t.bookmarks.open}
                      </Badge>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

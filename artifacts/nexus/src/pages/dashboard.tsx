import { useGetDashboardStats, useGetRecentPages, useGetTodayTasks } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Zap, FileText, CheckSquare, Flame, TrendingUp, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

const mockWeekData = [
  { day: "Mon", tasks: 3 },
  { day: "Tue", tasks: 5 },
  { day: "Wed", tasks: 2 },
  { day: "Thu", tasks: 7 },
  { day: "Fri", tasks: 4 },
  { day: "Sat", tasks: 1 },
  { day: "Sun", tasks: 6 },
];

export default function DashboardPage() {
  const { user } = useUser();
  const stats = useGetDashboardStats();
  const recentPages = useGetRecentPages();
  const todayTasks = useGetTodayTasks();

  const firstName = user?.firstName || user?.username || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif" data-testid="dashboard-greeting">
          {greeting}, {firstName} ✦
        </h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              label="Tasks Done"
              value={stats.data?.tasksCompletedThisWeek ?? 0}
              icon={CheckSquare}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              label="Notes Written"
              value={stats.data?.notesWritten ?? 0}
              icon={FileText}
              color="bg-accent text-accent-foreground"
            />
            <StatCard
              label="Day Streak"
              value={`${stats.data?.streakDays ?? 0}🔥`}
              icon={Flame}
              color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
            />
            <StatCard
              label="Flow Score"
              value={stats.data?.flowScore ?? 0}
              icon={TrendingUp}
              color="bg-secondary text-secondary-foreground"
            />
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-serif font-normal">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={mockWeekData} barSize={22}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-serif font-normal">Today's Focus</CardTitle>
            <Link href="/workspaces">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="view-all-tasks">
                All <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : todayTasks.data?.length === 0 ? (
              <div className="text-center py-6">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All clear! Add tasks in your workspaces.</p>
              </div>
            ) : (
              todayTasks.data?.map((task) => (
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
              Recent Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPages.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : recentPages.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pages yet. Create your first page in a workspace.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentPages.data?.map((page) => (
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
                        Open
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
